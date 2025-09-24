import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useGuid} from '@/hooks'

const EventMap = {
	CellClicked: 'OnCellClicked', // 接收到单元格点击
	JoinSheetGroup: 'OnJoinSheetGroup', // 加入sheet
	LeaveSheetGroup: 'OnLeaveSheetGroup', // 离开sheet, 切换sheet
	CellDataChanged: 'OnCellDataChanged', // 单元格数据变化
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
		const u = sheet.config.online.find((f) => f.id === user.operatorUserId)

		if (u) {
			Object.assign(u, {
				r: user.row,
				c: user.col,
				rr: user.row,
				cc: user.col,
			})
			return
		}

		sheet.config.online.push({
			id: user.operatorUserId,
			name: user.operatorName || '用户',
			r: user.row,
			c: user.col,
			rr: user.row,
			cc: user.col,
			value: '',
			state: 1,
		})
	}

	// 移除高亮组用户
	useSynergyEvent.removeGroupUser = (id) => {
		sheet.config.online = sheet.config.online.filter((f) => f.id !== id)
	}

	const isCurrentSheet = (sheetId) => sheet.original.sheetId !== sheetId

	signalr.on(EventMap.CellClicked, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		useSynergyEvent.groupUsers(res)
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
		useSynergyEvent.removeGroupUser(res.operatorUserId)
	})

	signalr.on(EventMap.CellDataChanged, (res) => {
		if (isCurrentSheet(res.sheetId)) {
			return
		}
		console.log(444, res)
		sheet.hooks.editHook.setCellValue(res.row, res.col, res.value)
	})
}

export default {
	useSynergyEvent,
}
