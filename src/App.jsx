import React, { Component } from 'react';
// import PropTypes from 'prop-types';
import CircularProgressbar from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './App.scss';
import RightPanel from './RightPanel';
import ErrorBoundary from './ErrorBoundary';
import System from './System';
import dumpLoadBalancer from './export';
import fetchWithTimeout from './fetchWithTimeout';

const loadBalancerUrl = "/sites-monitor/load-balancer.json";
const jenkinsUrl = "/sites-monitor/jenkins.json";

const simulateDownedService = true;
export const resultText = {
	"SUCCESS": "succeeded",
	"FAILURE": "failed",
	"ABORTED": "aborted",
}
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
			}).finally(() => {
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
			this.frequencyToCheck = updateFrequency;
			if((this.state.serverStats != null && this.state.serviceStats != null && this.state.jenkinsStats != null)
				&& (this.state.serverStats.down > 0 || this.state.serviceStats.down > 0 || this.state.jenkinsStats.building >0 ))
			{
				this.frequencyToCheck = updateFrequencyWhenDown;
			}
			if (this.state.timeSinceLastUpdate > this.frequencyToCheck - 1) {
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
		return fetchWithTimeout(loadBalancerUrl, 15000)
			.then(response => {
				if (response === undefined) {
					this.handleNetworkErr({ message: "Load Balancer is not responding"});
					return false;
				} else if (response.ok) {
					return response.json();
				} else {
					this.handleNetworkErr(response);
				}
			})
			.catch(err => {
				this.handleNetworkErr(err);
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
		return fetchWithTimeout(jenkinsUrl, 10000)
		.then(response => {
			if (response === undefined) {
				this.handleNetworkErr({ message: "Jenkins server is not responding"});
				return false;
			} else if (response.ok) {
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

		var jenkinsStats = {
			up: 0,
			down: 0,
			building: 0
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
							if(job.builds.length >0)
							{
								switch(resultText[job.builds[0].result])
								{
									case 'succeeded':  jenkinsStats.up += 1; break;
									case 'failed':  jenkinsStats.down += 1; break;
									case 'aborted':   break;
									default: jenkinsStats.building += 1; break; /*null is building*/
								}
							}
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

			this.setState({ jenkinsStats: jenkinsStats});
			
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
		var progressbarPercentage = this.state.timeSinceLastUpdate * 100/this.frequencyToCheck;
		
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
				<RightPanel
					serverColors={serverColors}
					serviceStats={this.state.serviceStats}
					serverStats={this.state.serverStats}
					downedServices={this.state.downedServices}
					simulateDownedService={simulateDownedService}
					showLegend={this.state.showLegend}
					jenkinsTimestamps={this.state.timestamps}
					jenkinsJobsByTimestamp={this.state.jobsByTimestamp}
				/>
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

var j;
var justHidden = false;
document.onmousemove = function () {
	if (!justHidden) {
		justHidden = false;
		clearTimeout(j);
		document.getElementById('root').style.cursor = 'default';
		j = setTimeout(hide, 1000);
	}
};

function hide() {
	document.getElementById('root').style.cursor = 'none';
	justHidden = true;
	setTimeout(function () {
		justHidden = false;
	}, 500);
}

export default App;
