import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.scss';
import System from './System';

const loadBalancerUrl = "http://proxy.hkijharris.test/getStatus.php";
const jenkinsUrl = "http://proxy.hkijharris.test/jenkins.php";
const updateFrequency = 30; // seconds to wait between data refreshes
const numJenkinsBuildsToShow = 15;
const simulateDownedService = false;
const debugJenkins = false;
const serverColors = {
	enable: "green",
	disable: "grey",
	"out-of-service-health": "red"
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
		if (simulateDownedService) groups[8].virtual_services[2].servers[1].operational_status = "out-of-service-health";
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
				let timestamp = job.builds[0].timestamp;
				state.timestamps.push(timestamp);
				state.jobsByTimestamp[timestamp] = job;
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
		
		const resultText = { 
			"SUCCESS": "succeeded",
			"FAILURE": "failed",
			"ABORTED": "aborted",
		}
		function formatTimeAgo(timestamp) {
			if (isNaN(timestamp)) return '';
			
			var seconds = Math.floor((new Date() - timestamp) / 1000);
			
			// days
			var interval = Math.floor(seconds / 86400 );
			if (interval === 1) return `1 day ago`
			if (interval > 1) return `${interval} days ago`
			// hours
			interval = Math.floor(seconds / 3600);
			if (interval === 1) return `1 hour ago`;
			if (interval > 1) return `${interval} hours ago`;
			// minutes
			interval = Math.floor(seconds / 60);
			if (interval === 1) return `1 minute ago`;
			if (interval > 1) return `${interval} minutes ago`;
			// seconds
			return `${seconds} seconds ago`;
		}
		var jenkinsLogEntries = this.state.timestamps.map(timestamp => {
			let job = this.state.jobsByTimestamp[timestamp];
			let build = job.builds[0];
			
			// TODO: Refactor into component to eliminate code duplication
			let jenkinsClassName = "diamond";
			if      (build.result === "SUCCESS") jenkinsClassName += " green";
			else if (build.result === "FAILURE") jenkinsClassName += " red";
			else jenkinsClassName += " grey";
			
			return (<div key={timestamp} className="log-line">
				<div className={jenkinsClassName}></div>
				{job.name} {resultText[build.result]} {formatTimeAgo(timestamp)}
			</div>);
		})
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
						<div className="jenkins-log">
							<h2>Jenkins build log</h2>
							{ jenkinsLogEntries }
						</div>
					</div>
				</div>
			</div>
		);
	}
}

const Group = props => {
	var systems = props.group.virtual_services.map(system => <System key={system.name} system={system} debugJenkins={debugJenkins} serverColors={serverColors} />);
	return (
		<li className="group">
			{props.group.id}
			{systems}
		</li>
	)
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
