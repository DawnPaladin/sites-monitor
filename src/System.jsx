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
				id: PropTypes.any.isRequired,
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
		this.tierIndicator = this.tierIndicator.bind(this);
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
	tierIndicator() {
		var tier = this.props.system.tier;
		var cssClass = "tier-"+tier.toLowerCase() + ' ' + serviceColor[this.props.system.status];
		return tier ? <div className={cssClass} title={this.props.system.id}></div> : <div></div>;
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
			<div className={this.props.system.status === "down" ? "downed system" : "system"}>
				<div className={"circle-outline-" + serviceColor[this.props.system.status]}>
					{this.tierIndicator()}
				</div>
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
