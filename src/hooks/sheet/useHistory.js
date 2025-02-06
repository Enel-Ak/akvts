import {cloneDeep} from 'lodash'
export function useHistory(config) {
	const {sheet, renderRange, useMergedCellsHook, useSelectionRangeHook} = config
	const history = []
	const max = 50

	// 准备修改前保存当前状态
	const saveHistory = (cell = null, type = 'edit') => {
		// 保存完整的 sheet 状态
		const state = {
			config: cloneDeep(sheet.config),
			celldata: new Map(),
			addRow: new Map(),
			addCol: new Map(),
		}

		if (cell) {
			switch (type) {
				case 'edit':
					state.celldata.set(`${cell.rowIndex}-${cell.colIndex}`, cell.value)
					break
				case 'addRow':
					for (let i = cell.rowIndex; i <= cell.rowIndex + cell.rowspan; i++) {
						state.addRow.set(`${i}`, {rowspan: cell.rowspan})
					}
					break
				case 'addCol':
					for (let i = cell.colIndex; i <= cell.colIndex + cell.colspan; i++) {
						state.addCol.set(`${cell.colIndex}`, {colspan: cell.colspan})
					}
					break
			}
		}

		history.push(state)

		// 清除超出最大限制的历史记录
		if (history.length > max) {
			history.shift()
		}
		console.log('历史记录:', history)
	}

	// 撤销
	const undo = () => {
		if (!canUndo()) return

		if (history.length > 0) {
			const state = history.pop()

			// 更新配置
			sheet.config = state.config

			// 更新单元格数据
			if (state.celldata.size > 0) {
				;[...state.celldata].forEach((arr) => {
					const [rowIndex, colIndex] = arr[0].split('-')
					const startRow = Number(rowIndex)
					const startCol = Number(colIndex)
					sheet.celldata.get(startRow)[startCol] = arr[1]
					useSelectionRangeHook.setRange(startRow, startCol, startRow, startCol, true)
				})
			}

			if (state.addRow.size > 0) {
				// 获取被删除的行
				const deletedRows = [...state.addRow]
					.map(([key]) => Number(key))
					.sort((a, b) => a - b)
				if (deletedRows.length > 0) {
					const insertRowIndex = deletedRows[0] // 获取插入的位置

					// 创建新的 Map 来存储更新后的数据
					const newCelldata = new Map()

					sheet.celldata.forEach((rowData, rowIndex) => {
						if (rowIndex < insertRowIndex) {
							// 处理插入位置之前的行（保持不变）
							newCelldata.set(rowIndex, rowData)
						} else if (rowIndex > insertRowIndex) {
							// 处理插入位置之后的行（向上移动一行）
							newCelldata.set(rowIndex - 1, rowData)
						}
					})

					// 更新 sheet.celldata
					sheet.celldata = newCelldata
					sheet.config.rowCount--
				}
			}

			if (state.addCol.size > 0) {
				// 获取被删除的列
				const deletedRows = [...state.addRow]
					.map(([key]) => Number(key))
					.sort((a, b) => a - b)
				if (deletedRows.length > 0) {
					const newCelldata = new Map()
					sheet.celldata.forEach((_, rowIndex) => {
						let rowData = sheet.celldata.get(rowIndex)
						deletedRows.forEach((_, deletedColIndex) => {
							rowData.splice(deletedColIndex, 1)
						})
						newCelldata.set(rowIndex, rowData)
					})
					sheet.celldata = newCelldata
					sheet.config.colCount -= deletedRows.length
				}
			}

			// 更新合并单元格
			if (state.config.mergedCells) {
				const mergedCells = new Map()
				Object.entries(state.config.mergedCells).forEach(([key, value]) =>
					mergedCells.set(key, value)
				)
				useMergedCellsHook.setMergedCells(mergedCells)
			}

			renderRange()
		}
	}

	// 判断是否可以撤销/重做
	const canUndo = () => history.length > 1

	const destroy = () => {
		history.length = 0
	}

	const init = () => {}

	return {
		init,
		destroy,
		saveHistory,
		undo,
		canUndo,
	}
}
