// hooks/sheet/useHistory.js
import {ref} from 'vue'
import {cloneDeep} from 'lodash-es'

export function useHistory(sheet, config) {
	const history = ref(new Map())
	const currentIndex = ref(-1)
	const maxHistory = 50 // 最大历史记录数
	const {renderRange, useMergedCellsHook} = config

	// 准备修改前保存当前状态
	const saveHistory = () => {
		history.value.set(currentIndex.value, cloneDeep(sheet))
		currentIndex.value++

		// 限制历史记录数量
		if (history.value.size > maxHistory) {
			for (let i = 0; i < history.value.size - maxHistory; i++) {
				history.value.delete(i)
			}
		}

		console.log('历史记录', history.value)
	}

	// 保存当前状态（用于初始化）
	const saveState = () => {
		currentIndex.value = 0
		history.value.set(currentIndex.value, cloneDeep(sheet))
	}

	// 撤销
	const undo = () => {
		currentIndex.value--
		Object.assign(sheet, cloneDeep(history.value.get(currentIndex.value)))
		history.value.delete(currentIndex.value)

		const mergedCells = new Map()
		Object.entries(sheet.config.mergedCells).forEach(([key, value]) =>
			mergedCells.set(key, value)
		)
		useMergedCellsHook.setMergedCells(mergedCells)
		renderRange()
	}

	// 判断是否可以撤销/重做
	const canUndo = () => currentIndex.value > 1

	saveState()

	return {
		saveHistory,
		saveState,
		undo,
		canUndo,
	}
}
