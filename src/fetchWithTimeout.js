// adapted from https://davidwalsh.name/fetch-timeout

export default function fetchWithTimeout(url, timeoutDuration) {
	var didTimeout = false;
	return new Promise(function(resolve, reject) {
		const timeout = setTimeout(function() {
			didTimeout = true;
			reject(new Error(`Request to ${url} timed out`));
		}, timeoutDuration);
		
		fetch(url)
			.then(function(response) {
				clearTimeout(timeout);
				if (!didTimeout) {
					resolve(response);
				}
			})
			.catch(function(err) {
				console.error(err);
				
				// Rejection already happened with setTimeout
				if (didTimeout) return;
				// Reject with error
				reject(err);
			})
		;
	}).catch(function(err) {
		console.error(err);
	})
}
