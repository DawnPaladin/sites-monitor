import React from 'react';
import PropTypes from 'prop-types';

export default class MyComponent extends React.Component {
	static propTypes = { // Document the props that should be passed to this component, just like passing parameters to a function. Example:
		// myOptionalStringProp: PropTypes.string,
		// myRequiredBooleanProp: PropTypes.bool.isRequired,
		// PropTypes are the same as JavaScript types except for func and bool, which are short for function and boolean.
		
	}
	constructor(props) {
		super(props);
		// Anything that needs to happen when the component is first initialized
	}
	render() {
		// Any calculations that need to happen on each render
		
		return (<div> {/* Return a JSX element. This is just like HTML, but you can put JS between curly braces. */}
			
		</div>);
	}
}

// When finished, save into the `src` folder. If your component name is MyComponent, save as MyComponent.jsx.
// Components must start with a capital letter.

// Then put MyComponent into a render() function anywhere in the app:
// <MyComponent prop1={prop1} prop2={prop2} />

// And put this at the top of the file:
// import MyComponent from './MyComponent';
