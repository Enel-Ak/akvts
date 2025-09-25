import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSignalr, useSignalrStop} from '@/hooks/useSignalr'
import {useSynergyEvent} from './useSynergyEvent'

export const useSynergy = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let signalr = null

	const connection = async (api, token, callback) => {
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
			console.log('synergy state', state)
			useSynergyEvent(sheetKey, signalr)
			sheetStore.setLinked(state === 'success')
			typeof callback === 'function' && callback(signalr)
			sheet.emits('update:linked', state === 'success')
		})
	}

	const isLinked = () => {
		if (sheetStore.getLinked) {
			return true
		}
		console.error('链接失败')
		return false
	}

	const asyncConfig = (...args) => {
		console.log('async config')
		eventCell(...args)
	}

	const joinSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('join-sheet-group', ...args).then((res) => {
			console.log('join-sheet-group', res)
			useSynergyEvent.refreshSheet(sheetKey)
		})
	}

	const leaveSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('leave-sheet-group', ...args).then((res) => {
			console.log('leave-sheet-group', res)
		})
	}

	const createSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('create-sheet', ...args).then((res) => {
			console.log('create-sheet', res)
			const {data} = res
			sheet.original.sheetId = data.id
			sheet.name = data.sheetName || sheet.name
		})
	}

	const eventCell = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('event-cell', ...args).then(() => {
			console.log('invoke event-cell')
		})
	}

	const changeCell = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('change-cell', ...args).then(() => {
			console.log('invoke change-cell')
		})
	}

	const refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(id)
		useSynergyEvent.refreshSheet(id)
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => {
			console.log('installed useSynergy')
		}, 16)
		return {
			connection,
			refreshSheet,
			asyncConfig,
			joinSheet,
			leaveSheet,
			createSheet,
			eventCell,
			changeCell,
		}
	}

	return {
		init,
	}
}
