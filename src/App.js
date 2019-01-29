import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.scss';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			groups: []
		};
		this.getStatus = this.getStatus.bind(this);
		this.getStatus();
	}
	getStatus() {
		fetch("http://proxy.hkijharris.test/getStatus.php")
			.then(response => response.json())
			.then(json => {
				var groups = json.data;
				groups.sort((groupA, groupB) => {
					var nameA = groupA.id.toUpperCase();
					var nameB = groupB.id.toUpperCase();
					if (nameA < nameB) return -1;
					if (nameA > nameB) return 1;
					return 0; // names must be equal
				});
				console.log(groups);
				this.setState({groups: groups});
			})
		;
	}
	render() {
		var groups = this.state.groups.map((group, index) => { return <Group key={index} group={group} /> });
		return (
			<div id="App">
				<div className="monitor">
					<ul className="groups">
						{groups}
					</ul>
				</div>
				<div className="stats">
					<StatLine name="Up" services="X" servers="X" colorName="green" />
					<StatLine name="Disabled" services="X" servers="X" colorName="grey" />
					<StatLine name="Down" services="X" servers="X" colorName="red" />
				</div>
			</div>
		);
	}
}

class StatLine extends Component {
	static propTypes = {
		name: PropTypes.string.isRequired,
		services: PropTypes.number.isRequired,
		servers: PropTypes.number.isRequired,
		colorName: PropTypes.string,
		bgColor: PropTypes.string,
	}
	constructor(props) {
		super(props);
	}
	render() {
		return <div className="stat-line">
			<strong>{this.props.name.toUpperCase()}: </strong>
			<span className={"circle " + this.props.colorName}></span>
			<span>{this.props.services} services,</span>
			<span className={"square " + this.props.colorName}></span>
			<span>{this.props.servers} servers</span>
		</div>
	}
}

const Group = props => {
	var systems = props.group.virtual_services.map(system => <System key={system.name} system={system} />);
	const replaceUnderscores = string => string.replace(/_/g, ' ');
	return (
		<li className="group">
			{replaceUnderscores(props.group.id)}
			{systems}
		</li>
	)
};

class System extends Component {
	constructor(props) {
		super(props);
		this.state = {
			servers: this.props.system.servers
		}
		this.serverColor = this.serverColor.bind(this);
		this.isServiceDown = this.isServiceDown.bind(this);
		this.serviceColor = this.serviceColor.bind(this);
	}
	isServiceDown() {
		let serversDown = 0;
		let threshold = parseInt(this.props.system.minimum_notificate_real_server);
		this.state.servers.forEach(server => {
			if (server.operational_status === 'out-of-service-health') serversDown += 1;
		});
		return serversDown > 0 && serversDown >= threshold;
	}
	serviceColor() {
		return this.isServiceDown() ? "red" : "green";
	}
	serverColor(opStatus) {
		switch (opStatus) {
			case 'enable':
				return 'green';
			case 'disable':
				return 'grey';
			case 'out-of-service-health':
				return 'red';
			default:
				console.warn("Unexpected server status", opStatus);
		}
	}
	render() {
		var servers = this.state.servers.map(server => (
			<div 
				className={ "rect " + this.serverColor(server.operational_status)}
				server={server}
				key={server.id} 
			></div>
		));
		return (
			<div className="system">
				<div className={"circle " + this.serviceColor()}></div>
				<div className="rects">
					{servers}
				</div>
			</div>
		)
	}
}

export default App;
