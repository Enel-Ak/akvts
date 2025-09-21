import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSignalr, useSignalrStop} from '@/hooks/useSignalr'

export const useSynergy = () => {
	let sheetKey = null
	let sheet = null
	let signalr = null

	const connection = async (api, token) => {
		if (!sheet.config.synergy) {
			return
		}
		if (!api || !token) {
			console.error('链接失败')
			return
		}
		const key = `air-sheet-ws-${Math.random().toString(36).slice(2)}`
		signalr = useSignalr(key, api, token, (state) => {
			if (state === 'error') {
				signalr = null
			}
		})
	}

	const joinSheet = (...args) => {
		signalr.invoke('join-sheet-group', ...args).then(() => {
			console.log('join-sheet-group')
			clickCell(...args)
		})
	}

	const clickCell = (...args) => {
		signalr?.invoke('click-cell', ...args).then(() => {
			console.log('click-cell')
		})
	}

	const refreshSheet = (id) => {
		sheet = useAirSheetStore().getSheet(id)
	}

	const init = (key) => {
		sheetKey = key
		sheet = useAirSheetStore().getSheet(key)
		setTimeout(() => {
			console.log('installed useSynergy')
		}, 16)
		return {connection, refreshSheet, joinSheet, clickCell}
	}

	return {
		init,
	}
}
