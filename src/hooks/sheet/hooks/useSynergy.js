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
		sheet.state.loading = true
		sheet.state.msg = '正在连接中...'
		signalr = useSignalr(
			key,
			api,
			token,
			(state) => {
				if (state === 'error') {
					signalr = null
				}

				console.log('synergy state', state)
				sheet.state.loading = false
				useSynergyEvent(sheetKey, signalr)
				sheetStore.setLinked(state === 'success')
				typeof callback === 'function' && callback(signalr)
				sheet.emits('update:linked', state === 'success')
			},
			(error) => {
				sheet.state.loading = true
				sheet.state.progress = -1
				sheet.state.msg = '连接已断开, 请刷新页面尝试重新连接'
			}
		)
		return signalr
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

	const joinSheet = async (...args) => {
		if (!isLinked()) {
			return
		}

		await signalr.invoke('join-sheet-group', ...args).then((res) => {
			console.log('join-sheet-group', ...args, res, sheetKey)
			useSynergyEvent.refreshSheet(sheetKey)
		})
	}

	const leaveSheet = async (...args) => {
		if (!isLinked()) {
			return
		}

		await signalr.invoke('leave-sheet-group', ...args).then((res) => {
			console.log('leave-sheet-group', ...args, res)
		})
	}

	const createSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('create-sheet', ...args).then((res) => {
			console.log('create-sheet', res)
			const lastSheet = sheetStore.getLastSheet
			if (lastSheet) {
				const {data} = res
				lastSheet.original.sheetId = data.id
				lastSheet.name = lastSheet.name
				console.log(sheetStore.getLastSheet)
			}
		})
	}

	const removeSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('delete-sheet', ...args).then((res) => {
			console.log('delete-sheet', res)
		})
	}

	const changeSheetName = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('update-sheet', ...args).then((res) => {
			console.log('update-sheet', res)
		})
	}

	const eventCell = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		console.log('event-cell', ...args)

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

	const addRow = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('insert-row', ...args).then(() => {
			console.log('invoke insert-row')
		})
	}

	const removeRow = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}

		signalr.invoke('delete-row', ...args).then(() => {
			console.log('invoke delete-row')
		})
	}

	const addColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('insert-col', ...args).then(() => {
			console.log('invoke insert-col')
		})
	}

	const removeColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('delete-col', ...args).then(() => {
			console.log('invoke delete-col')
		})
	}

	const undoRowColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		signalr.invoke('revert-last-operation', ...args).then(() => {
			console.log('invoke revert-last-operation')
		})
	}

	const refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(id)
		useSynergyEvent?.refreshSheet(id)
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
			removeSheet,
			changeSheetName,
			eventCell,
			changeCell,

			addRow,
			removeRow,
			addColumn,
			removeColumn,
			undoRowColumn,
		}
	}

	return {
		init,
	}
}
