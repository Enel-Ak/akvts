import {useProcessMapInBatches} from './useProcessMapInBatches'
import {useAirSheetStore} from '../store/useAirSheet'
import {useBufferToMap, useMapToBuffer, useBufferToStringArray} from './useBuffer'
import {nextTick} from 'vue'

export const useHistory = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let count = 0
	const max = 50

	const asycnUndo = () => {
		// 协同通知:撤销操作
		if (sheet.config.synergy) {
			sheet.hooks.synergyHook.undoRowColumn(
				sheet?.original?.sheetId || sheet.id,
				JSON.stringify({
					merged: sheet.config.merged,
					locked: sheet.config.locked,
					styled: sheet.config.styled,
					formulaed: sheet.config.formulaed,
					formulaMap: sheet.config.formulaMap,
					rResize: sheet.config.rResize,
					cResize: sheet.config.cResize,
					deepPermissions: sheet.config.deepPermissions,
					// superPermissions: sheet.config.superPermissions,
				}),
				sheet.config.super
			)
		}
	}

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
				deepPermissions: sheet.config.deepPermissions
					? JSON.parse(JSON.stringify(sheet.config.deepPermissions))
					: {},
				superPermissions: sheet.config.superPermissions
					? JSON.parse(JSON.stringify(sheet.config.superPermissions))
					: {},
				formulaed: sheet.config.formulaed
					? JSON.parse(JSON.stringify(sheet.config.formulaed))
					: {},
				formulaMap: sheet.config.formulaMap
					? JSON.parse(JSON.stringify(sheet.config.formulaMap))
					: {},
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
			// ✅ 修复: JSON.stringify 可能无法正确处理某些值，改用 structuredClone
			// 但为了兼容性，先尝试 JSON 方式，然后补充权限配置
			try {
				state.config = JSON.parse(JSON.stringify(sheet.config))
			} catch (error) {
				console.warn('JSON 序列化失败，使用 structuredClone:', error)
				state.config = structuredClone(sheet.config)
			}

			// ✅ 修复: 确保权限配置被正确保存（防止 JSON.stringify 丢失某些值）
			if (sheet.config.deepPermissions) {
				state.config.deepPermissions = JSON.parse(
					JSON.stringify(sheet.config.deepPermissions)
				)
			}
			if (sheet.config.superPermissions) {
				state.config.superPermissions = JSON.parse(
					JSON.stringify(sheet.config.superPermissions)
				)
			}

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

		// 🔍 调试日志：记录保存的权限配置
		if (needsConfigCopy && (state.config.deepPermissions || state.config.superPermissions)) {
			console.log('✅ 历史记录已保存权限配置:', {
				type,
				deepPermissions: state.config.deepPermissions,
				superPermissions: state.config.superPermissions,
			})
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
					sheet.state.loading = false
				}

				// 撤销单元格修改
				if (state.celldata.size > 0) {
					try {
						// 收集需要同步的单元格变化
						const cellChanges = []

						await useProcessMapInBatches(
							sheet.id,
							state.celldata,
							(rowIndex, rowData) => {
								if (rowData === null || rowData === undefined) {
									rowData = ''
								}

								const [r, c] = rowIndex.split('-').map(Number)

								// 保存撤销前的值(当前值)用于协同通知
								const beforeValue = sheet.celldata.get(r)?.[c] || ''
								const afterValue = rowData

								// 更新单元格数据
								if (sheet.celldata.get(r)) {
									sheet.celldata.get(r)[c] = rowData
								}

								// 收集变化用于协同通知
								if (sheet.config.synergy) {
									cellChanges.push({
										r,
										c,
										before: beforeValue,
										after: afterValue,
									})
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
									sheet.hooks.permissionsHook.updatePermissions(r, c, r, c)
								}
							}
						)

						// 协同通知:单元格修改撤销
						if (sheet.config.synergy && cellChanges.length > 0) {
							cellChanges.forEach((change) => {
								sheet.hooks.synergyHook.changeCell({
									sheetId: sheet?.original?.sheetId || sheet.id,
									row: change.r,
									col: change.c,
									before: change.before,
									after: change.after,
								})
							})
						}

						state.celldata.clear()
						sheet.state.loading = false
					} catch (error) {
						console.error('撤销单元格修改失败:', error)
					}
				}

				// 撤销添加行
				if (state.addRow) {
					try {
						const r = state.addRow.r // insertRowIndex
						const rs = state.addRow.rs
						// 保存当前的行数（添加行后的行数）
						const currentRowCount = sheet.config.rowCount + rs

						// 检查是否是在筛选状态下添加的行（添加到末尾）
						const wasFilteredAdd = r >= currentRowCount - rs

						if (wasFilteredAdd) {
							// 筛选状态下添加的行，直接删除末尾的行
							for (let i = 0; i < rs; i++) {
								sheet.celldata.delete(currentRowCount - 1 - i)
							}
						} else {
							// 正常状态下添加的行，需要移动数据
							const rowsToMove = []
							await useProcessMapInBatches(
								sheet.id,
								sheet.celldata,
								(rowIndex, rowData) => {
									// 收集需要向上移动的数据

									if (rowIndex >= r + rs) {
										rowsToMove.push({
											oldIndex: rowIndex,
											newIndex: rowIndex - rs,
											data: rowData,
										})
									}
								}
							)

							rowsToMove.sort((a, b) => b.oldIndex - a.oldIndex)
							const omax = Math.max(...rowsToMove.map((item) => item.oldIndex)) + 1
							const nmax = Math.max(...rowsToMove.map((item) => item.newIndex)) + 1
							for (let i = 0; i < r + rs; i++) {
								// 修复最后一行数据未清除
								rowsToMove.unshift({
									oldIndex: omax + i,
									newIndex: nmax + i,
									data: [],
								})
							}

							rowsToMove.forEach(({oldIndex, newIndex, data}, index) => {
								sheet.celldata.set(newIndex, data)
								// sheet.celldata.delete(oldIndex)
							})
						}

						// 如果当前处于筛选状态，需要更新筛选数据
						if (sheet.config.filtered && sheet.config.filtered.length > 0) {
							// 使用静默模式重新执行筛选，避免闪烁
							const currentFiltered = [...sheet.config.filtered]
							await sheet.hooks.toolsHook.filterByCheckedSilent(currentFiltered)
						}

						asycnUndo()
						await nextTick()
						// ✅ 修复：Object.assign 已经恢复了 rowCount，不需要再减少
						// sheet.config.rowCount 已经被恢复到添加行之前的值
						console.log('撤销添加行', state)
						// state.addRow = null
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
								console.log('撤销添加列', state)

								rowData.splice(state.addCol.c, state.addCol.cs)
							}
						)

						// 如果当前处于筛选状态，需要更新筛选数据
						if (sheet.config.filtered && sheet.config.filtered.length > 0) {
							// 使用静默模式重新执行筛选，避免闪烁
							const currentFiltered = [...sheet.config.filtered]
							await sheet.hooks.toolsHook.filterByCheckedSilent(currentFiltered)
						}

						// 协同通知:撤销添加列
						asycnUndo()
						await nextTick()
						// ✅ 修复：Object.assign 已经恢复了 colCount，不需要再减少
						// sheet.config.colCount 已经被恢复到添加列之前的值
						state.addCol = null
					} catch (error) {
						console.error('撤销添加列失败:', error)
					}
				}

				// 撤销删除行
				if (state.removeRow && state.removeRow.size > 0) {
					try {
						// ✅ 修复：正确处理多行删除的撤销
						// 转换 buffer 数据
						state.removeRow.forEach((value, key) => {
							state.removeRow.set(key, {
								rowData: useBufferToStringArray(value.rowData),
								deleteCount: value.deleteCount,
							})
						})
						console.log('撤销删除行', state, sheet.celldata)

						// 找出删除的起始行和行数
						let minDeletedRow = Infinity
						let deleteCount = 0
						state.removeRow.forEach((value, key) => {
							const rowIndex = parseInt(key)
							minDeletedRow = Math.min(minDeletedRow, rowIndex)
							deleteCount = value.deleteCount // 所有被删除的行都有相同的 deleteCount
						})

						console.log('撤销删除行信息:', {
							minDeletedRow,
							deleteCount,
							deletedRowsCount: state.removeRow.size,
						})

						// ✅ 关键修复：先移动后续的行，再恢复被删除的行
						// 这样可以避免覆盖问题
						// 第一步：移动后续的行（从后向前，避免覆盖）
						const rowsToMove = []
						sheet.celldata.forEach((rowData, rowIndex) => {
							if (typeof rowIndex === 'number' && rowIndex >= minDeletedRow) {
								rowsToMove.push({
									oldIndex: rowIndex,
									newIndex: rowIndex + deleteCount,
									data: rowData,
								})
							}
						})

						// 从后向前移动，避免覆盖
						rowsToMove.sort((a, b) => b.oldIndex - a.oldIndex)
						rowsToMove.forEach(({oldIndex, newIndex, data}) => {
							sheet.celldata.set(newIndex, data)
							sheet.celldata.delete(oldIndex)
							console.log(`移动行 ${oldIndex} 到 ${newIndex}`)
						})

						// 第二步：恢复所有被删除的行
						state.removeRow.forEach((value, key) => {
							const rowIndex = parseInt(key)
							sheet.celldata.set(rowIndex, value.rowData)
							console.log(`恢复被删除的行 ${rowIndex}`)
						})

						// 更新 sheet.celldata
						state.removeRow.clear()

						// 筛选状态已经在前面恢复，不需要重新筛选

						// 优化：撤销删除行后清理缓存，提高后续操作性能
						if (sheet.hooks?.selectionRangeHook?.clearCache) {
							sheet.hooks.selectionRangeHook.clearCache()
						}

						// 协同通知:撤销删除行
						asyncUndo()
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
									deletedRowCols[0]
										.split(',')
										.reverse()
										.forEach((col) => {
											rowData.splice(startCol, 0, col)
										})

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

						// 协同通知:撤销删除列
						asyncUndo()
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
				// 协同通知:同步配置更新
				if (
					sheet.config.synergy &&
					!state.addRow &&
					!state.addCol &&
					state.removeRow.size === 0 &&
					state.removeCol.size === 0
				) {
					sheet.hooks.toolsHook.asyncUpdateConfig(0, null, null)
				}

				callback?.()
			} catch (error) {
				console.error('处理数据时出错:', error)
			} finally {
				// sheet.state.loading = false
			}
		}
	}

	// 判断是否可以撤销/重做
	const canUndo = () => sheet.history.size > 0

	const destroy = () => {
		sheet.history.clear()
		sheet = null
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
