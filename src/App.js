import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.scss';

const simulateDownedService = true;
const updateFrequency = 30; // seconds to wait between data refreshes

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			groups: [],
			serviceStats: {
				up: 0,
				down: 0,
			},
			serverStats: {
				up: 0,
				disabled: 0,
				down: 0,
			},
			downedServices: [],
			timeSinceLastUpdate: 0,
			networkText: "Loading...",
		};
		this.fetchLoopController = this.fetchLoopController.bind(this);
		this.checkIfServiceIsDown = this.checkIfServiceIsDown.bind(this);
		this.getStatus = this.getStatus.bind(this);
		this.handleNetworkErr = this.handleNetworkErr.bind(this);
	}
	componentDidMount() {
		this.fetchLoopController().start();
	}
	fetchLoopController() {
		const start = () => {
			this.setState({ networkStatus: "loading" });
			this.getStatus().then(() => {
				this.setState({
					fetchLoop: setInterval(tick, 1000),
					timeSinceLastUpdate: 0,
					networkStatus: "waiting",
				});
			});
		}
		const stop = () => {
			clearInterval(this.state.fetchLoop);
			this.setState({
				timeSinceLastUpdate: 0,
				networkStatus: "stopped"
			});
		}
		const tick = () => {
			if (this.state.timeSinceLastUpdate > updateFrequency - 1) {
				stop();
				start();
			} else {
				this.setState({ timeSinceLastUpdate: this.state.timeSinceLastUpdate + 1 });
			}
		}
		return { start, stop }
	}
	checkIfServiceIsDown(service) {
		let serversDown = 0;
		let threshold = parseInt(service.minimum_notificate_real_server);
		service.servers.forEach(server => {
			if (server.operational_status === 'out-of-service-health') serversDown += 1;
		});
		return (serversDown > 0 || simulateDownedService) && serversDown >= threshold;
	}
	getStatus() {
		const replaceUnderscores = string => string.replace(/_/g, ' ');
		this.setState({ loading: true });
		return fetch("http://proxy.hkijharris.test/getStatus.php")
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					this.handleNetworkErr(response);
				}
			}).then(json => {
				var groups = json.data;
				groups.sort((groupA, groupB) => {
					var nameA = groupA.id.toUpperCase();
					var nameB = groupB.id.toUpperCase();
					if (nameA < nameB) return -1;
					if (nameA > nameB) return 1;
					return 0;
				});
				groups.forEach(group => {
					group.id = replaceUnderscores(group.id);
					group.virtual_services.forEach(service => service.id = replaceUnderscores(service.id));
				});
				console.log(groups);
				this.setState({groups: groups});
				return groups;
			}).then(groups => {
				var serviceStats = {
					up: 0,
					down: 0,
				}
				var serverStats = {
					up: 0,
					disabled: 0,
					down: 0,
				}
				this.setState({ downedServices: [] });
				groups.forEach(group => {
					group.virtual_services.forEach(service => {
						if (this.checkIfServiceIsDown(service)) {
							service.status = "down";
							serviceStats.down += 1;
							this.setState({ downedServices: [...this.state.downedServices, service] });
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
			}).catch(err => this.handleNetworkErr(err))
		;
	}
	handleNetworkErr(err) {
		console.error(err);
		this.setState({
			networkText: err.message,
			groups: [],
		});
		this.fetchLoopController().stop(); // FIXME:
	}
	render() {
		var groups = this.state.groups.map((group, index) => { return <Group key={index} group={group} /> });
		if (groups.length === 0) {
			groups = <div className="network-text">{this.state.networkText}</div>
		}
		var downedServices = this.state.downedServices.map(service => <DownedService service={service} key={service.id} />);
		var progressbarPercentage = this.state.timeSinceLastUpdate * 100/updateFrequency;
		return (
			<div id="App">
				<div className="monitor">
					<ul className="groups">
						{groups}
					</ul>
					<div id="network-status" className={this.state.networkStatus} onClick={this.fetchLoopController().stop}>
						<CircularProgressbar percentage={progressbarPercentage} styles={{
							path: { 
								stroke: 'lime',
								strokeWidth: '.05em',
								strokeLinecap: 'butt',
								strokeDasharray: '4'
							},
							trail: {
								stroke: 'hsl(0, 0%, 10%)',
								strokeWidth: '0.05em',
							},
						}}/>
					</div>
				</div>
				<div className="stats">
					<div className="stat-line stat-line-green">
						<strong>UP: </strong>
						<span className="circle green"></span>
						<span>{this.state.serviceStats.up} services,</span>
						<span className="square green"></span>
						<span>{this.state.serverStats.up} servers</span>
					</div>
					<div className="stat-line stat-line-grey">
						<strong>DISABLED: </strong>
						<span className="square grey"></span>
						<span>{this.state.serverStats.disabled} servers</span>
					</div>
					<div className="downed">
						<div className="stat-line stat-line-red">
							{simulateDownedService && <strong>**SIMULATED**<br/></strong>}
							<strong>DOWN: </strong>
							<span className="circle red"></span>
							<span>{this.state.serviceStats.down} services,</span>
							<span className="square red"></span>
							<span>{this.state.serverStats.down} servers</span>
							
						</div>
						<div className="downed-services">
							{downedServices}
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const Group = props => {
	var systems = props.group.virtual_services.map(system => <System key={system.name} system={system} />);
	return (
		<li className="group">
			{props.group.id}
			{systems}
		</li>
	)
};

const serviceColor = {
	up: "green",
	down: "red",
}
const serverColor = {
	enable: "green",
	disable: "grey",
	"out-of-service-health": "red"
}

class System extends Component {
	constructor(props) {
		super(props);
		this.state = {
			servers: this.props.system.servers
		}
	}
	render() {
		var servers = this.state.servers.map(server => (
			<div 
				className={ "rect " + serverColor[server.operational_status]}
				server={server}
				key={server.id} 
			></div>
		));
		return (
			<div className="system">
				<div className={"circle " + serviceColor[this.props.system.status]}></div>
				<div className="rects">
					{servers}
				</div>
			</div>
		)
	}
}

class DownedService extends Component {
	render() {
		var servers = this.props.service.servers.map(server => <div className="server indent" key={server.id}>
				<div className={"square " + serverColor[server.operational_status]}></div>
				<div className="server-name">{server.id}</div>
		</div>)
		return <div className="downed-service">
			<div className="red circle"></div>
			<div className="downed-service-name">{this.props.service.id}</div>
			<div>
				{servers}
			</div>
		</div>
	}
}

export default App;
