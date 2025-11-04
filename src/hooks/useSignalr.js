import * as Signalr from '@microsoft/signalr'

const signalr = {}
let signalrTimer = null

export const useSignalrStop = (key) => {
	if (
		signalr.hasOwnProperty(key) &&
		signalr[key]?.state !== Signalr.HubConnectionState.Disconnected
	) {
		signalr[key]?.hubConnection?.stop()
		signalr[key] = null
	} else {
		Object.keys(signalr).forEach((key) => {
			if (signalr[key]?.state !== Signalr.HubConnectionState.Disconnected) {
				signalr[key]?.hubConnection?.stop()
				signalr[key] = null
				delete signalr[key]
			}
		})
	}
	clearTimeout(signalrTimer)
}

export const useSignalr = (key, path, token, callback, connecting, connected, error) => {
	if (
		!signalr.hasOwnProperty(key) ||
		!signalr[key] ||
		signalr[key]?.state === Signalr.HubConnectionState.Disconnected
	) {
		if (path) {
			try {
				signalr[key] = {}
				signalr[key].token = token
				signalr[key].hubConnection = new Signalr.HubConnectionBuilder()
					.withUrl(`${path}`, {
						transport: Signalr.HttpTransportType.WebSockets,
						accessTokenFactory() {
							return signalr[key].token
						},
					})
					.withAutomaticReconnect([0, 2000, 5000, 10000])
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
						typeof error === 'function' ? error('error') : null
					})

				signalr[key].hubConnection.onreconnecting(() => {
					console.log('🔄 尝试重连中...')
					typeof connecting === 'function' ? connecting('reconnecting') : null
				})

				signalr[key].hubConnection.onreconnected(() => {
					console.log('✅ 已重新连接')
					typeof connected === 'function' ? connected('reconnected') : null
				})

				signalr[key].hubConnection.onclose(() => {
					console.log('❌ 连接已关闭')
					typeof error === 'function' ? error('error') : null
				})
			} catch (err) {
				console.log('signalr error', err)
			}
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

	return signalr[key]?.hubConnection
}

export default {useSignalr, useSignalrStop}
