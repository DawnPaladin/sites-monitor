import React from 'react';
import PropTypes from 'prop-types';
import WithSeparator from 'react-with-separator';

export default class StatLine extends React.Component {
	static propTypes = {
		title: PropTypes.string.isRequired, // "UP"
		backgroundColor: PropTypes.string, // hsla(115, 100%, 73.9%, 0.85);
		shapeFillColor: PropTypes.string.isRequired,
		services: PropTypes.number,
		servers: PropTypes.number,
	}
	render() {
		var services = this.props.services === undefined ? null : <span>
			<span className="half-circle" style={{backgroundColor: this.props.shapeFillColor}} /> 
			{this.props.services} services
		</span>
		var servers = this.props.servers === undefined ? null : <span>
			<span className="square" style={{backgroundColor: this.props.shapeFillColor}} /> 
			{this.props.servers} servers
		</span>
		return (<div className="stat-line" style={{backgroundColor: this.props.backgroundColor }}>
			<strong>{this.props.title}: </strong>
			<WithSeparator separator=', '>
				{ services }
				{ servers }
			</WithSeparator>
		</div>);
	}
}
