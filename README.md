# Sites monitor

This is a site-status dashboard for projection on the wall of our office. It uses React to visualize data from Jenkins and from our Barracuda load balancer. It provides cheerful reassurance that all our sites are still up; if one of them goes down, it lets us know which site has gone down and which servers are responsible. It's designed to monitor a large number of sites with **no interaction** -- when something goes wrong it will tell you where to look without a single keypress or mouse click.

## Usage

Run `npm start` to start the development server. `npm run build` will build it for production.

This project fetches server status from http://proxy.hkijharris.test/getStatus.php and http://proxy.hkijharris.test/jenkins.php, which is hosted from "D:\apache\htdocs\proxy\" on my computer. This will be replaced by a more robust system later.

## Architecture

### sites-monitor/src

- **App.jsx:** All the networking and data-processing logic, and the app's overall layout.
- **App.scss:** Stylesheet
- **System.jsx:** React component visualizing a System, which is a service (site) and the servers that hold it up. Systems may also show a diamond that represents the most recent Jenkins build (defined in Diamond.jsx). Systems are organized into Groups defined by the load balancer.
- **JenkinsLog.jsx:** Displays recent builds from Jenkins. The number of recent builds is determined by `const numJenkinsBuildsToShow` in App.jsx.

### D:\apache\htdocs\proxy\

The React project isn't able to fetch data directly from Jenkins or the load balancer due to cross-site scripting limitations, so we use this PHP proxy instead. These files are not included in this repository because they contain important passwords.

- **load-balancer.php:** Gets a token by logging into our Barracuda load balancer, then uses that token to fetch a grouped list of servers and services.
- **jenkins.php:** Fetches the most recent build for each project from the old and the new Jenkins servers, then merges those two lists together.
- **jenkins-old.php: Deprecated.** Written before we understood how to fetch well-arranged data from Jenkins, this fetches ALL the information and then arranges it.
