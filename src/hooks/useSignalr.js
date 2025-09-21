import * as Signalr from '@microsoft/signalr'

const signalr = {}
let signalrTimer = null

export const useSignalrStop = (key) => {
	if (
		signalr.hasOwnProperty(key) &&
		signalr[key]?.state !== Signalr.HubConnectionState.Disconnected
	) {
		signalr[key].hubConnection?.stop()
		signalr[key] = null
	} else {
		Object.keys(signalr).forEach((key) => {
			if (signalr[key]?.state !== Signalr.HubConnectionState.Disconnected) {
				signalr[key].hubConnection?.stop()
				signalr[key] = null
			}
		})
	}
	clearTimeout(signalrTimer)
}

export const useSignalr = (key, path, token, callback) => {
	if (
		!signalr.hasOwnProperty(key) ||
		!signalr[key] ||
		signalr[key]?.state === Signalr.HubConnectionState.Disconnected
	) {
		if (path) {
			signalr[key] = {}
			signalr[key].token = token
			signalr[key].hubConnection = new Signalr.HubConnectionBuilder()
				.withUrl(`${path}`, {
					transport: Signalr.HttpTransportType.WebSockets,
					accessTokenFactory() {
						return signalr[key].token
					},
				})
				.build()

			signalr[key].hubConnection
				?.start()
				.then(() => {
					signalr[key].path = path
					typeof callback === 'function' ? callback('success') : null
				})
				.catch((err) => {
					signalr[key].hubConnection = null
					signalr[key].token = null
					console.error('Signalr connection failed')
					typeof callback === 'function' ? callback('error') : null
				})
		}
	} else {
		// console.log('Signalr connection is still alive: ', signalr[key]?.state)
	}
	clearTimeout(signalrTimer)
	signalrTimer = setTimeout(
		() =>
			Object.keys(signalr).forEach((key) =>
				useSignalr(key, signalr[key].path, signalr[key].token)
			),
		10000
	)

	return signalr[key].hubConnection
}

export default {useSignalr, useSignalrStop}
