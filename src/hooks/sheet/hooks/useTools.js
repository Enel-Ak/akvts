import {ref, nextTick, reactive} from 'vue'
import useGuid from '@/hooks/useGuid'
import {ElMessage} from 'element-plus'
import {useAirSheetStore} from '../store/useAirSheet'

export const useTools = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = ''
	let sheet = null
	// const {
	// 	sheet,
	// 	limit,
	// 	loading,
	// 	loadingText,
	// 	loadingProgress,
	// 	containerRef,
	// 	useEditHook,
	// 	useExcelHook,
	// 	useResizeHook,
	// 	useHistoryHook,
	// 	useMergedCellsHook,
	// 	useSelectionRangeHook,
	// 	isLocked,
	// 	renderRange,
	// 	processMapInBatches,
	// } = config

	const isLocked = () => {
		const {r, c} = sheet.hooks.selectionRangeHook.getRanged()
		return !!sheet.config.locked[`${r}-${c}`]
	}

	// 批量设置单元格样式, 工具栏共用, 设置框选范围样式
	const setCellStyles = (type, val, fn, save = true) => {
		if (isLocked()) {
			return
		}

		if (save) {
			sheet.hooks.historyHook.save()
		}

		const ranged = sheet.hooks.selectionRangeHook.getRanged()
		const {r, c, rr, cc} = ranged

		for (let i = r; i <= rr; i++) {
			for (let j = c; j <= cc; j++) {
				if (fn && typeof fn === 'function') {
					fn(i, j, {r, c, rr, cc})
				} else {
					if (!sheet.config.styled[`${i}-${j}`]) {
						sheet.config.styled[`${i}-${j}`] = {}
					}

					if (
						sheet.config.styled[`${i}-${j}`][type] &&
						sheet.config.styled[`${i}-${j}`][type] === val
					) {
						delete sheet.config.styled[`${i}-${j}`][type]
						continue
					}
					sheet.config.styled[`${i}-${j}`][type] = val
				}
			}
		}
	}

	// 设置单元格样式, 指定单元格
	const setCellStyle = ({type, value, row, col, rowspan = 1, colspan = 1}) => {
		if (isLocked()) {
			return
		}

		for (let i = row; i < row + rowspan; i++) {
			for (let j = col; j < col + colspan; j++) {
				if (!sheet.config.styled[`${i}-${j}`]) {
					sheet.config.styled[`${i}-${j}`] = {}
				}
				sheet.config.styled[`${i}-${j}`][type] = value
			}
		}
	}

	// 设置字体
	const setFont = (e) => {
		const font = e.target.value
		setCellStyles('ff', font)
	}

	// 设置字体大小
	const setFontSize = (e, containerRef) => {
		const size = e.target.value
		setCellStyles('fs', size)
		setTimeout(() => {
			const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
			if (!r) return

			// 更新每一行的高度
			for (let row = r; row <= rr; row++) {
				const rowCells = Array.from(
					containerRef.querySelectorAll(`[data-cell^="${row}-"]`)
				).filter((cell) => {
					const col = parseInt(cell.dataset.cell.split('-')[1])
					return col >= c && col <= cc
				})

				const maxHeight = Math.max(
					...rowCells.map((cell) =>
						Array.from(cell.childNodes).reduce((h, node) => h + node.offsetHeight, 0)
					)
				)
				if (maxHeight > sheet.hooks.resizeHook.getRowHeight(row)) {
					sheet.hooks.resizeHook.setRowHeight(row, maxHeight)
				}
			}

			sheet.hooks.selectionRangeHook.setRange(r, c, rr, cc, true)
		}, 151)
	}

	// 设置单元格格式
	const setFormat = (e, containerRef) => {
		const format = e.target.value
		setCellStyles('fmt', format)

		const cell = sheet.hooks.selectionRangeHook.getStartCell()
		const el = containerRef.querySelector(`[data-cell="${cell.r}-${cell.c}"]`)

		if (el) {
			sheet.hooks.editHook.setCellFormat(el.innerText, cell.r, cell.c, true, el)
		}
	}

	// 设置字体颜色
	let fontSaved = false
	let fillColorTimer = null
	const setFontColor = (e) => {
		clearTimeout(fillColorTimer)
		fillColorTimer = setTimeout(() => {
			if (!fontSaved) {
				sheet.hooks.historyHook.save()
				fontSaved = true
			}
			const color = e.target.value
			setCellStyles('fc', color, null, false)
		}, 128)
	}
	const fontColorChanged = (e) => {
		fontSaved = false
	}

	// 设置单元格背景色
	let fillSaved = false
	const setFillColor = (e) => {
		clearTimeout(fillColorTimer)
		fillColorTimer = setTimeout(() => {
			if (!fillSaved) {
				sheet.hooks.historyHook.save()
				fillSaved = true
			}
			const color = e.target.value
			setCellStyles('bg', color, null, false)
		}, 128)
	}
	const fillColorChanged = (e) => {
		fillSaved = false
	}

	// 设置边框颜色
	let borderSaved = false
	const setBorderColor = (e) => {
		if (!borderSaved) {
			useHistoryHook.saveHistory()
			borderSaved = true
		}
		const color = e.target.value
		setCellStyles(
			'bc',
			color,
			(r, c) => {
				const style = sheet.config.styled[`${r}-${c}`]

				if (style && (style.b || style.bt || style.bb || style.bl || style.br)) {
					if (style.b) {
						sheet.config.styled[`${r}-${c}`]['btc'] = color
						sheet.config.styled[`${r}-${c}`]['brc'] = color
						sheet.config.styled[`${r}-${c}`]['blc'] = color
						sheet.config.styled[`${r}-${c}`]['bbc'] = color
					} else {
						if (style.bt) {
							sheet.config.styled[`${r}-${c}`]['btc'] = color
						}
						if (style.bb) {
							sheet.config.styled[`${r}-${c}`]['bbc'] = color
						}
						if (style.bl) {
							sheet.config.styled[`${r}-${c}`]['blc'] = color
						}
						if (style.br) {
							sheet.config.styled[`${r}-${c}`]['brc'] = color
						}
					}
				}
			},
			false
		)
	}
	const borderColorChanged = () => {
		borderSaved = false
	}

	// 合并
	const setMerge = () => {
		if (isLocked()) {
			return
		}

		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()

		if (r === null || r === undefined) return
		sheet.hooks.historyHook.save()

		sheet.hooks.mergeHook.setMerge(r, c, rr - r, cc - c)
	}

	// 边框
	const setBorder = (border = true, direction = null, save = true) => {
		const handleBorder = (r, c) => {
			// 删除边框样式
			if (!border && !direction) {
				// 无边框
				if (sheet.config.styled[`${r}-${c}`]) {
					delete sheet.config.styled[`${r}-${c}`].b
					delete sheet.config.styled[`${r}-${c}`].bt
					delete sheet.config.styled[`${r}-${c}`].bb
					delete sheet.config.styled[`${r}-${c}`].bl
					delete sheet.config.styled[`${r}-${c}`].br
					delete sheet.config.styled[`${r}-${c}`].btc
					delete sheet.config.styled[`${r}-${c}`].brc
					delete sheet.config.styled[`${r}-${c}`].blc
					delete sheet.config.styled[`${r}-${c}`].bbc

					// 如果没有其他样式，删除整个样式对象
					if (Object.keys(sheet.config.styled[`${r}-${c}`]).length === 0) {
						delete sheet.config.styled[`${r}-${c}`]
					}
				}
				return
			}

			// 点边框时删除其他边框
			if (border && !direction) {
				try {
					delete sheet.config.styled[`${r}-${c}`].bt
					delete sheet.config.styled[`${r}-${c}`].bb
					delete sheet.config.styled[`${r}-${c}`].bl
					delete sheet.config.styled[`${r}-${c}`].br
				} catch {}
			}

			// 如果没有cellStyle对象，创建一个
			if (!sheet.config.styled[`${r}-${c}`]) {
				sheet.config.styled[`${r}-${c}`] = {}
			}

			// 创建一个映射来跟踪每个单元格
			const cellMap = {}
			Object.entries(sheet.config.styled).forEach(([key, value]) => {
				const [r, c] = key.split('-').map(Number)
				if (value.bt || value.bb || value.bl || value.br) {
					cellMap[`${r}-${c}`] = true
				}
			})

			// 使用精确的边框定义，指定每个边的边框
			const borderTop = !cellMap[`${r - 1}-${c}`]
			const borderRight = !cellMap[`${r}-${c + 1}`]
			const borderBottom = !cellMap[`${r + 1}-${c}`]
			const borderLeft = !cellMap[`${r}-${c - 1}`]

			// 单边框
			if (direction) {
				if (direction === 'top') {
					sheet.config.styled[`${r}-${c}`].bt = true
				} else if (direction === 'bottom') {
					sheet.config.styled[`${r}-${c}`].bb = true
				} else if (direction === 'left') {
					sheet.config.styled[`${r}-${c}`].bl = true
				} else if (direction === 'right') {
					sheet.config.styled[`${r}-${c}`].br = true
				}
				return
			}

			// 设置每个边的边框
			if (borderTop) {
				sheet.config.styled[`${r}-${c}`].bt = true
			}

			if (borderLeft) {
				sheet.config.styled[`${r}-${c}`].bl = true
			}

			sheet.config.styled[`${r}-${c}`].br = true
			sheet.config.styled[`${r}-${c}`].bb = true
		}
		setCellStyles('', null, (r, c) => handleBorder(r, c), save)
	}

	// 对齐
	const setAlign = (align) => {
		setCellStyles('align', align)
	}

	// 加粗
	const setBold = () => {
		setCellStyles('bold', true)
	}

	// 斜体
	const setItalic = () => {
		setCellStyles('it', true)
	}

	// 下划线
	const setUnderline = () => {
		setCellStyles('un', true)
	}

	// 删除线
	const setStrikethrough = () => {
		setCellStyles('st', true)
	}

	// 添加行
	const addRowCount = ref(1)
	const addRow = async (_, isEnd = false) => {
		if (!sheet.config.addRow) {
			ElMessage.warning('请先在配置中开启添加行功能')
			return
		}

		if (!addRowCount.value) {
			addRowCount.value = 1
		}

		const ranged = useSelectionRangeHook.ranged
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const insertRowIndex = isEnd ? sheet.config.rowCount : endRow + 1

		if (sheet.celldata.size >= limit) {
			loading.value = true
			loadingText.value = '正在处理数据...'
		}

		// 创建新的Map
		let newMap = new Map()

		try {
			await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					if (rowIndex < insertRowIndex) {
						newMap.set(rowIndex, rowData)
					} else {
						newMap.set(rowIndex + addRowCount.value, rowData)
					}
					newMap.set(insertRowIndex, reactive([]))
				}
			})

			// 处理合并单元格
			const mergedCells = useMergedCellsHook.getMergedCells()
			const newMergedCells = new Map()

			for (const [key, value] of Object.entries(mergedCells)) {
				const [row, col] = key.split('-').map(Number)
				if (row >= insertRowIndex) {
					// 如果合并单元格在插入行之后，向下移动一行
					newMergedCells.set(`${row + addRowCount.value}-${col}`, value)
				} else {
					newMergedCells.set(key, value)
				}
			}

			// 更新合并单元格
			useMergedCellsHook.setMergeCells(newMergedCells)

			// 更新sheet.celldata
			sheet.celldata = new Map([...newMap].sort((a, b) => a[0] - b[0]))
			sheet.config.rowCount += addRowCount.value

			useHistoryHook.saveHistory(
				{
					rowIndex: insertRowIndex,
					rowspan: addRowCount.value,
				},
				'addRow'
			)
			renderRange()
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			loading.value = false
			loadingText.value = '处理完成'
		}
	}

	// 删除行
	const removeRow = async () => {
		if (!sheet.config.removeRow) {
			ElMessage.warning('请先在配置中开启删除行功能')
			return
		}
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		if (sheet.celldata.size >= limit) {
			loading.value = true
			loadingText.value = '正在处理数据...'
		}

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const deleteCount = endRow - startRow + 1
		const deletedRows = new Map()
		const newMap = new Map()

		try {
			await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					if (rowIndex < startRow) {
						newMap.set(rowIndex, rowData)
					} else if (rowIndex > endRow) {
						newMap.set(rowIndex - deleteCount, rowData)
					} else {
						deletedRows.set(`${rowIndex}`, {rowData, deleteCount})
					}
				}
			})

			// 保存历史
			useHistoryHook.saveHistory(deletedRows, 'removeRow')

			// 更新合并单元格的位置
			const mergedCells = sheet.config.mergedCells
			const newMergedCells = new Map()
			Object.keys(mergedCells).forEach((key) => {
				const [row, col] = key.split('-').map(Number)
				const {rowspan, colspan} = mergedCells[key]

				if (row < startRow) {
					// 在删除行之前的合并单元格
					if (row + rowspan > startRow) {
						// 如果合并单元格跨越了删除范围，需要减少 rowspan
						const overlap = Math.min(endRow - startRow + 1, row + rowspan - startRow)
						newMergedCells.set(key, {
							rowspan: rowspan - overlap,
							colspan,
						})
					} else {
						// 合并单元格完全在删除范围之前，保持不变
						newMergedCells.set(key, mergedCells[key])
					}
				} else if (row > endRow) {
					// 在删除行之后的合并单元格需要更新行号
					newMergedCells.set(`${row - deleteCount}-${col}`, {
						rowspan,
						colspan,
					})
				}
				// 如果合并单元格的起始位置在删除范围内，则不添加到新的 Map 中（相当于删除）
			})
			useMergedCellsHook.setMergeCells(newMergedCells)

			// 删除行相关的cellstyle
			for (let i = startRow; i <= endRow; i++) {
				Object.keys(sheet.config.styled).forEach((key) => {
					const [row] = key.split('-').map(Number)
					if (row === i) {
						delete sheet.config.styled[key]
					}
				})
			}

			// 更新sheet.celldata
			sheet.celldata = new Map([...newMap].sort((a, b) => a[0] - b[0]))
			sheet.config.rowCount = Math.max(0, sheet.config.rowCount - deleteCount)
			renderRange()
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			loading.value = false
			loadingText.value = '处理完成'
		}
	}

	// 添加列
	const addColumnCount = ref(1)
	const addColumn = async (_, isEnd = false) => {
		if (!sheet.config.addColumn) {
			ElMessage.warning('请先在配置中开启添加列功能')
			return
		}

		if (!addColumnCount.value) {
			addColumnCount.value = 1
		}

		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		if (sheet.celldata.size >= limit) {
			loading.value = true
			loadingText.value = '正在处理数据...'
		}

		const endCol = Math.max(ranged.start.col, ranged.end.col)
		const insertColIndex = isEnd ? sheet.config.colCount : endCol + 1
		const newMap = new Map()

		try {
			await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					// 创建新的行数据数组
					const newRowData = Array.from(rowData || [])

					// 在指定位置插入空值，根据addColumnCount插入多列
					for (let i = 0; i < addColumnCount.value; i++) {
						newRowData.splice(insertColIndex + i, 0, '')
					}

					// 更新到新Map
					newMap.set(rowIndex, reactive(newRowData))
				}
			})

			// 更新sheet.celldata
			sheet.celldata = newMap
			sheet.config.colCount += addColumnCount.value

			// 更新合并单元格
			const mergedCells = sheet.config.mergedCells
			const newMergedCells = new Map()
			Object.keys(mergedCells).forEach((key) => {
				const [row, col] = key.split('-').map(Number)
				const {rowspan, colspan} = mergedCells[key]

				if (col < insertColIndex) {
					// 在插入列之前的合并单元格保持不变
					newMergedCells.set(key, mergedCells[key])
				} else {
					// 在插入列之后的合并单元格需要更新列号
					newMergedCells.set(`${row}-${col + addColumnCount.value}`, {
						rowspan,
						colspan,
					})
				}
			})
			useMergedCellsHook.setMergeCells(newMergedCells)

			// 保存历史记录
			useHistoryHook.saveHistory(
				{
					colIndex: insertColIndex,
					colspan: addColumnCount.value,
				},
				'addCol'
			)

			renderRange()
		} catch (error) {
			console.error('添加列失败', error)
		} finally {
			loading.value = false
			loadingText.value = '处理完成'
		}
	}

	// 删除列
	const removeColumn = async () => {
		if (!sheet.config.removeColumn) {
			ElMessage.warning('请先在配置中开启删除列功能')
			return
		}
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		if (sheet.celldata.size >= limit) {
			loading.value = true
			loadingText.value = '正在处理数据...'
		}

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endCol = Math.max(ranged.start.col, ranged.end.col)
		const deleteCount = endCol - startCol + 1
		const deletedCols = new Map()
		const newMap = new Map()

		try {
			await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					const newRowData = []
					rowData.forEach((cellData, colIndex) => {
						if (colIndex < startCol) {
							newRowData[colIndex] = cellData
						} else if (colIndex > endCol) {
							newRowData[colIndex - deleteCount] = cellData
						} else {
							const row = deletedCols.get(rowIndex)
							if (row) {
								row.push({rowIndex, colIndex, value: cellData})
							} else {
								deletedCols.set(rowIndex, [{rowIndex, colIndex, value: cellData}])
							}
						}
					})
					newMap.set(rowIndex, reactive(newRowData))
				}
			})

			// 保存历史
			useHistoryHook.saveHistory(deletedCols, 'removeCol')

			// 更新合并单元格的位置
			const mergedCells = sheet.config.mergedCells
			const newMergedCells = new Map()
			Object.keys(mergedCells).forEach((key) => {
				const [row, col] = key.split('-').map(Number)
				const {rowspan, colspan} = mergedCells[key]

				if (col < startCol) {
					// 在删除列之前的合并单元格
					if (col + colspan > startCol) {
						// 如果合并单元格跨越了删除范围，需要减少 rowspan
						const overlap = Math.min(endCol - startCol + 1, col + colspan - startCol)
						newMergedCells.set(key, {
							rowspan,
							colspan: colspan - overlap,
						})
					} else {
						// 合并单元格完全在删除范围之前，保持不变
						newMergedCells.set(key, mergedCells[key])
					}
				} else if (col > endCol) {
					// 在删除列之后的合并单元格需要更新行号
					newMergedCells.set(`${row}-${col - deleteCount}`, {
						rowspan,
						colspan,
					})
				}
			})
			useMergedCellsHook.setMergeCells(newMergedCells)

			// 删除列相关的cellstyle
			for (let i = startCol; i <= endCol; i++) {
				Object.keys(sheet.config.styled).forEach((key) => {
					const [_, col] = key.split('-').map(Number)
					if (col === i) {
						delete sheet.config.styled[key]
					}
				})
			}

			// 更新sheet.celldata和其他相关操作
			sheet.celldata = newMap
			sheet.config.colCount = Math.max(0, sheet.config.colCount - deleteCount)
			useSelectionRangeHook.setRange(startRow, startCol - 1, endRow, startCol - 1)
			renderRange()
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			loading.value = false
			loadingText.value = '处理完成'
		}
	}

	// 导入Excel
	const importExcel = async (event) => {
		if (!sheet.config.import) {
			ElMessage.warning('当前表格不支持导入')
			return
		}
		const file = event.target.files[0]
		if (!file) return
		sheet.celldata.clear()
		const result = await useExcelHook.readExcelFile(file)
		if (result.success) {
			event.target.value = null
			renderRange()
		}
	}

	// 导出Excel
	const exportExcel = async () => {
		if (!sheet.config.export) {
			ElMessage.warning('当前表格不支持导出')
			return
		}
		const name = Date.now()
		const result = await useExcelHook.exportExcel(`${name}.xlsx`)
		if (result.success) {
		}
	}

	// 锁定
	const setLocked = () => {
		if (!sheet.config.locked) {
			ElMessage.warning('当前表格不支持锁定')
			return
		}
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				sheet.config.lockCells[`${row}-${col}`] = true
			}
		}
		ElMessage.success(`已锁定`)
	}

	// 解锁
	const setUnlocked = () => {
		if (!sheet.config.unlock) {
			ElMessage.warning('当前表格不支持解锁')
			return
		}
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				delete sheet.config.lockCells[`${row}-${col}`]
			}
		}
		ElMessage.success(`已解锁`)
	}

	// 冻结
	const freezeRow = ref(1)
	const freezeCol = ref(1)
	const setFreeze = (r, c) => {}

	const clearAll = () => {
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		useHistoryHook.saveHistory()

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		let lockTimer = null
		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				if (sheet.config.lockCells[`${row}-${col}`]) {
					clearTimeout(lockTimer)
					lockTimer = setTimeout(() => ElMessage.warning('单元格已锁定'), 16)
					continue
				}
				delete sheet.config.styled[`${row}-${col}`]
				delete sheet.config.formulaed[`${row}-${col}`]
			}
		}
	}

	// 解析Excel单元格引用格式(如 "C1:D1" 或 "1-4")，返回起始和结束的行列索引
	const parseCellRange = (range) => {
		// 解析列标识(A,B,C等)为数字索引(0,1,2等)
		const colToIndex = (col) => {
			let index = 0
			for (let i = 0; i < col.length; i++) {
				index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0))
			}
			return index
		}

		// 数字索引转Excel列标识(0->A, 1->B, etc)
		const indexToCol = (index) => {
			index = Math.max(0, index) // 确保不会出现负数
			let col = ''
			do {
				col = String.fromCharCode((index % 26) + 'A'.charCodeAt(0)) + col
				index = Math.floor(index / 26) - 1
			} while (index >= 0)
			return col || 'A' // 如果是0，返回'A'
		}

		// 尝试匹配数字格式 (如 "0-0"，第一个数字是行号，第二个数字是列号)
		const numberPattern = /^(\d+)-(\d+)$/
		const numberMatch = range.match(numberPattern)
		if (numberMatch) {
			const [, row, col] = numberMatch
			const rowNumber = parseInt(row) + 1 // 转为1基数
			const colLetter = indexToCol(parseInt(col)) // 转换列号为字母

			return {
				start: {
					row: parseInt(row), // 保持0基数
					col: parseInt(col), // 保持0基数
				},
				end: {
					row: parseInt(row), // 保持0基数
					col: parseInt(col), // 保持0基数
				},
				format: {
					start: colLetter,
					end: colLetter,
				},
				sqref: `${colLetter}${rowNumber}:${colLetter}${rowNumber}`, // Excel格式使用1基数
			}
		}

		// 匹配单个单元格格式 (如 "A1", "B2")
		const singleCellPattern = /^([A-Z]+)(\d+)$/
		const singleCellMatch = range.match(singleCellPattern)
		if (singleCellMatch) {
			const [, col, row] = singleCellMatch
			return {
				start: {
					row: parseInt(row) - 1, // 转为0基数
					col: colToIndex(col),
				},
				end: {
					row: parseInt(row) - 1, // 转为0基数
					col: colToIndex(col),
				},
				format: {
					start: col,
					end: col,
				},
				sqref: `${col}${row}:${col}${row}`, // 保持原始Excel格式
			}
		}

		// 匹配Excel格式 (如 "C1:D1")
		const pattern = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/
		let match = range.match(pattern)
		if (!match) {
			if (!match) {
				throw new Error(
					'无效的单元格范围格式，正确格式例如: "A1:B2" 或 "0-0"（第一个数字是行号，第二个数字是列号）' +
						range
				)
			}
		}

		const [, startCol, startRow, endCol, endRow] = match

		return {
			start: {
				row: parseInt(startRow) - 1, // 转为0基数
				col: colToIndex(startCol),
			},
			end: {
				row: parseInt(endRow) - 1, // 转为0基数
				col: colToIndex(endCol),
			},
			format: {
				start: startCol,
				end: endCol,
			},
			sqref: `${startCol}${startRow}:${endCol}${endRow}`, // 保持原始Excel格式
		}
	}

	// luckysheet转air
	const luckyToAir = (config, data) => {
		return new Promise((resolve, reject) => {
			try {
				const total = data.length
				const celldata = []
				const style = {}
				const mergedCells = {}

				let processed = 0
				const batchSize = 3000

				if (config) {
					// 合并单元格处理
					if (config.merge) {
						Object.entries(config.merge).forEach(([key, value]) => {
							mergedCells[`${value.r}-${value.c}`] = {
								rowspan: value.rs,
								colspan: value.cs,
							}
						})
					}

					// 边框处理
					if (config.borderInfo) {
						// 创建一个映射来跟踪每个单元格
						const cellMap = {}
						config.borderInfo.forEach((item) => {
							if (item.rangeType && item.rangeType === 'cell') {
								const r = item.value.row_index
								const c = item.value.col_index
								cellMap[`${r}-${c}`] = true
							} else if (item.rangeType && item.rangeType === 'range') {
								item.range.forEach((r) => {
									const [startRow, endRow] = r.row
									const [startCol, endCol] = r.column

									for (let row = startRow; row <= endRow; row++) {
										for (let col = startCol; col <= endCol; col++) {
											cellMap[`${row}-${col}`] = true
											config.borderInfo.push({
												rangeType: 'cell',
												value: {
													row_index: row,
													col_index: col,
												},
											})
										}
									}
								})
							}
						})

						config.borderInfo.forEach((item) => {
							if (item.value) {
								const r = item.value.row_index
								const c = item.value.col_index

								if (!style[`${r}-${c}`]) {
									style[`${r}-${c}`] = {}
								}

								// 使用精确的边框定义，指定每个边的边框
								const borderTop = !cellMap[`${r - 1}-${c}`]
								const borderRight = !cellMap[`${r}-${c + 1}`]
								const borderBottom = !cellMap[`${r + 1}-${c}`]
								const borderLeft = !cellMap[`${r}-${c - 1}`]

								// 设置每个边的边框
								if (borderTop) {
									style[`${r}-${c}`].bt = true
								}

								if (borderLeft) {
									style[`${r}-${c}`].bl = true
								}

								style[`${r}-${c}`].br = true
								style[`${r}-${c}`].bb = true

								// 设置边框颜色（如果需要）
								if (borderTop || borderRight || borderBottom || borderLeft) {
									// style[`${r}-${c}`].bc = '#000000' // 边框颜色
								}
							}
						})
					}

					// 处理锁定单元格
					if (
						config.authority &&
						config.authority.allowRangeList &&
						config.authority.allowRangeList.length > 0
					) {
						try {
							config.authority.allowRangeList.forEach((item) => {
								if (!item.sqref.includes('$')) {
									const {start, end} = parseCellRange(item.sqref)
									const startRow = Math.min(start.row, end.row)
									const startCol = Math.min(start.col, end.col)
									const endRow = Math.max(start.row, end.row)
									const endCol = Math.max(start.col, end.col)
									for (let row = startRow; row <= endRow; row++) {
										for (let col = startCol; col <= endCol; col++) {
											sheet.config.lockCells[`${row}-${col}`] = true
										}
									}
								}
							})
						} catch (e) {}
					}
				}

				function processBatch() {
					const start = performance.now()
					let count = 0

					while (
						processed < total &&
						count < batchSize &&
						performance.now() - start < 16
					) {
						const item = data[processed]

						if (!celldata[item.r]) {
							celldata[item.r] = []
						}
						celldata[item.r][item.c] = item.v.v

						if (!style[item.r + '-' + item.c]) {
							style[item.r + '-' + item.c] = {}
						}

						// 背景
						if (item?.v?.bg) {
							style[item.r + '-' + item.c]['bg'] = item.v.bg
						}

						// 粗体
						if (item?.v?.bl) {
							style[item.r + '-' + item.c]['bold'] = true
						}

						// 斜体
						if (item?.v?.it) {
							style[item.r + '-' + item.c]['it'] = true
						}

						// 下划线
						if (item?.v?.un) {
							style[item.r + '-' + item.c]['un'] = true
						}

						// 删除线
						if (item?.v?.st) {
							style[item.r + '-' + item.c]['st'] = true
						}

						// 颜色
						if (item?.v?.fc) {
							style[item.r + '-' + item.c]['fc'] = item.v.fc
						}

						// 字体大小
						if (item?.v?.fs) {
							const size = parseInt(item.v.fs)
							style[item.r + '-' + item.c]['fs'] = parseInt(size)
						}

						// 字体
						if (item?.v?.ff) {
							style[item.r + '-' + item.c]['ff'] = item.v.ff
						}

						// 对齐
						if (item?.v?.ht) {
							const ht = Number(item.v.ht)
							let align = 'left'
							if (ht === 0) {
								align = 'center'
							} else if (ht === 2) {
								align = 'right'
							}
							style[item.r + '-' + item.c]['align'] = align
						}

						processed++
						count++
					}

					loadingText.value = `数据转换中...`
					loadingProgress.value = Math.floor((processed / total) * 100)

					if (processed < total) {
						requestAnimationFrame(processBatch)
					} else {
						loadingProgress.value = 100
						loading.value = false
						renderRange()
						resolve({
							config: {
								style,
								mergedCells,
							},
							celldata,
						})
					}
				}
				requestAnimationFrame(processBatch)
			} catch (e) {
				reject(e)
			}
		})
	}

	// air转luckysheet
	const airToLucky = async (sheet) => {
		const merge = {}
		const authority = {
			allowRangeList: [],
		}
		const borderInfo = []
		const celldata = []

		// 合并单元格
		Object.entries(sheet.config.mergedCells).forEach(([key, value]) => {
			const [r, c] = key.split('-').map(Number)
			merge[`${r}_${c}`] = {
				r,
				c,
				rs: value.rowspan,
				cs: value.colspan,
			}
		})

		// 锁定单元格处理
		Object.entries(sheet.config.lockCells).forEach(([key, value]) => {
			const range = parseCellRange(key)
			authority.allowRangeList.push({
				sqref: range.sqref,
				password: useGuid(),
				name: 'NotEditableDiy',
				hintText: '单元格不可编辑!',
				algorithmName: 'None',
				saltValue: null,
			})
		})

		// 单元格数据
		loading.value = true
		loadingText.value = '数据转换中...'

		await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
			const cells = []
			if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
				rowData.forEach((cell, colIndex) => {
					const data = {r: rowIndex, c: colIndex, v: {v: cell}}
					const style = sheet.config.styled[rowIndex + '-' + colIndex]

					if (style) {
						// 背景
						if (style?.bg) {
							data.v.bg = style?.bg
						}

						// 粗体
						if (style?.bold) {
							data.v.bl = 1
						}

						// 斜体
						if (style?.it) {
							data.v.it = 1
						}

						// 下划线
						if (style?.un) {
							data.v.un = 1
						}

						// 删除线
						if (style?.st) {
							data.v.st = 1
						}

						// 颜色
						if (style?.fc) {
							data.v.fc = style?.fc
						}

						// 字体大小
						if (style?.fs) {
							data.v.fs = parseInt(style?.fs)
						}

						// 字体
						if (style?.ff) {
							data.v.ff = style?.ff
						}

						// 对齐
						if (style?.align) {
							let ht = 1 // 左对齐
							if (style?.align === 'center') {
								ht = 0 // 居中对齐
							} else if (style?.align === 'right') {
								ht = 2 // 右对齐
							}
							data.v.ht = ht
						}

						// 边框
						if (style?.b || style?.bt || style?.bb || style?.bl || style?.br) {
							let border = {
								rangeType: 'cell',
								value: {
									row_index: rowIndex,
									col_index: colIndex,
								},
							}

							if (style?.bt) {
								Object.assign(border.value, {
									t: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.bb) {
								Object.assign(border.value, {
									b: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.bl) {
								Object.assign(border.value, {
									l: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.br) {
								Object.assign(border.value, {
									r: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}
							borderInfo.push(border)
						}
					}
					cells.push(data)
				})
				celldata.push(cells)
			}
		})
		loading.value = false

		return Promise.resolve({
			merge,
			authority,
			borderInfo,
			celldata,
		})
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => console.log('installed useTools'), 16)
		return {
			setCellStyle,

			setFont,
			setFontSize,
			setFormat,
			setFontColor,
			fontColorChanged,
			setFillColor,
			fillColorChanged,
			setBorderColor,
			borderColorChanged,

			setBold,
			setItalic,
			setUnderline,
			setStrikethrough,
			setMerge,
			setBorder,
			setAlign,

			freezeRow,
			freezeCol,
			setFreeze,

			addRowCount,
			addRow,
			removeRow,

			addColumnCount,
			addColumn,
			removeColumn,

			importExcel,
			exportExcel,

			setLocked,
			setUnlocked,

			luckyToAir,
			airToLucky,

			clearAll,
		}
	}

	return {
		init,
	}
}
