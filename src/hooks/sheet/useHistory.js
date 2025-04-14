import {cloneDeep} from 'lodash'
import {reactive} from 'vue'
export function useHistory(config) {
	const {
		sheet,
		loading,
		loadingText,
		loadingProgress,
		renderRange,
		processMapInBatches,
		useMergedCellsHook,
		useSelectionRangeHook,
	} = config
	const history = []
	const max = 200

	// 准备修改前保存当前状态
	const saveHistory = (data = null, type = 'edit') => {
		// 保存完整的 sheet 状态
		const state = {
			config: cloneDeep(sheet.config),
			celldata: new Map(),
			addRow: null,
			addCol: null,
			removeRow: new Map(),
			removeCol: new Map(),
		}

		if (data) {
			switch (type) {
				case 'edit':
					if (Array.isArray(data)) {
						data.forEach((item) => {
							state.celldata.set(`${item.rowIndex}-${item.colIndex}`, item.value)
						})
					} else {
						state.celldata.set(`${data.rowIndex}-${data.colIndex}`, data.value)
					}
					break
				case 'addRow':
					state.addRow = data
					break
				case 'addCol':
					state.addCol = data
					break
				case 'removeRow':
					state.removeRow = data
					break
				case 'removeCol':
					state.removeCol = data
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
	const undo = async () => {
		if (!canUndo()) return

		if (history.length > 0) {
			try {
				loading.value = true
				loadingText.value = '撤销数据处理中...'
				loadingProgress.value = -1

				const state = history.pop()

				// 撤销修改配置
				sheet.config = state.config

				// 撤销单元格修改
				if (state.celldata.size > 0) {
					try {
						await processMapInBatches(state.celldata, (rowIndex, rowData) => {
							const [r, c] = rowIndex.split('-').map(Number)
							sheet.celldata.get(r)[c] = rowData
							const merged = useMergedCellsHook.findMergedCell(r, c)

							if (merged) {
								useSelectionRangeHook.setRange(
									merged.row,
									merged.col,
									merged.rowspan + merged.row - 1,
									merged.colspan + merged.col - 1,
									true
								)
							} else {
								useSelectionRangeHook.setRange(r, c, r, c, true)
							}
						})
						state.celldata.clear()
					} catch (error) {
						console.error('撤销单元格修改失败:', error)
						loading.value = false
					}
				}

				// 撤销添加行
				if (state.addRow) {
					const newMap = new Map()
					try {
						const startRow = state.addRow.rowIndex // insertRowIndex
						const rowspan = state.addRow.rowspan

						await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
							// 保持和添加时后逻辑一样, 后续修改多行
							if (rowIndex < startRow) {
								// 插入行之前的数据保持不变
								newMap.set(rowIndex, rowData)
							} else if (rowIndex > startRow + rowspan - 1) {
								// 插入行之后的数据向上移动
								newMap.set(rowIndex - rowspan, rowData)
							}
						})

						// 处理合并单元格
						const mergedCells = useMergedCellsHook.getMergedCells()
						const newMergedCells = new Map()

						for (const [key, value] of Object.entries(mergedCells)) {
							const [row, col] = key.split('-').map(Number)
							if (row > startRow) {
								// 如果合并单元格在删除行之后，向上移动一行
								newMergedCells.set(`${row - rowspan}-${col}`, value)
							} else {
								newMergedCells.set(key, value)
							}
						}

						// 更新合并单元格
						useMergedCellsHook.setMergeCells(newMergedCells)

						// 更新 sheet.celldata
						sheet.celldata = newMap
						sheet.config.rowCount -= rowspan
						state.addRow = null
					} catch (error) {
						console.error('撤销添加行失败:', error)
						loading.value = false
					}
				}

				// 撤销添加列
				if (state.addCol) {
					const newMap = new Map()
					try {
						await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
							// 创建新的行数据数组
							const newRowData = []
							// 遍历原数据，跳过要删除的列
							rowData.forEach((cellData, index) => {
								// 检查当前列是否在要删除的列范围内
								const isInDeleteRange =
									index >= state.addCol.colIndex &&
									index < state.addCol.colIndex + state.addCol.colspan
								if (!isInDeleteRange) {
									newRowData.push(cellData)
								}
							})
							// 更新到新Map
							newMap.set(rowIndex, reactive(newRowData))
						})

						// 处理合并单元格
						const mergedCells = useMergedCellsHook.getMergedCells()
						const newMergedCells = new Map()

						for (const [key, value] of Object.entries(mergedCells)) {
							const [row, col] = key.split('-').map(Number)
							if (col > state.addCol.colIndex) {
								// 如果合并单元格在删除列之后，向左移动对应的列数
								newMergedCells.set(`${row}-${col - state.addCol.colspan}`, value)
							} else if (col < state.addCol.colIndex) {
								// 如果合并单元格在删除列之前，保持不变
								newMergedCells.set(key, value)
							}
							// 如果合并单元格正好在删除列的位置，则不添加到新的Map中
						}

						// 更新合并单元格
						useMergedCellsHook.setMergeCells(newMergedCells)

						// 更新 sheet.celldata
						sheet.celldata = newMap
						sheet.config.colCount -= state.addCol.colspan
						state.addCol = null
					} catch (error) {
						console.error('撤销添加列失败:', error)
						loading.value = false
					}
				}

				// 撤销删除行
				if (state.removeRow.size > 0) {
					// 创建新的数据结构
					const newMap = new Map()

					try {
						let count = 0
						await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
							const recover = state.removeRow.get(`${rowIndex}`)
							if (recover) {
								newMap.set(rowIndex, recover.rowData)
								count = recover.deleteCount
							}
							newMap.set(rowIndex + count, rowData)
						})

						// 更新 sheet.celldata
						sheet.celldata = newMap
						state.removeRow.clear()
					} catch (error) {
						console.error('撤销删除行失败:', error)
						loading.value = false
					}
				}

				// 撤销删除列
				if (state.removeCol.size > 0) {
					try {
						// 恢复删除的列
						await processMapInBatches(state.removeCol, (rowIndex, rowData) => {
							// 获取当前行的数据并转换为数组
							let currentRowData = Array.from(sheet.celldata.get(rowIndex) || [])

							// 按列索引排序，从小到大恢复
							const sortedData = rowData.sort((a, b) => a.colIndex - b.colIndex)

							// 一次性扩展数组长度
							const maxColIndex = sortedData[sortedData.length - 1].colIndex
							if (currentRowData.length < maxColIndex) {
								currentRowData.length = maxColIndex + 1
								currentRowData.fill(null, currentRowData.length)
							}

							// 一次性插入所有值
							sortedData.forEach(({colIndex, value}) => {
								currentRowData.splice(colIndex, 0, value)
							})

							// 更新到 sheet.celldata
							sheet.celldata.set(rowIndex, reactive(currentRowData))
						})
						state.removeCol.clear()
					} catch (error) {
						console.error('撤销删除列失败:', error)
						loading.value = false
					}
				}

				// 更新合并单元格
				if (state.config.mergedCells) {
					const mergedCells = new Map()
					Object.entries(state.config.mergedCells).forEach(([key, value]) =>
						mergedCells.set(key, value)
					)
					useMergedCellsHook.setMergeCells(mergedCells)
				}

				await renderRange()
			} catch (error) {
				console.error('处理数据时出错:', error)
			} finally {
				loading.value = false
				loadingText.value = '处理完成'
			}
		}
	}

	// 判断是否可以撤销/重做
	const canUndo = () => history.length > 0

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
