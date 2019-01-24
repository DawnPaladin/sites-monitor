import React, { Component } from 'react';
import './App.css';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      groups: []
    };
    this.getStatus = this.getStatus.bind(this);
    this.getStatus();
  }
  getStatus() {
    fetch("http://proxy.hkijharris.test/getStatus.php")
      .then(response => response.json())
      .then(json => {
        console.log(json.data);
        this.setState({groups: json.data});
      })
    ;
  }
  render() {
    let groups = this.state.groups.map((group, index) => {
      return <ul key={index} className="group">{group.id}</ul>
    });
    return (
      <div className="monitor">
        <div className="groups">
          {groups}
        </div>
      </div>
    );
  }
}

export default App;
