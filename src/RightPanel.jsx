import React from 'react';
import PropTypes from 'prop-types';

import ErrorBoundary from './ErrorBoundary';
import StatLine from './StatLine';
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
		downedServices: PropTypes.array.isRequired,
		simulateDownedService: PropTypes.bool,
		showLegend: PropTypes.bool,
		jenkinsTimestamps: PropTypes.array.isRequired,
		jenkinsJobsByTimestamp: PropTypes.object.isRequired,
	}
	// constructor(props) {
	// 	super(props);
	// }
	
	render() {
		var downedServices = this.props.downedServices.map(service => <DownedService service={service} key={service.id} serverColors={this.props.serverColors} />);
		return (<div className="right-panel">
			<ErrorBoundary>
				<StatLine title="UP" backgroundColor="hsla(115, 100%, 73.9%, 0.85)" shapeFillColor="lime" services={this.props.serviceStats.up} servers={this.props.serverStats.up} />
				<StatLine title="DISABLED" backgroundColor="hsla(0, 0%, 75%, 0.85)" shapeFillColor="gray" servers={this.props.serverStats.disabled} />
				<div className="downed">
					{this.props.simulateDownedService && <center><strong>**SIMULATED**<br/></strong></center>}
					<StatLine title="DOWN" shapeFillColor="red" services={this.props.serviceStats.down} servers={this.props.serverStats.down} />
					<div className="downed-services">
						{downedServices}
					</div>
				</div>
			</ErrorBoundary>
			{ this.props.showLegend && 
				<div className="legend">
					<h2>Legend</h2>
					<img src="legend.svg" alt="legend" />
				</div>
			}
			<ErrorBoundary>
				<JenkinsLog timestamps={this.props.jenkinsTimestamps} jobsByTimestamp={this.props.jenkinsJobsByTimestamp} />
			</ErrorBoundary>

		</div>)
	}
}
