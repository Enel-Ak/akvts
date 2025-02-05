import {nextTick} from 'vue'

export function useCopy(config) {
	const {sheet, useMergedCellsHook, useSelectionRangeHook, renderRange} = config

	const handleKeyDown = (event) => {
		// 复制 Ctrl+C / Command+C
		if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
			event.preventDefault()
			copySelectedCells()
		}
		// 粘贴 Ctrl+V / Command+V
		else if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
			event.preventDefault()
			// 使用现代Clipboard API处理粘贴
			readClipboard()
		}
	}

	// 读取剪贴板内容
	const readClipboard = async () => {
		try {
			const items = await navigator.clipboard.read()
			for (const item of items) {
				// 检查是否有HTML格式
				if (item.types.includes('text/html')) {
					const htmlBlob = await item.getType('text/html')
					const html = await htmlBlob.text()
					processClipboardData({html, isHtml: true})
				} else if (item.types.includes('text/plain')) {
					const textBlob = await item.getType('text/plain')
					const text = await textBlob.text()
					processClipboardData({text, isHtml: false})
				}
			}
		} catch (error) {
			console.error('读取剪贴板失败，尝试使用备用方法:', error)
			// 降级方案：使用readText
			try {
				const text = await navigator.clipboard.readText()
				processClipboardData({text, isHtml: false})
			} catch (fallbackError) {
				console.error('备用方法也失败了:', fallbackError)
			}
		}
	}

	// 处理剪贴板数据
	const processClipboardData = ({html, text, isHtml}) => {
		const ranged = useSelectionRangeHook.ranged
		if (!ranged) return

		const baseRow = Math.min(ranged.start.row, ranged.end.row)
		const baseCol = Math.min(ranged.start.col, ranged.end.col)

		let pasteData = {
			data: [], // 单元格数据
			merges: [], // 合并单元格信息
			styles: [], // 样式信息
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

						const value = cell.textContent.trim()
						const rowspan = parseInt(cell.getAttribute('rowspan')) || 1
						const colspan = parseInt(cell.getAttribute('colspan')) || 1

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
											value: value,
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
								value: value,
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
			pasteData.data.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					if (!sheet.celldata.get(baseRow + rowIndex)) {
						sheet.celldata.set(baseRow + rowIndex, [])
					}
					sheet.celldata.get(baseRow + rowIndex)[baseCol + colIndex] = cell
				})
			})

			pasteData.merges.forEach((merge) => {
				useMergedCellsHook.addMergedCell(merge.r, merge.c, merge.rs, merge.cs)
			})

			useSelectionRangeHook.setRange(
				baseRow,
				baseCol,
				baseRow + pasteData.data.length - 1,
				baseCol + pasteData.data[0].length - 1,
				true
			)
		}
	}

	const init = () => {
		document.addEventListener('keydown', handleKeyDown)
	}

	const destroy = () => {
		document.removeEventListener('keydown', handleKeyDown)
	}

	return {
		init,
		destroy,
	}
}
