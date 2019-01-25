// TODO: Site must calculate whether it's down or up based on whether there are more servers down than its minimum_notificate_real_server value

import React, { Component } from 'react';
import './App.scss';

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

const Group = props => {
  var systems = props.group.virtual_services.map(system => <System key={system.name} system={system} />);
  return (
    <li className="group">
      {props.group.id}
      {systems}
    </li>
  )
};

class System extends Component {
  constructor(props) {
    super(props);
    this.state = {
      servers: this.props.system.servers
    }
    this.serverColor = this.serverColor.bind(this);
  }
  serverColor(opStatus) {
    switch (opStatus) {
      case 'enable':
        return 'green';
      case 'disable':
        return 'grey';
      case 'out-of-service-health':
        return 'red';
      default:
        console.warn("Unexpected server status", opStatus);
    }
  }
  render() {
    var servers = this.state.servers.map(server => (
      <div 
        className={ "rect " + this.serverColor(server.operational_status)}
        server={server}
        key={server.id} 
      ></div>
    ));
    return (
      <div className="system">
        <div className="green circle"></div>
        <div className="rects">
          {servers}
        </div>
      </div>
    )
  }
}

export default App;
