export default function dumpLoadBalancer(lb) {
	// console.log(lb);
	return { 
		data: lb.data.map(group => { return {
			id: group.id,
			virtual_services: group.virtual_services.map(service => { return {
				id: service.id,
				name: service.name,
				tier: service.tier,
				minimum_notificate_real_server: service.minimum_notificate_real_server,
				servers: service.servers.map(server => { return {
					id: "SERVER_" + Math.floor(Math.random() * 100),
					operational_status: server.operational_status,
				}})
			}})
		}})
	};
}
