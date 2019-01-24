import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.getStatus = this.getStatus.bind(this);
    this.getStatus();
  }
  getStatus() {
    console.log("Started");
    fetch("http://proxy.hkijharris.test/getStatus.php")
      .then(response => response.json())
      .then(json => {
        console.log(json.data);
        this.setState('systems', json.data);
      })
    ;
  }
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.js</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
        </header>
      </div>
    );
  }
}

export default App;
