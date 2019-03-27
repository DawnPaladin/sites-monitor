import React from 'react';
import PropTypes from 'prop-types';

/** Used in the System component and the Jenkins build log */
export default class Diamond extends React.Component {
	static propTypes = {
		buildResult: PropTypes.string,
	}
	render() {
		let jenkinsClassName = "diamond";
		if      (this.props.buildResult === "SUCCESS") jenkinsClassName += " green";
		else if (this.props.buildResult === "FAILURE") jenkinsClassName += " red";
		else jenkinsClassName += " grey";
		
		return <div className={jenkinsClassName}></div>;
	}
}
