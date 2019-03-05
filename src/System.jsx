import React, { Component } from 'react';
import PropTypes from 'prop-types';

import Diamond from './Diamond';

const serviceColor = {
	up: "green",
	down: "red",
}
/** Visualizes a service (site) which is kept live by one or more servers. Member of a Group. */
export default class System extends Component {
	static propTypes = {
		system: PropTypes.shape({
			servers: PropTypes.arrayOf(PropTypes.shape({
				id: PropTypes.string.isRequired,
				operational_status: PropTypes.string.isRequired,
			})).isRequired,
			id: PropTypes.string.isRequired,
			status: PropTypes.string, // should be present, but not on first render
			jenkinsJobs: PropTypes.arrayOf(PropTypes.shape({
				builds: PropTypes.arrayOf(PropTypes.shape({
					result: PropTypes.string.isRequired,
					timestamp: PropTypes.number.isRequired
				})).isRequired,
			})), // jenkinsJobs are not required
		}).isRequired,
		debugJenkins: PropTypes.bool, // not required
		serverColors: PropTypes.shape({
			enable: PropTypes.string.isRequired,
			disable: PropTypes.string.isRequired,
		}).isRequired,
	}
	constructor(props) {
		super(props);
		this.state = {
			servers: this.props.system.servers,
		}
		this.formatTimeAgo = this.formatTimeAgo.bind(this);
		this.notTooLongAgo = this.notTooLongAgo.bind(this);
		this.tierAbbreviation = this.tierAbbreviation.bind(this);
	}
	formatTimeAgo(timestamp) {
		if (isNaN(timestamp)) return '';
		
		var seconds = Math.floor((new Date() - timestamp) / 1000);
		
		// hours
		var interval = Math.floor(seconds / 3600);
		if (interval > 0) return `${interval}h`;
		// minutes
		interval = Math.floor(seconds / 60);
		if (interval > 0) return `${interval}m`;
		// seconds
		return `${seconds}s`;
	}
	notTooLongAgo(timestamp) {
		var now = new Date();
		var currentTimestamp = now.valueOf();
		const eightHours = 1000 * 60 * 60 * 8;
		return (currentTimestamp - timestamp) < eightHours;
	}
	tierAbbreviation() { // development, production, QA, staging
		var name = this.props.system.id.toLowerCase();
		if (name.includes('dev')) return 'D';
		if (name.includes(' prod')) return 'P';
		if (name.includes('qa')) return 'T';
		if (name.includes('staging') || name.includes('uat')) return 'S';
		return '';
	}
	render() {
		var servers = this.props.system.servers.map(server => (
			<div 
				className={ "rect " + this.props.serverColors[server.operational_status]}
				server={server}
				key={server.id}
				title={server.id}
			></div>
		));
		
		var jenkinsBuilds = [];
		var diamond = null;
		if (this.props.system.jenkinsJobs && this.props.system.jenkinsJobs.length) {
			diamond = <Diamond buildResult={this.props.system.jenkinsJobs[0].builds[0].result} />
			
			jenkinsBuilds = this.props.system.jenkinsJobs.map(job => {
				var buildVizClasses = "build-viz";
				if (job.builds[0].result === "SUCCESS") buildVizClasses += " green-text";
				if (job.builds[0].result === "FAILURE") buildVizClasses += " red-text";
				if (this.notTooLongAgo(job.builds[0].timestamp) || this.props.debugJenkins) {
					return (<div className={buildVizClasses} key={job.name} title={"Jenkins job: " + job.name}>
						{this.formatTimeAgo(job.builds[0].timestamp)}
					</div>);
				} else {
					return null;
				}
			});
		}
		return (
			<div className="system">
				<div className="tier">{this.tierAbbreviation()}</div>
				<div title={this.props.system.id} className={"circle " + serviceColor[this.props.system.status]}></div>
				<div className="rects">
					{servers}
				</div>
				{diamond}
				<div className="builds">
					{jenkinsBuilds}
				</div>
			</div>
		)
	}
}
