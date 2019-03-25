import React from 'react';

export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { 
			hasError: false,
		};
	}
	
	static getDerivedStateFromError(error) {
		// Update state so the next render will show the fallback UI.
		return { 
			hasError: true,
		};
	}
	
	componentDidCatch(error, info) {
		console.warn(error);
	}
	
	render() {
		if (this.state.hasError) {
			return <div className="error">
				<h1>Error</h1>
			</div>
		}
		
		return this.props.children;
	}
}
