import {useProcessMapInBatches} from './useProcessMapInBatches'
import {useAirSheetStore} from '../store/useAirSheet'
import {useBufferToMap, useMapToBuffer, useBufferToStringArray} from './useBuffer'

export const useHistory = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let count = 0
	const max = 50

	// 准备修改前保存当前状态
	const save = (data = null, type = 'edit') => {
		// 优化：根据操作类型选择性保存状态，避免不必要的深拷贝
		const state = {
			config: null, // 延迟初始化
			celldata: new Map(),
			addRow: null,
			addCol: null,
			removeRow: new Map(),
			removeCol: new Map(),
			filterState: null, // 延迟初始化
			creationTime: Date.now(),
		}

		// 优化：只在需要时才进行深拷贝
		const needsConfigCopy = ['addRow', 'addCol', 'removeRow', 'removeCol'].includes(type)
		if (needsConfigCopy) {
			// 使用更高效的拷贝方式
			state.config = {
				...sheet.config,
				// 只拷贝必要的属性，避免深拷贝大对象
				filtered:
					sheet.config.filtered && Array.isArray(sheet.config.filtered)
						? [...sheet.config.filtered]
						: [],
				styled: sheet.config.styled ? {...sheet.config.styled} : {},
				merged: sheet.config.merged ? {...sheet.config.merged} : {},
				locked: sheet.config.locked ? {...sheet.config.locked} : {},
			}

			// 只在有筛选状态时才保存筛选相关数据
			if (
				sheet.config.filtered &&
				Array.isArray(sheet.config.filtered) &&
				sheet.config.filtered.length > 0
			) {
				state.filterState = {
					filtered: [...sheet.config.filtered],
					filterCellData: new Map(sheet.filterCellData || new Map()),
					rowMapping:
						sheet.rowMapping && Array.isArray(sheet.rowMapping)
							? [...sheet.rowMapping]
							: [],
				}
			}
		} else {
			// 对于简单操作，使用原来的深拷贝
			state.config = JSON.parse(JSON.stringify(sheet.config))
			state.filterState = {
				filtered:
					sheet.config.filtered && Array.isArray(sheet.config.filtered)
						? [...sheet.config.filtered]
						: [],
				filterCellData: new Map(sheet.filterCellData || new Map()),
				rowMapping:
					sheet.rowMapping && Array.isArray(sheet.rowMapping)
						? [...sheet.rowMapping]
						: [],
			}
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
					data.rowsData = useMapToBuffer(data.rowsData)
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
				if (state.removeRow) {
					// 创建新的数据结构
					try {
						state.removeRow.forEach((value, key) => {
							state.removeRow.set(key, {
								rowData: useBufferToStringArray(value.rowData),
								deleteCount: value.deleteCount,
							})
						})

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
						// state.removeRow.clear()

						// 筛选状态已经在前面恢复，不需要重新筛选

						// 优化：撤销删除行后清理缓存，提高后续操作性能
						if (sheet.hooks?.selectionRangeHook?.clearCache) {
							sheet.hooks.selectionRangeHook.clearCache()
						}
					} catch (error) {
						console.error('撤销删除行失败:', error)
					}
				}

				// 撤销删除列
				if (state.removeCol && state.removeCol.rowsData) {
					try {
						state.removeCol.rowsData = useBufferToMap(state.removeCol.rowsData, true)
						const {startCol, deleteCount, rowsData} = state.removeCol

						// 恢复删除的列数据
						await useProcessMapInBatches(
							sheet.id,
							rowsData,
							(rowIndex, deletedRowCols) => {
								if (typeof rowIndex === 'number' && Array.isArray(deletedRowCols)) {
									// 获取当前行数据
									let rowData = sheet.celldata.get(rowIndex) || []

									// 在指定位置插入删除的列数据
									// 使用 splice 在 startCol 位置插入 deletedRowCols
									rowData.splice(startCol, 0, ...deletedRowCols)

									// 更新行数据
									sheet.celldata.set(rowIndex, rowData)
								}
							}
						)

						// 更新列数量
						sheet.config.colCount += deleteCount

						// 特殊处理：对于删除列的撤销，需要重新恢复筛选状态
						// 因为删除列时筛选条件的列索引被修改了，撤销时需要恢复原始的列索引
						if (
							state.filterState &&
							state.filterState.filtered &&
							state.filterState.filtered.length > 0
						) {
							// 重新设置筛选状态（覆盖之前在通用恢复中设置的状态）
							sheet.config.filtered = [...state.filterState.filtered]

							// 清空并重新设置筛选数据
							sheet.filterCellData.clear()
							if (state.filterState.filterCellData) {
								state.filterState.filterCellData.forEach((value, key) => {
									sheet.filterCellData.set(key, value)
								})
							}

							sheet.rowMapping = Array.isArray(state.filterState.rowMapping)
								? [...state.filterState.rowMapping]
								: []

							// 重新执行筛选，因为列数据结构发生了变化
							await sheet.hooks.toolsHook.filterByCheckedSilent(sheet.config.filtered)
							console.log(
								'撤销删除列后重新执行筛选，筛选条件数量:',
								sheet.config.filtered.length
							)
						}

						// 优化：撤销删除列后清理缓存，提高后续操作性能
						if (sheet.hooks?.selectionRangeHook?.clearCache) {
							sheet.hooks.selectionRangeHook.clearCache()
						}
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

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
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
			refreshSheet,
		}
	}

	return {
		init,
	}
}
