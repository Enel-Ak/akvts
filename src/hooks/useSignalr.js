import * as Signalr from '@microsoft/signalr'

let signalr = {}
let signalrPath = {}
let signalrTimer = null

const useSignalrStop = (key) => {
	if (
		signalr.hasOwnProperty(key) &&
		signalr[key]?.state !== Signalr.HubConnectionState.Disconnected
	) {
		signalr[key]?.stop()
		signalr[key] = null
		signalrPath[key] = null
	} else {
		Object.keys(signalr).forEach((key) => {
			if (signalr[key]?.state !== Signalr.HubConnectionState.Disconnected) {
				signalr[key]?.stop()
				signalr[key] = null
				signalrPath[key] = null
			}
		})
	}
	clearTimeout(signalrTimer)
}

const useSignalr = (key, path) => {
	// console.log('useSignalr', key, path, signalr[key])

	if (
		!signalr.hasOwnProperty(key) ||
		!signalr[key] ||
		signalr[key]?.state === Signalr.HubConnectionState.Disconnected
	) {
		if (path) {
			signalr[key] = new Signalr.HubConnectionBuilder()
				.withUrl(`http://23.99.9.226:83/v2${path}`, {
					transport: Signalr.HttpTransportType.WebSockets,
					accessTokenFactory() {
						return localStorage.getItem('access_token')
					},
				})
				.build()

			signalr[key]
				?.start()
				.then(() => {
					console.log('Signalr connection started', key)
					signalrPath[key] = path
				})
				.catch((err) => {
					// console.error('Signalr connection failed', err)
					signalr[key] = null
					signalrPath[key] = null
				})
		}
	} else {
		// console.log('Signalr connection is still alive: ', signalr[key]?.state)
	}
	clearTimeout(signalrTimer)
	signalrTimer = setTimeout(
		() => Object.keys(signalr).forEach((key) => useSignalr(key, signalrPath[key])),
		10000
	)

	return signalr[key]
}

export {useSignalr, useSignalrStop}
