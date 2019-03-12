export default function dumpLoadBalancer(lb) {
	// console.log(lb);
	return { 
		data: lb.data.map(group => { return {
			id: group.id,
			virtual_services: group.virtual_services.map(service => { return {
				id: service.id,
				name: service.name,
				tier: service.tier,
				servers: service.servers.map(server => { return {
					id: Math.floor(Math.random() * 100),
					operational_status: server.operational_status,
				}})
			}})
		}})
	};
}
