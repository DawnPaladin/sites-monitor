import React from 'react';
import PropTypes from 'prop-types';

import ErrorBoundary from './ErrorBoundary';
import JenkinsLog from './JenkinsLog';

class DownedService extends React.Component {
	static propTypes = {
		service: PropTypes.object.isRequired,
		serverColors: PropTypes.object.isRequired,
	}
	render() {
		var servers = this.props.service.servers.map(server => <div className="server indent" key={server.id}>
				<div className={"square " + this.props.serverColors[server.operational_status]}></div>
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

export default class RightPanel extends React.Component {
	static propTypes = {
		serverColors: PropTypes.object.isRequired,
		serviceStats: PropTypes.shape({
			up: PropTypes.number,
			down: PropTypes.number,
		}).isRequired,
		serverStats: PropTypes.shape({
			up: PropTypes.number,
			down: PropTypes.number,
			disabled: PropTypes.number,
		}).isRequired,
		downedServices: PropTypes.array.required,
		simulateDownedService: PropTypes.bool,
		showLegend: PropTypes.bool,
		jenkinsTimestamps: PropTypes.array.required,
		jenkinsJobsByTimestamp: PropTypes.array.required,
	}
	constructor(props) {
		super(props);
	}
	
	render() {
		var downedServices = this.props.downedServices.map(service => <DownedService service={service} key={service.id} />);
		return (<div className="right-panel">
			<ErrorBoundary>
				<div className="stat-line stat-line-green">
					<strong>UP: </strong>
					<span className="half-circle green"></span>
					<span>{this.props.serviceStats.up} services,</span>
					<span className="square green"></span>
					<span>{this.props.serverStats.up} servers</span>
				</div>
				<div className="stat-line stat-line-grey">
					<strong>DISABLED: </strong>
					<span className="square grey"></span>
					<span>{this.props.serverStats.disabled} servers</span>
				</div>
				<div className="downed">
					<div className="stat-line stat-line-red">
						{this.props.simulateDownedService && <strong>**SIMULATED**<br/></strong>}
						<strong>DOWN: </strong>
						<span className="half-circle red"></span>
						<span>{this.props.serviceStats.down} services,</span>
						<span className="square red"></span>
						<span>{this.props.serverStats.down} servers</span>
					</div>
					<div className="downed-services">
						{downedServices}
					</div>
				</div>
			</ErrorBoundary>
			{ this.props.showLegend && 
				<div className="legend">
					<h2>Legend</h2>
					<img src="/legend.svg" alt="legend" />
				</div>
			}
			<ErrorBoundary>
				<JenkinsLog timestamps={this.props.jenkinsTimestamps} jobsByTimestamp={this.props.jenkinsJobsByTimestamp} />
			</ErrorBoundary>

		</div>)
	}
}
