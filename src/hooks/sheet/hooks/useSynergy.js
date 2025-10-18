import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSignalr, useSignalrStop} from '@/hooks/useSignalr'
import {useSynergyEvent} from './useSynergyEvent'
import {ElMessage} from 'element-plus'

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
			if (!res.status) {
				ElMessage.error(res.message)
			}
			useSynergyEvent.refreshSheet(sheetKey)
		})
	}

	const leaveSheet = async (...args) => {
		if (!isLinked()) {
			return
		}

		// 在离开 sheet 前，清除当前用户的权限
		if (sheet.hooks.permissionsHook) {
			const currentUserId = sheetStore.getCurrentUserId
			if (currentUserId) {
				console.log('leaveSheet - 清除当前用户权限:', currentUserId)
				sheet.hooks.permissionsHook.releasePermissions(currentUserId)
			}
		}

		await signalr.invoke('leave-sheet-group', ...args).then((res) => {
			console.log('leave-sheet-group', ...args, res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
		})
	}

	const createSheet = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('create-sheet', ...args).then((res) => {
			console.log('create-sheet', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
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
			if (!res.status) {
				ElMessage.error(res.message)
			}
		})
	}

	const changeSheetName = (...args) => {
		if (!isLinked()) {
			return
		}
		signalr.invoke('update-sheet', ...args).then((res) => {
			console.log('update-sheet', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
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

	const changeCell = async (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}

		await signalr.invoke('change-cell', ...args).then((res) => {
			console.log('invoke change-cell', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})

		return Promise.resolve()
	}

	const addRow = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		sheet.state.progress = -1
		signalr.invoke('insert-row', ...args).then((res) => {
			console.log('invoke insert-row')
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})
	}

	const removeRow = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		sheet.state.progress = -1
		signalr.invoke('delete-row', ...args).then((res) => {
			console.log('invoke delete-row', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})
	}

	const addColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		sheet.state.progress = -1
		signalr.invoke('insert-col', ...args).then((res) => {
			console.log('invoke insert-col')
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})
	}

	const removeColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		sheet.state.progress = -1
		signalr.invoke('delete-col', ...args).then((res) => {
			console.log('invoke delete-col', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})
	}

	const undoRowColumn = (...args) => {
		if (!isLinked()) {
			console.error('链接失败')
			return
		}
		sheet.state.progress = -1
		signalr.invoke('revert-last-operation', ...args).then((res) => {
			console.log('invoke revert-last-operation', res)
			if (!res.status) {
				ElMessage.error(res.message)
			}
			sheet.state.loading = false
		})
	}

	const refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(id)
		useSynergyEvent?.refreshSheet?.(id)
	}

	const destroy = () => {
		sheet = null
		sheetKey = null
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => {
			console.log('installed useSynergy')
		}, 16)
		return {
			destroy,
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
