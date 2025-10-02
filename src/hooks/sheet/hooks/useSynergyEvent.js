import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useDebounce} from '@/hooks'

const EventMap = {
	EventClicked: 'OnEventClicked', // 接收到单元格点击
	CreateSheet: 'OnSheetCreated', // 创建sheet
	DeletedSheet: 'OnSheetDeleted', // 删除Sheet
	JoinSheetGroup: 'OnJoinSheetGroup', // 加入sheet
	LeaveSheetGroup: 'OnLeaveSheetGroup', // 离开sheet, 切换sheet
	CellDataChanged: 'OnCellDataChanged', // 单元格数据变化
	OnlineUsered: 'OnOnlineUsered', // 获取在线用户
	UserLeaved: 'OnUserLeaved', //  用户离开
	SheetUpdated: 'OnSheetUpdated', // sheet更新(名称)
	RowInserted: 'OnRowInserted', // 添加行
	ColInserted: 'OnColInserted', // 添加列
	RowDeleted: 'OnRowDeleted', // 删除行
	ColDeleted: 'OnColDeleted', // 删除列
}

export const useSynergyEvent = (sheetId, signalr) => {
	const sheetStore = useAirSheetStore()
	let sheetKey = sheetId
	let sheet = null

	useSynergyEvent.refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(sheetKey)
	}

	// 高亮组用户
	useSynergyEvent.groupUsers = (user) => {
		const u = sheet.config.online.find((f) => f.id === user[sheet.props.userKeys[0]])

		if (u) {
			// 更新在线用户
			Object.assign(u, {
				r: user.row,
				c: user.col,
				rr: user.row,
				cc: user.col,
			})
			return
		}

		sheet.config.online.push({
			id: user[sheet.props.userKeys[0]],
			name: user[sheet.props.userKeys[1]] || '用户',
			r: user.row,
			c: user.col,
			rr: user.row,
			cc: user.col,
			state: 1,
		})
	}

	// 移除高亮组用户
	useSynergyEvent.removeGroupUser = (id) => {
		sheet.config.online = sheet.config.online.filter((f) => f.id !== id)
	}

	const isCurrentSheet = (sheetId) => sheet.original.sheetId !== sheetId

	signalr.on(EventMap.SheetUpdated, (res) => {
		console.log('onSheetUpdated', res)
		sheetStore.setSheetName(res.sheetId, res.sheetName)
	})

	signalr.on(EventMap.CreateSheet, (res) => {
		console.log('onCreateSheet', res)
		const originalConfig = sheet.original.config
		sheetStore.addSheet(
			{id: res.sheetId, name: res.sheetName},
			sheet.props,
			sheet.emits,
			(curSheet) => {
				Object.assign(curSheet.config, originalConfig)
				Object.assign(curSheet.original, {
					config: originalConfig,
				})
			}
		)
	})

	signalr.on(EventMap.DeletedSheet, (res) => {
		console.log('onDeletedSheet', res)
		sheetStore.deleteSheet(res.sheetId)
	})

	signalr.on(EventMap.JoinSheetGroup, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
	})

	signalr.on(EventMap.LeaveSheetGroup, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		useSynergyEvent.removeGroupUser(res[sheet.props.userKeys[0]])
	})

	signalr.on(EventMap.EventClicked, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('EventCell', res)
		if (res.config) {
			const config = JSON.parse(res.config)
			const configKeys = Object.keys(config)
			configKeys.forEach((key) => {
				// Object.assign(sheet.config[key], config[key])
				sheet.config[key] = config[key]
			})

			if (configKeys.includes('formulaed')) {
				sheet.hooks.editHook.setFormulaValue()
			}

			if (configKeys.includes('merged')) {
				sheet.hooks.mergeHook.refreshMerge()
			}

			if (
				res.hasOwnProperty('row') &&
				res.hasOwnProperty('col') &&
				res.row >= 0 &&
				res.col >= 0
			) {
				useSynergyEvent.groupUsers(res)
			}
		} else {
			useSynergyEvent.groupUsers(res)
		}

		// useSynergyEvent.groupUsers(res)
	})

	signalr.on(EventMap.CellDataChanged, async (res) => {
		console.log('CellDataChanged', isCurrentSheet(res.sheetId))
		if (isCurrentSheet(res.sheetId)) {
			return
		}

		const cellEl = document
			.querySelector(`#${sheet.containerId}`)
			.querySelector(`[data-cell="${res.row}-${res.col}"]`)

		if (cellEl) {
			cellEl.innerText = res.value
		}

		if (!sheet.celldata.get(res.row)) {
			sheet.celldata.set(res.row, [])
		}

		setTimeout(() => {
			sheet.hooks.editHook.setCellValue(res.row, res.col, res.value)
			sheet.hooks.editHook.setRowHeight(res.row, res.col, false)
		}, 120)
	})

	signalr.on(EventMap.RowInserted, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('RowInserted', res)
		sheet.hooks.toolsHook.addRow(null, false, true, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.RowDeleted, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('RowDeleted', res)
		sheet.hooks.toolsHook.removeRow(null, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.ColInserted, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('ColInserted', res)
		sheet.hooks.toolsHook.addColumn(null, false, true, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.ColDeleted, (res) => {
		console.log('ColDeleted', res)
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log('ColDeleted', res)
		sheet.hooks.toolsHook.removeColumn(null, {
			startIndex: res.startIndex,
			count: res.count,
		})
	})

	signalr.on(EventMap.OnlineUsered, (res) => {
		console.log('OnlineUsered', res)

		const arr = []
		res.forEach((item) => {
			arr.push({
				id: item.userId,
				name: item.userName || '用户',
				bigDepartmentId: item.bigDepartmentId,
				bigDepartmentName: item.bigDepartmentName,
				departmentId: item.departmentId,
				departmentName: item.departmentName,
				isOnline: item.isOnline,
			})
		})

		sheetStore.setOnline(arr)
	})

	signalr.on(EventMap.UserLeaved, (res) => {
		console.log('OnUserLeaved', res)
		useSynergyEvent.removeGroupUser(res.userId)
		sheetStore.removeOnlineUser(res.userId)
	})
}

export default {
	useSynergyEvent,
}
