import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.scss';
import System from './System';
import JenkinsLog from './JenkinsLog';
import dumpLoadBalancer from './export';

const loadBalancerUrl = "/sites-monitor/load-balancer.json";
const jenkinsUrl = "/sites-monitor/jenkins.json";

const simulateDownedService = true;
const updateFrequency = 15; // seconds to wait between data refreshes
const updateFrequencyWhenDown = 5; // seconds to wait between data refreshes
const numJenkinsBuildsToShow = 15;
const debugJenkins = false;
const exportData = false;
const serverColors = {
	"enable": "green",
	"disable": "grey",
	"out-of-service-health": "red"
}

class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { 
			hasError: false,
		};
	}
	
	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { 
			hasError: true,
		};
	}
	
	componentDidCatch(error, info) {
		console.warn(error);
	}
	
	render() {
		if (this.state.hasError) {
			return <div className="error">
				<h1>Error</h1>
			</div>
		}
		
		return this.props.children;
	}
}

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
			jobsByTimestamp: {},
			timestamps: [],
			showLegend: true,
		};
		this.fetchLoopController = this.fetchLoopController.bind(this);
		this.checkIfServiceIsDown = this.checkIfServiceIsDown.bind(this);
		this.getLoadBalancerStatus = this.getLoadBalancerStatus.bind(this);
		this.getJenkinsStatus = this.getJenkinsStatus.bind(this);
		this.processLoadBalancerData = this.processLoadBalancerData.bind(this);
		this.processJenkinsData = this.processJenkinsData.bind(this);
		this.handleNetworkErr = this.handleNetworkErr.bind(this);
	}
	componentDidMount() {
		this.fetchLoopController().start();
	}
	fetchLoopController() {
		const start = () => {
			this.setState({ networkStatus: "loading" });
			Promise.all([ this.getLoadBalancerStatus(), this.getJenkinsStatus() ]).then((response) => {
				const [ loadBalancerData, jenkinsData ] = response;
				if (exportData) console.log(dumpLoadBalancer(loadBalancerData));
				if (loadBalancerData.error === 'error') {
					window.location = loadBalancerData.redirect;
				} else if (jenkinsData.error === 'error') {
					window.location = jenkinsData.redirect;
				}
				this.processLoadBalancerData(loadBalancerData, () => {
					this.processJenkinsData(jenkinsData);
				});
			}, (error) => { 
				this.handleNetworkErr(error);
			}).then(() => {
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
			var frequencyToCheck = updateFrequency;
			if((this.state.serverStats != null && this.state.serviceStats != null )
				&& (this.state.serverStats.down > 0 || this.state.serviceStats.down > 0))
			{
				frequencyToCheck = updateFrequencyWhenDown;
			}
			if (this.state.timeSinceLastUpdate > frequencyToCheck - 1) {
				stop();
				start();
				this.setState({ showLegend: false });
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
		return serversDown > 0 && serversDown >= threshold;
	}
	getLoadBalancerStatus() {
		return fetch(loadBalancerUrl)
			.then(response => {
				if (response.ok) {
					return response.json();
				} else {
					this.handleNetworkErr(response);
				}
			})
		;
	}
	processLoadBalancerData(json, callback) {
		const replaceUnderscores = string => string.replace(/_/g, ' ');
		this.setState({ loading: true });

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
			group.virtual_services.forEach(service => {
				service.id = replaceUnderscores(service.id);
			});
		});
		if (debugJenkins) console.log(groups);
		this.setState({groups: groups});

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
		if (simulateDownedService) groups[8].virtual_services[3].servers[1].operational_status = "out-of-service-health";
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
				service.jenkinsJobs = [];
				service.servers.forEach(server => {
					if (server.operational_status === "enable") { serverStats.up += 1; } 
					else if (server.operational_status === "disable") { serverStats.disabled += 1; }
					else if (server.operational_status === "out-of-service-health") { serverStats.down += 1; }
					else { console.warn("Unexpected server status", server.operational_status); }
				});
			});
		});
			
		this.setState({ serviceStats: serviceStats, serverStats: serverStats }, callback);
	}
	getJenkinsStatus() {
		return fetch(jenkinsUrl)
		.then(response => {
			if (response.ok) {
				return response.json();
			} else {
				this.handleNetworkErr(response);
			}
		});
	}
	processJenkinsData(jobs) {
		const parenthesizeLastWord = phrase => { // put parens around the last word in a phrase
			let arr = phrase.split(' ');
			let lastWord = arr.pop();
			arr.push(`(${lastWord})`);
			return arr.join(' ');
		}
		// match jobs from Jenkins with services from Load Balancer
		this.setState(function(state) {
			const groups = state.groups;
			const unmatchedJobs = [];
			const textInBrackets = /\[(.+?)\]/g;
			let jobsMatched = 0;
			state.timestamps = [];
			while (jobs.length > 0) {
				const job = jobs.pop();
				let jobMatched = false;
				if (job.color === "disabled") continue;
				groups.forEach(group => { // eslint-disable-line
					group.virtual_services.forEach(service => {
						let matches;
						const regexResults = [];
						while (matches = textInBrackets.exec(job.description)) { // eslint-disable-line
							regexResults.push(matches[1]);
						}
						const serviceIdInJobDescription = regexResults && regexResults.some(result => result === service.id);
						if (
							job.name === service.id || 
							job.name === parenthesizeLastWord(service.id) || 
							job.name === service.id.replace('UAT', 'Staging') ||
							job.name === service.id.replace('UAT', '(Staging)') || 
							serviceIdInJobDescription 
						) {
							// console.log("Matched service", service.id, "with job", job.name);
							service.jenkinsJobs.push(job);
							jobMatched = true;
							if (debugJenkins) { jobsMatched += 1; }
						}
					});
				});
				if (!jobMatched) {
					unmatchedJobs.push(job);
				}
				if (job.builds.length) {
					let timestamp = job.builds[0].timestamp;
					state.timestamps.push(timestamp);
					state.jobsByTimestamp[timestamp] = job;
				}
			}
			if (debugJenkins) {
				console.log("Matched", jobsMatched, "Jenkins jobs with Load Balancer services");
				console.log("Unmatched jobs:", unmatchedJobs.map(job => job.name));
			}
			state.timestamps.sort();
			state.timestamps.reverse();
			state.timestamps = state.timestamps.slice(0, numJenkinsBuildsToShow);
			
		});		
	}
	handleNetworkErr(err) {
		this.setState({
			networkText: err.message,
			groups: [],
		});
		return err;
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
					<ErrorBoundary>
						<ul className="groups">
							{groups}
						</ul>
					</ErrorBoundary>
					<ErrorBoundary>
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
					</ErrorBoundary>
				</div>
				<div className="stats">
					<ErrorBoundary>
						<div className="stat-line stat-line-green">
							<strong>UP: </strong>
							<span className="half-circle green"></span>
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
								<span className="half-circle red"></span>
								<span>{this.state.serviceStats.down} services,</span>
								<span className="square red"></span>
								<span>{this.state.serverStats.down} servers</span>
								
							</div>
							<div className="downed-services">
								{downedServices}
							</div>
						</div>
					</ErrorBoundary>
					{ this.state.showLegend && 
						<div className="legend">
							<h2>Legend</h2>
							<img src="/sites-monitor/legend.svg" alt="legend" />
						</div>
					}
					<ErrorBoundary>
						<JenkinsLog timestamps={this.state.timestamps} jobsByTimestamp={this.state.jobsByTimestamp} />
					</ErrorBoundary>
				</div>
			</div>
		);
	}
}

const Group = props => {
	var systems = props.group.virtual_services.map(system => <System key={system.name} system={system} debugJenkins={debugJenkins} serverColors={serverColors} />);
	return systems.length > 0 ?
		(
			<li className="group">
				{props.group.id}
				{systems}
			</li>
		) :
		( <div/> )
};

class DownedService extends Component {
	render() {
		var servers = this.props.service.servers.map(server => <div className="server indent" key={server.id}>
				<div className={"square " + serverColors[server.operational_status]}></div>
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
