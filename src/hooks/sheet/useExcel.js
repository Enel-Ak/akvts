import {ref} from 'vue'
import ExcelJS from 'exceljs'

export const useExcel = (config = {}) => {
	const {
		sheet,
		loading,
		loadingText,
		loadingProgress,
		useEditHook,
		useResizeHook,
		useMergedCellsHook,
		useSelectionRangeHook,
	} = config
	const importing = ref(false)
	const exporting = ref(false)

	// 处理单元格值
	const processCellValue = (cell) => {
		if (!cell || cell.value === undefined) {
			return ''
		}

		// 处理不同类型的单元格值
		switch (cell.type) {
			case ExcelJS.ValueType.String:
				return cell.text || ''
			case ExcelJS.ValueType.Number:
				return cell.value.toString()
			case ExcelJS.ValueType.Boolean:
				return cell.value.toString()
			case ExcelJS.ValueType.Date:
				return cell.value.toLocaleString()
			case ExcelJS.ValueType.Formula:
				// 优先使用计算结果
				if (cell.result !== undefined && cell.result !== null) {
					return cell.result.toString()
				}
				// 如果没有计算结果，使用公式值
				return cell.value.toString()
			case ExcelJS.ValueType.RichText:
				return cell.text || ''
			default:
				// 处理对象类型的值
				if (cell.value && typeof cell.value === 'object') {
					return cell.text || ''
				}
				return (cell.value || '').toString()
		}
	}

	// 分批处理数据
	const processBatch = (worksheet, rowCount, colCount, startRow, startCol, batchSize = 5000) => {
		return new Promise((resolve) => {
			let currentRow = 1
			let currentCol = 1
			const totalCells = rowCount * colCount
			let processedCells = 0

			// 预处理合并单元格信息，使用更高效的数据结构
			const mergeMap = new Map()
			if (worksheet._merges) {
				Object.entries(worksheet._merges).forEach(([key, merge]) => {
					if (typeof merge !== 'object' || !merge.top) return
					// 为每个被合并的单元格创建快速查找
					for (let r = merge.top; r <= merge.bottom; r++) {
						for (let c = merge.left; c <= merge.right; c++) {
							mergeMap.set(`${r}-${c}`, {
								isStart: r === merge.top && c === merge.left,
								top: merge.top,
								left: merge.left,
							})
						}
					}
				})
			}

			// 批量收集数据，减少DOM更新
			const batchData = []

			const processNextBatch = () => {
				let cellsInBatch = 0
				while (currentRow <= rowCount && cellsInBatch < batchSize) {
					const row = worksheet.getRow(currentRow)

					while (currentCol <= colCount && cellsInBatch < batchSize) {
						const cell = row.getCell(currentCol)
						const mergeInfo = mergeMap.get(`${currentRow}-${currentCol}`)

						// 使用批量数据收集替代直接更新
						batchData.push({
							row: currentRow - 1 + startRow,
							col: currentCol - 1 + startCol,
							value: mergeInfo
								? mergeInfo.isStart
									? processCellValue(cell)
									: ''
								: processCellValue(cell),
						})

						currentCol++
						cellsInBatch++
						processedCells++
					}

					if (currentCol > colCount) {
						currentCol = 1
						currentRow++
					}
				}

				// 批量更新数据
				if (batchData.length > 0) {
					// 使用requestAnimationFrame确保不阻塞UI
					requestAnimationFrame(() => {
						batchData.forEach((item) => {
							useEditHook.setCellValue(item.row, item.col, item.value, true)
						})
						batchData.length = 0 // 清空数组但保持引用
					})
				}

				// 更新进度
				const progress = Math.floor((processedCells / totalCells) * 100)
				loadingText.value = `正在导入Excel文件...`
				loadingProgress.value = progress

				if (currentRow <= rowCount) {
					setTimeout(processNextBatch, 0) // 使用setTimeout给UI线程喘息的机会
				} else {
					resolve()
				}
			}

			processNextBatch()
		})
	}

	// 读取Excel文件
	const readExcelFile = async (file) => {
		if (!file) return

		try {
			importing.value = true
			loading.value = true
			loadingText.value = '正在导入Excel文件...'
			loadingProgress.value = 0

			sheet.config.zoom = 1
			sheet.config.freezeCount = {
				row: 0,
				col: 0,
			}
			sheet.config.mergedCells = {}
			sheet.config.lockCells = {}
			sheet.config.cellStyle = {}

			useResizeHook.clear()
			useSelectionRangeHook.setRange(0, 0, 0, 0)
			useMergedCellsHook.clearMergedCells()

			// 等待 zoom 还原
			await new Promise((resolve) => {
				setTimeout(() => resolve(), 150)
			})

			const workbook = new ExcelJS.Workbook()
			const arrayBuffer = await file.arrayBuffer()
			await workbook.xlsx.load(arrayBuffer)

			// 获取第一个工作表
			const worksheet = workbook.worksheets[0]
			if (!worksheet) {
				throw new Error('Excel文件为空')
			}

			// 获取数据范围
			const rowCount = worksheet.lastRow?.number || worksheet.rowCount
			const colCount = worksheet.lastColumn?.number || worksheet.columnCount

			if (!rowCount || !colCount) {
				throw new Error('Excel文件没有数据')
			}

			const ranged = useSelectionRangeHook.ranged
			if (!ranged) {
				throw new Error('无效的数据范围')
			}

			// const startRow = Math.min(ranged.start.row, ranged.end.row)
			// const startCol = Math.min(ranged.start.col, ranged.end.col)
			const startRow = 0
			const startCol = 0

			// 分批处理数据
			await processBatch(worksheet, rowCount, colCount, startRow, startCol)

			// 处理合并单元格
			if (worksheet._merges) {
				Object.entries(worksheet._merges).forEach(([key, merge]) => {
					if (typeof merge !== 'object' || !merge.top) return

					const row = merge.top - 1 + startRow
					const col = merge.left - 1 + startCol
					const rowspan = merge.bottom - merge.top + 1
					const colspan = merge.right - merge.left + 1

					useMergedCellsHook.setMergeCell(row, col, rowspan, colspan)
				})
			}

			useSelectionRangeHook.setRange(0, 0, 0, 0)

			return {success: true}
		} catch (error) {
			console.error('Excel导入失败:', error)
			return {
				success: false,
				error: error.message,
			}
		} finally {
			importing.value = false
			loading.value = false
			loadingText.value = ''
		}
	}

	// 处理Excel导出的批处理
	const processExcelBatch = (
		worksheet,
		rowCount,
		colCount,
		startRow,
		startCol,
		batchSize = 5000
	) => {
		return new Promise((resolve) => {
			let currentRow = 1
			let currentCol = 1
			const totalCells = rowCount * colCount
			let processedCells = 0

			const processNextBatch = () => {
				let cellsInBatch = 0
				while (currentRow <= rowCount && cellsInBatch < batchSize) {
					const excelRow = worksheet.getRow(currentRow)

					while (currentCol <= colCount && cellsInBatch < batchSize) {
						const value = useEditHook.getCellValue(
							currentRow - 1 + startRow,
							currentCol - 1 + startCol
						)
						const excelCell = excelRow.getCell(currentCol)

						// 设置单元格值
						if (typeof value === 'number') {
							excelCell.value = value
						} else if (value instanceof Date) {
							excelCell.value = value
						} else {
							excelCell.value = value?.toString() || ''
						}

						currentCol++
						cellsInBatch++
						processedCells++
					}

					if (currentCol > colCount) {
						currentCol = 1
						currentRow++
					}
				}

				// 更新进度
				const progress = Math.floor((processedCells / totalCells) * 100)
				loadingText.value = `正在导出Excel文件...`
				loadingProgress.value = progress

				if (currentRow <= rowCount) {
					requestAnimationFrame(processNextBatch)
				} else {
					resolve()
				}
			}

			requestAnimationFrame(processNextBatch)
		})
	}

	// 导出Excel文件
	const exportExcel = async (fileName = 'export.xlsx') => {
		try {
			exporting.value = true
			loading.value = true
			loadingText.value = '正在导出Excel文件...'
			loadingProgress.value = 0

			const workbook = new ExcelJS.Workbook()
			const worksheet = workbook.addWorksheet('Sheet1')

			// 获取数据范围
			const ranged = useSelectionRangeHook.ranged
			if (!ranged) {
				throw new Error('无效的数据范围')
			}

			const startRow = 0
			const endRow = sheet.config.rowCount - 1
			const startCol = 0
			const endCol = sheet.config.colCount - 1

			const rowCount = endRow - startRow + 1
			const colCount = endCol - startCol + 1

			// 使用批处理导出数据
			await processExcelBatch(worksheet, rowCount, colCount, startRow, startCol)

			// 处理合并单元格
			const mergedCells = useMergedCellsHook.getMergedCells()

			if (mergedCells && typeof mergedCells === 'object') {
				Object.entries(mergedCells).forEach(([key, merge]) => {
					const [row, col] = key.split('-').map(Number)
					if (row >= startRow && row <= endRow && col >= startCol && col <= endCol) {
						// 合并单元格
						worksheet.mergeCells(
							row - startRow + 1,
							col - startCol + 1,
							row - startRow + merge.rowspan,
							col - startCol + merge.colspan
						)

						// 获取合并区域的主单元格
						const cell = worksheet.getCell(row - startRow + 1, col - startCol + 1)

						// 设置样式
						cell.alignment = {
							vertical: 'middle',
							// horizontal: 'center',
						}
					}
				})
			}

			// 生成并下载文件
			const buffer = await workbook.xlsx.writeBuffer()
			const blob = new Blob([buffer], {
				type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			})
			const url = URL.createObjectURL(blob)

			const link = document.createElement('a')
			link.href = url
			link.download = fileName
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			return {success: true}
		} catch (error) {
			console.error('Excel导出失败:', error)
			return {
				success: false,
				error: error.message,
			}
		} finally {
			exporting.value = false
			loading.value = false
			loadingText.value = ''
			loadingProgress.value = 0
		}
	}

	return {
		importing,
		exporting,
		readExcelFile,
		exportExcel,
	}
}
