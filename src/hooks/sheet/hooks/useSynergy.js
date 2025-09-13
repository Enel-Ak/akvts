import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSignalr, useSignalrStop} from '@/hooks/useSignalr'

export const useSynergy = () => {
	let sheetKey = null
	let sheet = null
	let signalr = null

	const connection = async (api, token) => {
		if (!api || !token) {
			console.error('链接失败')
			return
		}
		const key = `air-sheet-ws-${Math.random().toString(36).slice(2)}`

		signalr = useSignalr(key, api, token)
	}

	const init = (key) => {
		sheetKey = key
		sheet = useAirSheetStore().getSheet(key)
		setTimeout(() => {
			console.log('installed useSynergy')
		}, 16)
		return {connection}
	}

	return {
		init,
	}
}
