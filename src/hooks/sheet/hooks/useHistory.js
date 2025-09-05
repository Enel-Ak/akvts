import {useProcessMapInBatches} from './useProcessMapInBatches'
import {useAirSheetStore} from '../store/useAirSheet'

export const useHistory = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let count = 0
	const max = 50

	// 准备修改前保存当前状态
	const save = (data = null, type = 'edit') => {
		// 保存完整的 sheet 状态，包括筛选状态
		const state = {
			config: JSON.parse(JSON.stringify(sheet.config)),
			celldata: new Map(),
			addRow: null,
			addCol: null,
			removeRow: new Map(),
			removeCol: new Map(),
			// 保存筛选相关状态
			filterState: {
				filtered:
					sheet.config.filtered && Array.isArray(sheet.config.filtered)
						? JSON.parse(JSON.stringify(sheet.config.filtered))
						: [],
				filterCellData: new Map(sheet.filterCellData || new Map()),
				rowMapping:
					sheet.rowMapping && Array.isArray(sheet.rowMapping)
						? JSON.parse(JSON.stringify(sheet.rowMapping))
						: [],
			},
			creationTime: Date.now(),
		}

		if (data) {
			switch (type) {
				case 'edit':
					if (Array.isArray(data)) {
						data.forEach((item) => {
							state.celldata.set(`${item.r}-${item.c}`, item.v)
						})
					} else {
						state.celldata.set(`${data.r}-${data.c}`, data.v)
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
				case 'filter':
					// 筛选操作不需要额外数据，状态已经在filterState中保存
					break
			}
		}

		sheet.history.set(count, state)
		count++
		// 清除超出最大限制的历史记录
		if (sheet.history.size > max) {
			sheet.history.delete(sheet.history.keys().next().value)
		}
		console.log('历史记录', sheet.history)
	}

	// 撤销
	const undo = async (callback) => {
		if (!canUndo()) return

		if (sheet.history.size > 0) {
			try {
				sheet.state.loading = true
				sheet.state.msg = '撤销数据处理中...'

				count--
				const state = sheet.history.get(count)
				if (!state) return

				// 撤销修改配置
				Object.assign(sheet.config, state.config)

				// 恢复筛选状态
				if (state.filterState) {
					sheet.config.filtered = Array.isArray(state.filterState.filtered)
						? [...state.filterState.filtered]
						: []

					// 清空并重新设置筛选数据，确保Vue能检测到变化
					sheet.filterCellData.clear()
					if (state.filterState.filterCellData) {
						state.filterState.filterCellData.forEach((value, key) => {
							sheet.filterCellData.set(key, value)
						})
					}

					sheet.rowMapping = Array.isArray(state.filterState.rowMapping)
						? [...state.filterState.rowMapping]
						: []
				}

				// 撤销单元格修改
				if (state.celldata.size > 0) {
					try {
						await useProcessMapInBatches(
							sheet.id,
							state.celldata,
							(rowIndex, rowData) => {
								if (rowData === null || rowData === undefined) {
									rowData = ''
								}

								const [r, c] = rowIndex.split('-').map(Number)
								if (sheet.celldata.get(r)) {
									sheet.celldata.get(r)[c] = rowData
								}
								const merged = sheet.hooks.mergeHook.findMergedCell(r, c)
								if (merged) {
									sheet.hooks.selectionRangeHook.setRange(
										merged.row,
										merged.col,
										merged.rowspan + merged.row - 1,
										merged.colspan + merged.col - 1,
										true
									)
								} else {
									sheet.hooks.selectionRangeHook.setRange(r, c, r, c, true)
								}
							}
						)
						state.celldata.clear()
					} catch (error) {
						console.error('撤销单元格修改失败:', error)
					}
				}

				// 撤销添加行
				if (state.addRow) {
					try {
						const r = state.addRow.r // insertRowIndex
						const rs = state.addRow.rs

						// 检查是否是在筛选状态下添加的行（添加到末尾）
						const wasFilteredAdd = r >= sheet.config.rowCount - rs

						if (wasFilteredAdd) {
							// 筛选状态下添加的行，直接删除末尾的行
							for (let i = 0; i < rs; i++) {
								sheet.celldata.delete(sheet.config.rowCount - 1 - i)
							}
						} else {
							// 正常状态下添加的行，需要移动数据
							await useProcessMapInBatches(
								sheet.id,
								sheet.celldata,
								(rowIndex, rowData) => {
									// 保持和添加时后逻辑一样, 后续修改多行
									if (rowIndex < r) {
										// 插入行之前的数据保持不变
										// newMap.set(rowIndex, rowData)
									} else if (rowIndex > r + rs - 1) {
										// 插入行之后的数据向上移动
										sheet.celldata.set(rowIndex - rs, rowData)
									}
								}
							)
						}

						sheet.config.rowCount -= rs

						// 如果当前处于筛选状态，需要更新筛选数据
						if (sheet.config.filtered && sheet.config.filtered.length > 0) {
							// 使用静默模式重新执行筛选，避免闪烁
							const currentFiltered = [...sheet.config.filtered]
							await sheet.hooks.toolsHook.filterByCheckedSilent(currentFiltered)
						}

						state.addRow = null
					} catch (error) {
						console.error('撤销添加行失败:', error)
					}
				}

				// 撤销添加列
				if (state.addCol) {
					try {
						await useProcessMapInBatches(
							sheet.id,
							sheet.celldata,
							(rowIndex, rowData) => {
								// 更新到新Map
								sheet.celldata.set(
									rowIndex,
									rowData.filter((_, index) => {
										return (
											index < state.addCol.c ||
											index >= state.addCol.c + state.addCol.cs
										)
									})
								)
							}
						)

						sheet.config.colCount -= state.addCol.cs

						// 如果当前处于筛选状态，需要更新筛选数据
						if (sheet.config.filtered && sheet.config.filtered.length > 0) {
							// 使用静默模式重新执行筛选，避免闪烁
							const currentFiltered = [...sheet.config.filtered]
							await sheet.hooks.toolsHook.filterByCheckedSilent(currentFiltered)
						}

						state.addCol = null
					} catch (error) {
						console.error('撤销添加列失败:', error)
					}
				}

				// 撤销删除行
				if (state.removeRow.size > 0) {
					// 创建新的数据结构
					try {
						let count = 0
						await useProcessMapInBatches(
							sheet.id,
							sheet.celldata,
							(rowIndex, rowData) => {
								const recover = state.removeRow.get(`${rowIndex}`)
								if (recover) {
									sheet.celldata.set(rowIndex, recover.rowData)
									count = recover.deleteCount
								}
								sheet.celldata.set(rowIndex + count, rowData)
							}
						)

						// 更新 sheet.celldata
						state.removeRow.clear()

						// 筛选状态已经在前面恢复，不需要重新筛选
					} catch (error) {
						console.error('撤销删除行失败:', error)
					}
				}

				// 撤销删除列
				if (state.removeCol.size > 0) {
					try {
						// 恢复删除的列
						await useProcessMapInBatches(
							sheet.id,
							state.removeCol,
							(rowIndex, rowData) => {
								// 获取当前行的数据并转换为数组
								let currentRowData = Array.from(sheet.celldata.get(rowIndex) || [])

								// 按列索引排序，从小到大恢复
								const sortedData = rowData.sort((a, b) => a.c - b.c)

								// 一次性扩展数组长度
								const maxColIndex = sortedData[sortedData.length - 1].c
								if (currentRowData.length < maxColIndex) {
									currentRowData.length = maxColIndex + 1
									currentRowData.fill(null, currentRowData.length)
								}

								// 一次性插入所有值
								sortedData.forEach(({c, v}) => {
									currentRowData.splice(c, 0, v)
								})

								// 更新到 sheet.celldata
								sheet.celldata.set(rowIndex, currentRowData)
							}
						)
						state.removeCol.clear()

						// 筛选状态已经在前面恢复，不需要重新筛选
					} catch (error) {
						console.error('撤销删除列失败:', error)
					}
				}

				// 更新合并单元格
				if (state.config.merged) {
					sheet.hooks.mergeHook.setMergeCells(
						new Map(Object.entries(state.config.merged))
					)
				}

				sheet.history.delete(count)
				callback?.()
			} catch (error) {
				console.error('处理数据时出错:', error)
			} finally {
				sheet.state.loading = false
			}
		}
	}

	// 判断是否可以撤销/重做
	const canUndo = () => sheet.history.size > 0

	const destroy = () => {
		sheet.history.clear()
	}

	const init = (key) => {
		sheet = sheetStore.getSheet(key)
		sheetKey = key
		setTimeout(() => console.log('installed useHistory'), 16)
		return {
			destroy,
			save,
			undo,
			canUndo,
		}
	}

	return {
		init,
	}
}
