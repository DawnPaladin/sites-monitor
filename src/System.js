import React, { Component } from 'react';

const serviceColor = {
	up: "green",
	down: "red",
}

export default class System extends Component {
	constructor(props) {
		super(props);
		this.state = {
			servers: this.props.system.servers,
			system: this.props.system,
		}
		this.formatTimeAgo = this.formatTimeAgo.bind(this);
		this.notTooLongAgo = this.notTooLongAgo.bind(this);
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
	render() {
		var servers = this.state.servers.map(server => (
			<div 
				className={ "rect " + this.props.serverColors[server.operational_status]}
				server={server}
				key={server.id}
				title={server.id}
			></div>
		));
		
		var jenkinsClassName = "";
		var jenkinsBuilds = [];
		// TODO: Refactor into component
		if (this.props.system.jenkinsJobs && this.props.system.jenkinsJobs.length) {
			
			jenkinsClassName += "diamond";
			if      (this.props.system.jenkinsJobs[0].builds[0].result === "SUCCESS") jenkinsClassName += " green";
			else if (this.props.system.jenkinsJobs[0].builds[0].result === "FAILURE") jenkinsClassName += " red";
			else jenkinsClassName += " grey";
			
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
				<div title={this.props.system.id} className={"circle " + serviceColor[this.props.system.status]}></div>
				<div className="rects">
					{servers}
				</div>
				<div className={jenkinsClassName}></div>
				<div className="builds">
					{jenkinsBuilds}
				</div>
			</div>
		)
	}
}
