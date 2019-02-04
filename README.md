# Sites monitor

This is a site-status dashboard that my team projects on one wall of our office. It uses React to visualize data from our Barracuda load balancer. It provides cheerful reassurance that all our sites are still up; if one of them goes down, it lets us know which site has gone down and which servers are responsible. It's designed to monitor a large number of sites with **no interaction** -- when something goes wrong it will tell you where to look without a single keypress or mouse click.

![Demo](demo.png)

Each circle is a site/service; each rectangle is one of the servers holding it up. If something turns red, it's down and you should go fix it. Data is fetched from the `dataUrl` on line 7 every 30 seconds.
