import React from 'react';
import PropTypes from 'prop-types';

const resultText = { 
	"SUCCESS": "succeeded",
	"FAILURE": "failed",
	"ABORTED": "aborted",
}

export default class JenkinsLog extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.propTypes = {
			timestamps: PropTypes.array.isRequired,
			jobsByTimestamp: PropTypes.object.isRequired,
		}
		
		this.formatTimeAgo = this.formatTimeAgo.bind(this);
	}
	formatTimeAgo(timestamp) {
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
	render() {
		var jenkinsLogEntries = this.props.timestamps.map(timestamp => {
			let job = this.props.jobsByTimestamp[timestamp];
			let build = job.builds[0];
			
			// TODO: Refactor into component to eliminate code duplication
			let jenkinsClassName = "diamond";
			if      (build.result === "SUCCESS") jenkinsClassName += " green";
			else if (build.result === "FAILURE") jenkinsClassName += " red";
			else jenkinsClassName += " grey";
			
			return (<div key={timestamp} className="log-line">
				<div className={jenkinsClassName}></div>
				{job.name} {resultText[build.result]} {this.formatTimeAgo(timestamp)}
			</div>);
		})
		return (
			<div className="jenkins-log">
				<h2>Jenkins build log</h2>
				{ jenkinsLogEntries }
			</div>
		);
	}
}
