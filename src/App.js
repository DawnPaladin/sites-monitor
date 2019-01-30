import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './App.scss';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			groups: [],
			serviceStats: {
				up: 0,
				disabled: 0,
				down: 0,
			},
			serverStats: {
				up: 0,
				disabled: 0,
				down: 0,
			},
		};
		this.getStatus = this.getStatus.bind(this);
		this.checkIfServiceIsDown = this.checkIfServiceIsDown.bind(this);
		this.getStatus();
	}
	checkIfServiceIsDown(service) {
		let serversDown = 0;
		let threshold = parseInt(service.minimum_notificate_real_server);
		service.servers.forEach(server => {
			if (server.operational_status === 'out-of-service-health') serversDown += 1;
		});
		return serversDown > 0 && serversDown >= threshold;
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
				return groups;
			})
			.then(groups => {
				var serviceStats = {
					up: 0,
					disabled: 0,
					down: 0,
				}
				var serverStats = {
					up: 0,
					disabled: 0,
					down: 0,
				}
				groups.forEach(group => {
					group.virtual_services.forEach(service => {
						if (this.checkIfServiceIsDown(service)) {
							service.status = "down";
							serviceStats.down += 1;
						} else {
							service.status = "up";
							serviceStats.up += 1;
						}
						service.servers.forEach(server => {
							if (server.operational_status === "enable") { serverStats.up += 1; } 
							else if (server.operational_status === "disable") { serverStats.disabled += 1; }
							else if (server.operational_status === "out-of-service-health") { serverStats.down += 1; }
							else { console.warn("Unexpected server status", server.operational_status); }
						});
					});
				});
				this.setState({ serviceStats: serviceStats, serverStats: serverStats });
			});
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
					<StatLine name="Up" services={this.state.serviceStats.up} servers={this.state.serverStats.up} colorName="green" />
					<StatLine name="Disabled" services={this.state.serviceStats.disabled} servers={this.state.serverStats.disabled} colorName="grey" />
					<StatLine name="Down" services={this.state.serviceStats.down} servers={this.state.serverStats.down} colorName="red" />
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
	}
	serviceColor = {
		up: "green",
		down: "red",
	}
	serverColor = {
		enable: "green",
		disable: "grey",
		"out-of-service-health": "red"
	}
	render() {
		var servers = this.state.servers.map(server => (
			<div 
				className={ "rect " + this.serverColor[server.operational_status]}
				server={server}
				key={server.id} 
			></div>
		));
		return (
			<div className="system">
				<div className={"circle " + this.serviceColor[this.props.system.status]}></div>
				<div className="rects">
					{servers}
				</div>
			</div>
		)
	}
}

export default App;
