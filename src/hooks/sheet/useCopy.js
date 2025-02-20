import {ElMessage} from 'element-plus'
export function useCopy(config) {
	const {
		sheet,
		useResizeHook,
		useMergedCellsHook,
		useSelectionRangeHook,
		useHistoryHook,
		useToolsHook,
		renderRange,
	} = config

	const handleKeyDown = (event) => {
		// 复制 Ctrl+C / Command+C
		if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
			event.preventDefault()
			copySelectedCells()
		}
	}

	// 处理粘贴事件
	const handlePaste = (e) => {
		e.preventDefault()
		const clipboardData = e.clipboardData || window.clipboardData

		// 快速检查数据大小
		const items = clipboardData.items
		for (const item of items) {
			if (item.type === 'text/html') {
				const html = clipboardData.getData('text/html')
				if (html && html.length > 500 * 1024) {
					// 500KB
					ElMessage.error('数据量过大，请使用导入功能')
					return
				}
			}
		}

		// 优先获取HTML格式
		const html = clipboardData.getData('text/html')
		if (html) {
			processClipboardData({html, isHtml: true})
			return
		}

		// 降级到纯文本
		const text = clipboardData.getData('text/plain')
		if (text) {
			if (text.length > 100000) {
				// 约100KB的文本
				ElMessage.error('数据量过大，请使用导入功能')
				return
			}
			processClipboardData({text, isHtml: false})
		}
	}

	// 处理单元格内容，将br转换为\n
	const processCellContent = (cell) => {
		// 创建一个临时容器来保存内容
		const temp = document.createElement('div')
		temp.innerHTML = cell.innerHTML

		// 将所有的br标签替换为换行符
		const brElements = temp.getElementsByTagName('br')
		while (brElements.length > 0) {
			brElements[0].replaceWith('\n')
		}

		return temp.textContent.trim()
	}

	// 处理单元格样式
	const cellCache = new Map()
	const processCellStyle = (cell, key, other = false) => {
		const style = cell.style
		const ptx = 1.33
		const width = ((parseInt(style.width) || 0) / ptx) | 0
		const height = ((parseInt(style.height) || 0) / ptx) | 0

		if (!other) {
			cellCache.set(key, cell)
		} else {
			const [row, col] = key.split('-').map(Number)
			if (style.borderLeft || style.borderRight || style.borderTop || style.borderBottom) {
				useToolsHook.setBorder()
			}
			if (style.textAlign) {
				useToolsHook.setCellStyle({type: 'align', value: style.textAlign, row, col})
			}
			if (style.color) {
				useToolsHook.setCellStyle({type: 'color', value: style.color, row, col})
			}
			if (style.backgroundColor) {
				useToolsHook.setCellStyle({type: 'bg', value: style.backgroundColor, row, col})
			}
		}

		return {
			width,
			height,
			style: {
				width: cell.style.width || null,
				height: cell.style.height || null,
			},
		}
	}

	// 处理剪贴板数据
	const processClipboardData = async ({html, text, isHtml}) => {
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const baseRow = Math.min(ranged.start.row, ranged.end.row)
		const baseCol = Math.min(ranged.start.col, ranged.end.col)

		let pasteData = {
			data: [], // 单元格数据
			merges: [], // 合并单元格信息
			styles: {
				rowHeights: {},
				colWidths: {},
			}, // 样式信息
		}

		if (isHtml && html) {
			const div = document.createElement('div')
			div.innerHTML = html
			console.log('解析的HTML:', html)

			const table = div.querySelector('table')
			if (table) {
				const rows = Array.from(table.rows)

				// 计算表格的实际大小
				let maxRows = rows.length
				let maxCols = 0
				rows.forEach((row) => {
					maxCols = Math.max(
						maxCols,
						Array.from(row.cells).reduce((acc, cell) => {
							return acc + (parseInt(cell.getAttribute('colspan')) || 1)
						}, 0)
					)
				})

				// 创建一个矩阵来跟踪单元格占用情况
				let matrix = Array(maxRows)
					.fill()
					.map(() => Array(maxCols).fill(null))
				let dataMatrix = Array(maxRows)
					.fill()
					.map(() => Array(maxCols).fill(''))

				// 填充矩阵
				rows.forEach((row, rowIndex) => {
					let colIndex = 0
					Array.from(row.cells).forEach((cell) => {
						// 找到下一个未被占用的位置
						while (colIndex < maxCols && matrix[rowIndex][colIndex] !== null) {
							colIndex++
						}

						// 获取单元格值
						const value = processCellContent(cell)
						const rowspan = parseInt(cell.getAttribute('rowspan')) || 1
						const colspan = parseInt(cell.getAttribute('colspan')) || 1
						const curRow = baseRow + rowIndex
						const curCol = baseCol + colIndex
						const {width, height, style} = processCellStyle(cell, `${curRow}-${curCol}`)

						// 更新行高和列宽
						if (height > (pasteData.styles.rowHeights[curRow] || 0) && rowspan <= 1) {
							pasteData.styles.rowHeights[curRow] = height
						}
						if (width > (pasteData.styles.colWidths[curCol] || 0) && colspan <= 1) {
							pasteData.styles.colWidths[curCol] = width
						}

						// 处理合并单元格
						if (rowspan > 1 || colspan > 1) {
							// 添加合并单元格信息（相对于选中区域）
							pasteData.merges.push({
								r: baseRow + rowIndex,
								c: baseCol + colIndex,
								rs: rowspan,
								cs: colspan,
							})

							// 在数据矩阵中填充值
							dataMatrix[rowIndex][colIndex] = value

							// 标记被合并单元格覆盖的区域
							for (let r = 0; r < rowspan; r++) {
								for (let c = 0; c < colspan; c++) {
									if (rowIndex + r < maxRows && colIndex + c < maxCols) {
										matrix[rowIndex + r][colIndex + c] = {
											mainCell: {row: rowIndex, col: colIndex},
											value,
											style,
										}
										// 除了主单元格外，其他位置填充空字符串
										if (r !== 0 || c !== 0) {
											dataMatrix[rowIndex + r][colIndex + c] = ''
										}
									}
								}
							}
						} else {
							// 普通单元格
							matrix[rowIndex][colIndex] = {
								mainCell: {row: rowIndex, col: colIndex},
								value,
								style,
							}
							dataMatrix[rowIndex][colIndex] = value
						}

						colIndex += colspan
					})
				})

				pasteData.data = dataMatrix
			}
		}

		console.log('解析后的数据:', pasteData)

		// 处理纯文本情况
		if (!pasteData.data.length && text) {
			const rows = text.split(/\r\n|\n|\r/).filter((row) => row.trim())
			let maxCols = 0

			// 计算最大列数
			rows.forEach((row) => {
				maxCols = Math.max(maxCols, row.split(/\t/).length)
			})

			// 创建数据矩阵
			pasteData.data = rows.map((row) => {
				const cells = row.split(/\t/)
				// 补充空单元格到最大列数
				while (cells.length < maxCols) {
					cells.push('')
				}
				return cells
			})
		}

		if (pasteData.data.length) {
			const oldCellData = []
			const maxRows = pasteData.data.length + baseRow
			const maxCols = pasteData.data[0].length + baseCol

			// 检查是否需要添加列
			if (maxCols > sheet.config.colCount) {
				const colsToAdd = maxCols - sheet.config.colCount
				useToolsHook.addColumnCount.value = colsToAdd
				useToolsHook.addColumn(true)
			}

			// 检查是否需要添加行
			if (maxRows > sheet.config.rowCount) {
				const rowsToAdd = maxRows - sheet.config.rowCount
				useToolsHook.addRowCount.value = rowsToAdd
				useToolsHook.addRow(true)
			}

			await renderRange()

			pasteData.data.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					const targetRow = baseRow + rowIndex
					const targetCol = baseCol + colIndex

					if (!sheet.celldata.get(targetRow)) {
						sheet.celldata.set(targetRow, [])
					}

					// 保存原始数据用于历史记录
					oldCellData.push({
						rowIndex: targetRow,
						colIndex: targetCol,
						value: sheet.celldata.get(targetRow)[targetCol],
					})

					// 替换数据
					sheet.celldata.get(targetRow)[targetCol] = cell
				})
			})

			useHistoryHook.saveHistory(oldCellData, 'edit')

			// 先删除目标区域内的所有已存在的合并单元格
			const targetEndRow = baseRow + pasteData.data.length - 1
			const targetEndCol = baseCol + pasteData.data[0].length - 1
			const mergedCells = useMergedCellsHook.getMergedCells()
			Object.entries(mergedCells).forEach(([key, value]) => {
				// 检查是否与目标区域有交集
				const [row, col] = key.split('-').map(Number)
				const {rowspan, colspan} = value

				if (
					row <= targetEndRow &&
					row + rowspan - 1 >= baseRow &&
					col <= targetEndCol &&
					col + colspan - 1 >= baseCol
				) {
					useMergedCellsHook.removeMergedCell(row, col)
				}
			})

			pasteData.merges.forEach((merge) => {
				useMergedCellsHook.setMergeCell(merge.r, merge.c, merge.rs, merge.cs)
			})

			useSelectionRangeHook.setRange(
				baseRow,
				baseCol,
				baseRow + pasteData.data.length - 1,
				baseCol + pasteData.data[0].length - 1,
				true
			)
		}

		// 处理高度
		if (Object.keys(pasteData.styles.rowHeights).length) {
			Object.entries(pasteData.styles.rowHeights).forEach(([row, height]) => {
				useResizeHook.setRowHeight(Number(row), height)
			})
		}

		// 处理宽度
		if (Object.keys(pasteData.styles.colWidths).length) {
			Object.entries(pasteData.styles.colWidths).forEach(([col, width]) => {
				useResizeHook.setColWidth(Number(col), width)
			})
		}

		// 处理其他样式
		if (cellCache.size) {
			cellCache.forEach((cell, key) => {
				processCellStyle(cell, key, true)
			})
		}
	}

	// 复制选中单元格到Excel
	const copySelectedCells = async () => {
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const startRow = Math.min(ranged.start.row, ranged.end.row)
		const endRow = Math.max(ranged.start.row, ranged.end.row)
		const startCol = Math.min(ranged.start.col, ranged.end.col)
		const endCol = Math.max(ranged.start.col, ranged.end.col)

		// 创建表格HTML，添加完整的表格结构
		let tableHtml = `
            <table data-air-sheet-cell>
                <tbody>
        `

		for (let row = startRow; row <= endRow; row++) {
			tableHtml += '<tr>'
			for (let col = startCol; col <= endCol; col++) {
				const merge = useMergedCellsHook.findMergedCell(row, col)
				const value = sheet.celldata.get(row)?.[col] || ''

				// 获取单元格的宽高
				const rowHeight = useResizeHook.getRowHeight(row)
				const colWidth = useResizeHook.getColWidth(col)
				const style = `style="height:${rowHeight}px;width:${colWidth}px;"`

				// 检查是否在合并单元格范围内
				if (merge) {
					// 只在合并单元格的起始位置添加单元格
					if (merge.row === row && merge.col === col) {
						const mergeInfo = JSON.stringify({
							rs: merge.rowspan,
							cs: merge.colspan,
						})
						tableHtml += `<td data-air-sheet-cell data-row="${
							row - startRow
						}" data-col="${col - startCol}" data-merge='${mergeInfo}' rowspan="${
							merge.rowspan
						}" colspan="${merge.colspan}">${value}</td>`
					}
					// 如果是合并单元格的非起始位置，跳过
					continue
				} else {
					// 普通单元格
					tableHtml += `<td data-air-sheet-cell data-row="${row - startRow}" data-col="${
						col - startCol
					}">${value}</td>`
				}
			}
			tableHtml += '</tr>'
		}

		tableHtml += `
                </tbody>
            </table>
        `
		console.log(111, tableHtml)

		// 生成纯文本版本（用于兼容性）
		let plainText = ''
		for (let row = startRow; row <= endRow; row++) {
			const rowData = []
			for (let col = startCol; col <= endCol; col++) {
				const merge = useMergedCellsHook.findMergedCell(row, col)
				if (merge) {
					// 只在合并单元格的起始位置添加值
					if (merge.row === row && merge.col === col) {
						rowData.push(sheet.celldata.get(row)?.[col] || '')
					}
				} else {
					rowData.push(sheet.celldata.get(row)?.[col] || '')
				}
			}
			plainText += rowData.join('\t') + '\n'
		}

		try {
			// 使用现代Clipboard API
			const htmlBlob = new Blob([tableHtml], {type: 'text/html'})
			const textBlob = new Blob([plainText], {type: 'text/plain'})

			await navigator.clipboard.write([
				new ClipboardItem({
					'text/html': htmlBlob,
					'text/plain': textBlob,
				}),
			])
			ElMessage.success('复制成功')
		} catch (error) {
			console.error('复制失败:', error)
			// 降级方案：使用传统方法
			const tempDiv = document.createElement('div')
			tempDiv.innerHTML = tableHtml
			document.body.appendChild(tempDiv)
			const range = document.createRange()
			range.selectNode(tempDiv)
			const selection = window.getSelection()
			selection.removeAllRanges()
			selection.addRange(range)
			document.execCommand('copy')
			document.body.removeChild(tempDiv)
		}
	}

	const init = () => {
		document.addEventListener('keydown', handleKeyDown)
		// 添加paste事件监听
		document.addEventListener('paste', handlePaste)
	}

	const destroy = () => {
		document.removeEventListener('keydown', handleKeyDown)
		// 移除paste事件监听
		document.removeEventListener('paste', handlePaste)
	}

	return {
		init,
		destroy,
	}
}
