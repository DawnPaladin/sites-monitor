import React, { Component } from 'react';
import './App.css';

const Group = props => (
  <li className="group">
    {props.group.id}
    {/* system goes here */}
  </li>
);

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
    var groups = this.state.groups.map((group, index) => { return <Group key={index} group={group} /> });
    return (
      <div className="monitor">
        <ul className="groups">
          {groups}
        </ul>
      </div>
    );
  }
}

export default App;
