import {ref, nextTick, reactive} from 'vue'
import useGuid from '@/hooks/useGuid'
import {ElMessage} from 'element-plus'

export const useTools = (config) => {
	const {
		sheet,
		limit,
		loading,
		loadingText,
		loadingProgress,
		containerRef,
		useExcelHook,
		useResizeHook,
		useHistoryHook,
		useMergedCellsHook,
		useSelectionRangeHook,
		isLocked,
		renderRange,
		processMapInBatches,
	} = config

	// 预置字体列表
	const fonts = {
		宋体: 'FZSSJW, sans-serif',
		楷体: 'FZKTJW, sans-serif',
		黑体: 'FZHTJW, sans-serif',
		Arial: 'Arial, sans-serif',
		Helvetica: 'Helvetica, sans-serif',
		'Courier New': 'Courier New, sans-serif',
	}
	const fontSize = [12, 13, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]

	const formatList = {
		常规: 'normal',
		'短日期(yyyy/MM/dd)': 'shortDate',
		'长日期(yyyy年MM月dd日)': 'longDate',
		'时间(HH:mm:ss)': 'time',
	}

	// 批量设置单元格样式, 工具栏共用, 设置框选范围样式
	const setCellStyles = (type, val, fn, save = true) => {
		if (isLocked()) {
			return
		}

		if (save) {
			useHistoryHook.saveHistory()
		}

		const ranged = useSelectionRangeHook.ranged
		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		for (let i = startRow; i <= endRow; i++) {
			for (let j = startCol; j <= endCol; j++) {
				if (fn && typeof fn === 'function') {
					fn(i, j, {startRow, startCol, endRow, endCol})
				} else {
					if (!sheet.config.cellStyle[`${i}-${j}`]) {
						sheet.config.cellStyle[`${i}-${j}`] = {}
					}

					if (
						sheet.config.cellStyle[`${i}-${j}`][type] &&
						sheet.config.cellStyle[`${i}-${j}`][type] === val
					) {
						delete sheet.config.cellStyle[`${i}-${j}`][type]
						continue
					}
					sheet.config.cellStyle[`${i}-${j}`][type] = val
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
				if (!sheet.config.cellStyle[`${i}-${j}`]) {
					sheet.config.cellStyle[`${i}-${j}`] = {}
				}
				sheet.config.cellStyle[`${i}-${j}`][type] = value
			}
		}
	}

	// 设置字体
	const setFont = (e) => {
		const font = e.target.value
		setCellStyles('ff', font)
	}

	// 设置字体大小
	const setFontSize = (e) => {
		const size = e.target.value
		setCellStyles('fs', size)
		setTimeout(() => {
			const ranged = useSelectionRangeHook.ranged
			if (!ranged) return

			const {start, end} = ranged
			const [startRow, endRow] = [Math.min(start.row, end.row), Math.max(start.row, end.row)]
			const [startCol, endCol] = [Math.min(start.col, end.col), Math.max(start.col, end.col)]

			// 更新每一行的高度
			for (let row = startRow; row <= endRow; row++) {
				const rowCells = Array.from(
					containerRef.value.querySelectorAll(`[data-cell^="${row}-"]`)
				).filter((cell) => {
					const col = parseInt(cell.dataset.cell.split('-')[1])
					return col >= startCol && col <= endCol
				})

				const maxHeight = Math.max(
					...rowCells.map((cell) =>
						Array.from(cell.childNodes).reduce((h, node) => h + node.offsetHeight, 0)
					)
				)
				if (maxHeight > useResizeHook.getRowHeight(row)) {
					useResizeHook.setRowHeight(row, maxHeight)
				}
			}

			useSelectionRangeHook.setRange(startRow, startCol, endRow, endCol, true)
		}, 151)
	}

	// 设置单元格格式
	const setFormat = (e) => {
		const format = e.target.value
		setCellStyles('fmt', format)
	}

	// 设置字体颜色
	let fontSaved = false
	const setFontColor = (e) => {
		if (!fontSaved) {
			useHistoryHook.saveHistory()
			fontSaved = true
		}
		const color = e.target.value
		setCellStyles('fc', color, null, false)
	}
	const fontColorChanged = (e) => {
		fontSaved = false
	}

	// 设置单元格背景色
	let fillSaved = false
	const setFillColor = (e) => {
		if (!fillSaved) {
			useHistoryHook.saveHistory()
			fillSaved = true
		}
		const color = e.target.value
		setCellStyles('bg', color, null, false)
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
				const cellStyle = sheet.config.cellStyle[`${r}-${c}`]

				if (
					cellStyle &&
					(cellStyle.b || cellStyle.bt || cellStyle.bb || cellStyle.bl || cellStyle.br)
				) {
					if (cellStyle.b) {
						sheet.config.cellStyle[`${r}-${c}`]['btc'] = color
						sheet.config.cellStyle[`${r}-${c}`]['brc'] = color
						sheet.config.cellStyle[`${r}-${c}`]['blc'] = color
						sheet.config.cellStyle[`${r}-${c}`]['bbc'] = color
					} else {
						if (cellStyle.bt) {
							sheet.config.cellStyle[`${r}-${c}`]['btc'] = color
						}
						if (cellStyle.bb) {
							sheet.config.cellStyle[`${r}-${c}`]['bbc'] = color
						}
						if (cellStyle.bl) {
							sheet.config.cellStyle[`${r}-${c}`]['blc'] = color
						}
						if (cellStyle.br) {
							sheet.config.cellStyle[`${r}-${c}`]['brc'] = color
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
		useHistoryHook.saveHistory()
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		useMergedCellsHook.setMergeCell(
			startRow,
			startCol,
			endRow - startRow + 1,
			endCol - startCol + 1
		)
	}

	// 边框
	const setBorder = (border = true, direction = null, save = true) => {
		const handleBorder = (r, c) => {
			// 删除边框样式
			if (!border && !direction) {
				// 无边框
				if (sheet.config.cellStyle[`${r}-${c}`]) {
					delete sheet.config.cellStyle[`${r}-${c}`].b
					delete sheet.config.cellStyle[`${r}-${c}`].bt
					delete sheet.config.cellStyle[`${r}-${c}`].bb
					delete sheet.config.cellStyle[`${r}-${c}`].bl
					delete sheet.config.cellStyle[`${r}-${c}`].br
					delete sheet.config.cellStyle[`${r}-${c}`].btc
					delete sheet.config.cellStyle[`${r}-${c}`].brc
					delete sheet.config.cellStyle[`${r}-${c}`].blc
					delete sheet.config.cellStyle[`${r}-${c}`].bbc

					// 如果没有其他样式，删除整个样式对象
					if (Object.keys(sheet.config.cellStyle[`${r}-${c}`]).length === 0) {
						delete sheet.config.cellStyle[`${r}-${c}`]
					}
				}
				return
			}

			// 点边框时删除其他边框
			if (border && !direction) {
				try {
					delete sheet.config.cellStyle[`${r}-${c}`].bt
					delete sheet.config.cellStyle[`${r}-${c}`].bb
					delete sheet.config.cellStyle[`${r}-${c}`].bl
					delete sheet.config.cellStyle[`${r}-${c}`].br
				} catch {}
			}

			// 如果没有cellStyle对象，创建一个
			if (!sheet.config.cellStyle[`${r}-${c}`]) {
				sheet.config.cellStyle[`${r}-${c}`] = {}
			}

			// 创建一个映射来跟踪每个单元格
			const cellMap = {}
			Object.entries(sheet.config.cellStyle).forEach(([key, value]) => {
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
					sheet.config.cellStyle[`${r}-${c}`].bt = true
				} else if (direction === 'bottom') {
					sheet.config.cellStyle[`${r}-${c}`].bb = true
				} else if (direction === 'left') {
					sheet.config.cellStyle[`${r}-${c}`].bl = true
				} else if (direction === 'right') {
					sheet.config.cellStyle[`${r}-${c}`].br = true
				}
				return
			}

			// 设置每个边的边框
			if (borderTop) {
				sheet.config.cellStyle[`${r}-${c}`].bt = true
			}

			if (borderLeft) {
				sheet.config.cellStyle[`${r}-${c}`].bl = true
			}

			sheet.config.cellStyle[`${r}-${c}`].br = true
			sheet.config.cellStyle[`${r}-${c}`].bb = true
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
				if (rowIndex < insertRowIndex) {
					newMap.set(rowIndex, rowData)
				} else {
					newMap.set(rowIndex + addRowCount.value, rowData)
				}
				newMap.set(insertRowIndex, reactive([]))
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
				if (rowIndex < startRow) {
					newMap.set(rowIndex, rowData)
				} else if (rowIndex > endRow) {
					newMap.set(rowIndex - deleteCount, rowData)
				} else {
					deletedRows.set(`${rowIndex}`, {rowData, deleteCount})
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
				Object.keys(sheet.config.cellStyle).forEach((key) => {
					const [row] = key.split('-').map(Number)
					if (row === i) {
						delete sheet.config.cellStyle[key]
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
				// 创建新的行数据数组
				const newRowData = Array.from(rowData)

				// 在指定位置插入空值，根据addColumnCount插入多列
				for (let i = 0; i < addColumnCount.value; i++) {
					newRowData.splice(insertColIndex + i, 0, '')
				}

				// 更新到新Map
				newMap.set(rowIndex, reactive(newRowData))
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
							rowspan: rowspan,
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
				Object.keys(sheet.config.cellStyle).forEach((key) => {
					const [_, col] = key.split('-').map(Number)
					if (col === i) {
						delete sheet.config.cellStyle[key]
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
			console.log('Excel导入成功', sheet.celldata)
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
			console.log('Excel导出成功')
		}
	}

	// 锁定
	const setLocked = () => {
		if (!sheet.config.lock) {
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

		// 匹配Excel格式 (如 "C1:D1")
		const pattern = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/
		const match = range.match(pattern)
		if (!match) {
			throw new Error(
				'无效的单元格范围格式，正确格式例如: "A1:B2" 或 "0-0"（第一个数字是行号，第二个数字是列号）'
			)
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
				const cellStyle = {}
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

								if (!cellStyle[`${r}-${c}`]) {
									cellStyle[`${r}-${c}`] = {}
								}

								// 使用精确的边框定义，指定每个边的边框
								const borderTop = !cellMap[`${r - 1}-${c}`]
								const borderRight = !cellMap[`${r}-${c + 1}`]
								const borderBottom = !cellMap[`${r + 1}-${c}`]
								const borderLeft = !cellMap[`${r}-${c - 1}`]

								// 设置每个边的边框
								if (borderTop) {
									cellStyle[`${r}-${c}`].bt = true
								}

								if (borderLeft) {
									cellStyle[`${r}-${c}`].bl = true
								}

								cellStyle[`${r}-${c}`].br = true
								cellStyle[`${r}-${c}`].bb = true

								// 设置边框颜色（如果需要）
								if (borderTop || borderRight || borderBottom || borderLeft) {
									// cellStyle[`${r}-${c}`].bc = '#000000' // 边框颜色
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
							})
						} catch (e) {
							console.log(e)
						}
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

						if (!cellStyle[item.r + '-' + item.c]) {
							cellStyle[item.r + '-' + item.c] = {}
						}

						// 背景
						if (item?.v?.bg) {
							cellStyle[item.r + '-' + item.c]['bg'] = item.v.bg
						}

						// 粗体
						if (item?.v?.bl) {
							cellStyle[item.r + '-' + item.c]['bold'] = true
						}

						// 斜体
						if (item?.v?.it) {
							cellStyle[item.r + '-' + item.c]['it'] = true
						}

						// 下划线
						if (item?.v?.un) {
							cellStyle[item.r + '-' + item.c]['un'] = true
						}

						// 删除线
						if (item?.v?.st) {
							cellStyle[item.r + '-' + item.c]['st'] = true
						}

						// 颜色
						if (item?.v?.fc) {
							cellStyle[item.r + '-' + item.c]['fc'] = item.v.fc
						}

						// 字体大小
						if (item?.v?.fs) {
							const size = parseInt(item.v.fs)
							cellStyle[item.r + '-' + item.c]['fs'] = parseInt(size)
						}

						// 字体
						if (item?.v?.ff) {
							cellStyle[item.r + '-' + item.c]['ff'] = item.v.ff
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
							cellStyle[item.r + '-' + item.c]['align'] = align
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
								cellStyle,
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
			rowData.forEach((cell, colIndex) => {
				const data = {r: rowIndex, c: colIndex, v: {v: cell}}
				const cellstyle = sheet.config.cellStyle[rowIndex + '-' + colIndex]

				if (cellstyle) {
					// 背景
					if (cellstyle?.bg) {
						data.v.bg = cellstyle?.bg
					}

					// 粗体
					if (cellstyle?.bold) {
						data.v.bl = 1
					}

					// 斜体
					if (cellstyle?.it) {
						data.v.it = 1
					}

					// 下划线
					if (cellstyle?.un) {
						data.v.un = 1
					}

					// 删除线
					if (cellstyle?.st) {
						data.v.st = 1
					}

					// 颜色
					if (cellstyle?.fc) {
						data.v.fc = cellstyle?.fc
					}

					// 字体大小
					if (cellstyle?.fs) {
						data.v.fs = parseInt(cellstyle?.fs)
					}

					// 字体
					if (cellstyle?.ff) {
						data.v.ff = cellstyle?.ff
					}

					// 对齐
					if (cellstyle?.align) {
						let ht = 1 // 左对齐
						if (cellstyle?.align === 'center') {
							ht = 0 // 居中对齐
						} else if (cellstyle?.align === 'right') {
							ht = 2 // 右对齐
						}
						data.v.ht = ht
					}

					// 边框
					if (
						cellstyle?.b ||
						cellstyle?.bt ||
						cellstyle?.bb ||
						cellstyle?.bl ||
						cellstyle?.br
					) {
						let border = {
							rangeType: 'cell',
							value: {
								row_index: rowIndex,
								col_index: colIndex,
							},
						}

						if (cellstyle?.bt) {
							Object.assign(border.value, {
								t: {style: 1, color: 'rgb(0, 0, 0)'},
							})
						}

						if (cellstyle?.bb) {
							Object.assign(border.value, {
								b: {style: 1, color: 'rgb(0, 0, 0)'},
							})
						}

						if (cellstyle?.bl) {
							Object.assign(border.value, {
								l: {style: 1, color: 'rgb(0, 0, 0)'},
							})
						}

						if (cellstyle?.br) {
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
		})
		loading.value = false

		return Promise.resolve({
			merge,
			authority,
			borderInfo,
			celldata,
		})
	}

	return {
		fonts,
		fontSize,
		formatList,

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
	}
}
