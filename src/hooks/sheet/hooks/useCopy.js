import {useAirSheetStore} from '../store/useAirSheet'
import {ElMessage} from 'element-plus'
import {useDebounce} from '@/hooks'
import {onDeactivated, onUnmounted} from 'vue'

export function useCopy() {
	const sheetStore = useAirSheetStore()
	let sheetKey = ''
	let sheet = null
	let isEventBound = false // ✅ 新增: 防止事件监听器重复绑定

	const handleKeyDown = async (event) => {
		// ✅ 修复: 检查 sheet 对象是否存在
		if (!sheet) {
			console.warn('Sheet 对象不存在，跳过复制操作')
			return
		}

		// 复制 Ctrl+C / Command+C
		if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
			event.preventDefault()
			// ✅ 修复: 等待复制操作完成后显示成功提示
			await copySelectedCells()
		}
	}

	// 处理粘贴事件
	let pasteTimer = null
	const handlePaste = async (e) => {
		// ✅ 修复: 检查 sheet 对象是否存在
		if (!sheet) {
			console.warn('Sheet 对象不存在，跳过粘贴操作')
			return
		}

		if (sheet.hooks.toolsHook.isLocked()) {
			return
		}

		e.preventDefault()

		// 权限检查 - 在粘贴前检查目标区域是否有权限
		const ranged = sheet.hooks.selectionRangeHook.getRanged()
		if (
			ranged &&
			sheet.hooks.permissionsHook &&
			sheet.config.synergy &&
			sheet.config.auth > 0
		) {
			const rowspan = Math.abs(ranged.rr - ranged.r) + 1
			const colspan = Math.abs(ranged.cc - ranged.c) + 1
			const permissionCheck = sheet.hooks.permissionsHook.checkPermission(
				Math.min(ranged.r, ranged.rr),
				Math.min(ranged.c, ranged.cc),
				rowspan,
				colspan
			)

			if (permissionCheck.locked) {
				clearTimeout(pasteTimer)
				pasteTimer = setTimeout(() => ElMessage.warning(permissionCheck.reason), 300)
				return // 阻止粘贴
			}
		}

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
			await processClipboardData({html, isHtml: true})
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
			await processClipboardData({text, isHtml: false})
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
			const [r, c] = key.split('-').map(Number)
			if (style.borderLeft || style.borderRight || style.borderTop || style.borderBottom) {
				sheet.hooks.toolsHook.setBorder()
			}
			if (style.textAlign) {
				sheet.hooks.toolsHook.setCellStyle({
					type: 'align',
					v: style.textAlign,
					r,
					c,
				})
			}
			if (style.color) {
				sheet.hooks.toolsHook.setCellStyle({type: 'color', v: style.color, r, c})
			}
			if (style.backgroundColor) {
				sheet.hooks.toolsHook.setCellStyle({
					type: 'bg',
					v: style.backgroundColor,
					r,
					c,
				})
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
		const {r, rr, c, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || rr === undefined || c === undefined || cc === undefined) return

		const baseRow = r
		const baseCol = c

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
			const cellChanges = [] // 收集单元格变更用于协同同步
			const maxRows = pasteData.data.length + baseRow
			const maxCols = pasteData.data[0].length + baseCol

			// 检查是否需要添加列
			if (maxCols > sheet.config.colCount) {
				const colsToAdd = maxCols - sheet.config.colCount
				sheet.hooks.toolsHook.addColumnCount = colsToAdd
				await sheet.hooks.toolsHook.addColumn(null, true, false)
			}

			// 检查是否需要添加行
			if (maxRows > sheet.config.rowCount) {
				const rowsToAdd = maxRows - sheet.config.rowCount
				sheet.hooks.toolsHook.addRowCount = rowsToAdd
				await sheet.hooks.toolsHook.addRow(null, true, false)
			}

			sheet.state.loading = true
			sheet.state.msg = '正在处理粘贴数据...'
			sheet.state.progress = -1

			pasteData.data.forEach((row, rowIndex) => {
				row.forEach((cell, colIndex) => {
					const targetRow = baseRow + rowIndex
					const targetCol = baseCol + colIndex

					if (!sheet.celldata.get(targetRow)) {
						sheet.celldata.set(targetRow, [])
					}

					// 保存原始数据用于历史记录
					const oldValue = sheet.celldata.get(targetRow)[targetCol]
					oldCellData.push({
						r: targetRow,
						c: targetCol,
						v: oldValue,
					})

					// 收集变更用于协同同步
					if (sheet.config.synergy) {
						cellChanges.push({
							r: targetRow,
							c: targetCol,
							before: oldValue || '',
							after: cell,
						})
					}

					// 替换数据
					requestAnimationFrame(() => {
						sheet.celldata.get(targetRow)[targetCol] = cell
						// sheet.hooks.editHook.setRowHeight(targetRow, targetCol, false)
						// sheet.hooks.editHook.setColWidth(targetRow, targetCol, false)
					})
				})
			})

			sheet.hooks.historyHook.save(oldCellData, 'edit')

			// ✅ 修复: 协同编辑: 同步单元格变更到其他用户，添加错误处理
			if (sheet.config.synergy && cellChanges.length > 0) {
				try {
					await Promise.all(
						cellChanges.map((change) => {
							return sheet.hooks.synergyHook.changeCell({
								sheetId: sheet?.original?.sheetId || sheet.id,
								row: change.r,
								col: change.c,
								before: change.before,
								after: change.after,
							})
						})
					)
				} catch (error) {
					console.error('协同同步失败:', error)
					// 不中断粘贴操作，只记录错误
				}
			}

			// ✅ 修复: 使用 requestAnimationFrame 确保数据更新完成后再更新 deepPermissions
			requestAnimationFrame(() => {
				// ✅ 修复: 粘贴操作后更新或清除 deepPermissions（持久锁定）
				const pasteEndRow = baseRow + pasteData.data.length - 1
				const pasteEndCol = baseCol + pasteData.data[0].length - 1

				// ✅ 新增: 检查粘贴的数据是否全为空
				const rangeIsEmpty = sheet.hooks?.permissionsHook?.isRangeEmpty?.(
					baseRow,
					baseCol,
					pasteEndRow,
					pasteEndCol
				)

				console.log('✅ useCopy.paste: 检查粘贴数据是否为空', {
					起始位置: {r: baseRow, c: baseCol},
					结束位置: {r: pasteEndRow, c: pasteEndCol},
					auth: sheet.config.auth,
					rangeIsEmpty,
				})

				if (rangeIsEmpty) {
					// 粘贴的数据全为空，清除 deepPermissions
					console.log('✅ useCopy.paste: 粘贴数据为空，调用 clearDeepPermissions')
					sheet.hooks?.permissionsHook?.clearDeepPermissions?.(
						baseRow,
						baseCol,
						pasteEndRow,
						pasteEndCol
					)
				} else {
					// 粘贴的数据不为空，更新 deepPermissions
					console.log('✅ useCopy.paste: 粘贴数据不为空，调用 updateDeepPermissions')
					sheet.hooks?.permissionsHook?.updateDeepPermissions?.(
						baseRow,
						baseCol,
						pasteEndRow,
						pasteEndCol
					)
				}
			})

			// 先删除目标区域内的所有已存在的合并单元格
			const targetEndRow = baseRow + pasteData.data.length - 1
			const targetEndCol = baseCol + pasteData.data[0].length - 1
			const mergedCells = sheet.hooks.mergeHook.getMergedCells()
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
					sheet.hooks.mergeHook.removeMergedCell(row, col)
				}
			})

			pasteData.merges.forEach((merge) => {
				sheet.hooks.mergeHook.setMerge(merge.r, merge.c, merge.rs, merge.cs)
			})

			// ✅ 修复: 使用 requestAnimationFrame 替代 setTimeout，确保在 DOM 更新后再设置选区
			// 这样可以避免粘贴后点击单元格时位置计算错误
			requestAnimationFrame(() => {
				const pasteEndRow = baseRow + pasteData.data.length - 1
				const pasteEndCol = baseCol + pasteData.data[0].length - 1

				sheet.hooks.selectionRangeHook.setRange(
					baseRow,
					baseCol,
					pasteEndRow,
					pasteEndCol,
					true
				)
			})
		}

		// // 处理高度
		// if (Object.keys(pasteData.styles.rowHeights).length) {
		// 	Object.entries(pasteData.styles.rowHeights).forEach(([row, height]) => {
		// 		sheet.hooks.resizeHook.setRowHeight(Number(row), height)
		// 	})
		// }

		// // 处理宽度
		// if (Object.keys(pasteData.styles.colWidths).length) {
		// 	Object.entries(pasteData.styles.colWidths).forEach(([col, width]) => {
		// 		sheet.hooks.resizeHook.setColWidth(Number(col), width)
		// 	})
		// }

		// 处理其他样式
		if (cellCache.size) {
			cellCache.forEach((cell, key) => {
				processCellStyle(cell, key, true)
			})
		}

		// ✅ 修复: 所有操作完成后显示成功提示
		sheet.state.loading = false

		if (sheet.config.synergy) {
			sheet.hooks.toolsHook.asyncUpdateConfig(0, null, null)
		}

		useDebounce(
			() => {
				ElMessage.success('粘贴成功')
				sheet.hooks.toolsHook.addRowCount = 1
				sheet.hooks.toolsHook.addColumnCount = 1
			},
			100,
			'airSheetPaste'
		)()
	}

	// 复制选中单元格到Excel
	const copySelectedCells = async (isCut = false) => {
		// ✅ 修复: 检查 sheet 对象是否存在
		if (!sheet) {
			console.error('Sheet 对象不存在，无法执行复制操作')
			return false
		}

		if (sheet.hooks.toolsHook.isLocked(-1, -1, -1, -1, true)) {
			ElMessage.warning('包含锁定单元格，无法复制')
			return false
		}

		const {r, rr, c, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || rr === undefined || c === undefined || cc === undefined) return false

		// ✅ 新增: 权限检查 - 在复制/剪切前检查源区域是否被锁定
		if (sheet.hooks.permissionsHook && sheet.config.synergy && sheet.config.auth > 0) {
			const rowspan = Math.abs(rr - r) + 1
			const colspan = Math.abs(cc - c) + 1
			const permissionCheck = sheet.hooks.permissionsHook.checkPermission(
				Math.min(r, rr),
				Math.min(c, cc),
				rowspan,
				colspan
			)

			if (permissionCheck.locked) {
				clearTimeout(pasteTimer)
				pasteTimer = setTimeout(
					() =>
						ElMessage.warning(
							`${permissionCheck.reason}，无法${isCut ? '剪切' : '复制'}`
						),
					300
				)
				return // 阻止复制/剪切
			}
		}

		// 创建表格HTML，添加完整的表格结构
		let tableHtml = `
            <table data-air-sheet-cell>
                <tbody>
        `

		for (let row = r; row <= rr; row++) {
			tableHtml += '<tr>'
			for (let col = c; col <= cc; col++) {
				const merge = sheet.hooks.mergeHook.findMergedCell(row, col)
				const value = sheet.celldata.get(row)?.[col] || ''

				// 获取单元格的宽高
				const rowHeight = sheet.hooks.resizeHook.getRowHeight(row)
				const colWidth = sheet.hooks.resizeHook.getColWidth(col)
				const style = `style="height:${rowHeight}px;width:${colWidth}px;"`

				// 检查是否在合并单元格范围内
				if (merge) {
					// 只在合并单元格的起始位置添加单元格
					if (merge.r === row && merge.c === col) {
						const mergeInfo = JSON.stringify({
							rs: merge.rs,
							cs: merge.cs,
						})
						tableHtml += `<td data-air-sheet-cell data-row="${row - r}" data-col="${
							col - c
						}" data-merge='${mergeInfo}' rowspan="${merge.rs}" colspan="${
							merge.cs
						}">${value}</td>`
					}
					// 如果是合并单元格的非起始位置，跳过
					continue
				} else {
					// 普通单元格
					tableHtml += `<td data-air-sheet-cell data-row="${row - r}" data-col="${
						col - c
					}">${value}</td>`
				}
			}
			tableHtml += '</tr>'
		}

		tableHtml += `
                </tbody>
            </table>
        `

		// 生成纯文本版本（用于兼容性）
		let plainText = ''
		for (let row = r; row <= rr; row++) {
			const rowData = []
			for (let col = c; col <= cc; col++) {
				const merge = sheet.hooks.mergeHook.findMergedCell(row, col)
				if (merge) {
					// 只在合并单元格的起始位置添加值
					if (merge.r === row && merge.c === col) {
						rowData.push(sheet.celldata.get(row)?.[col] || '')
					}
				} else {
					rowData.push(sheet.celldata.get(row)?.[col] || '')
				}
			}
			plainText += rowData.join('\t') + '\n'
		}

		try {
			// ✅ 修复: 检查 Clipboard API 是否可用
			if (!navigator.clipboard) {
				console.warn('Clipboard API 不可用，使用降级方案')
				return fallbackCopy(tableHtml, isCut)
			}

			// 使用现代Clipboard API
			const htmlBlob = new Blob([tableHtml], {type: 'text/html'})
			const textBlob = new Blob([plainText], {type: 'text/plain'})

			await navigator.clipboard.write([
				new ClipboardItem({
					'text/html': htmlBlob,
					'text/plain': textBlob,
				}),
			])

			useDebounce(
				() => {
					ElMessage.success(isCut ? '剪切成功' : '复制成功')
				},
				100,
				'airSheetCopySuccess'
			)()
			return true // 返回成功标志
		} catch (error) {
			console.error(isCut ? '剪切失败' : '复制失败:', error)
			console.warn('Clipboard API 失败，尝试使用降级方案')
			// ✅ 修复: 改进的降级方案
			return fallbackCopy(tableHtml, isCut)
		}
	}

	// ✅ 新增: 改进的降级方案 - 使用传统 document.execCommand
	const fallbackCopy = (html, isCut = false) => {
		try {
			if (sheet.hooks.toolsHook.isLocked()) {
				ElMessage.warning('包含锁定单元格，无法复制')
				return false
			}

			const tempDiv = document.createElement('div')
			tempDiv.innerHTML = html
			tempDiv.style.position = 'fixed'
			tempDiv.style.left = '-9999px'
			tempDiv.style.top = '-9999px'
			tempDiv.style.opacity = '0'
			document.body.appendChild(tempDiv)

			const range = document.createRange()
			range.selectNodeContents(tempDiv)
			const selection = window.getSelection()
			if (!selection) {
				console.error('无法获取 Selection 对象')
				document.body.removeChild(tempDiv)
				return false
			}

			selection.removeAllRanges()
			selection.addRange(range)

			// ✅ 修复: 检查 execCommand 是否成功
			const success = document.execCommand('copy')
			document.body.removeChild(tempDiv)

			if (!success) {
				console.error('document.execCommand("copy") 返回 false')
				return false
			}

			// 显示成功提示
			useDebounce(
				() => {
					ElMessage.success(isCut ? '剪切成功' : '复制成功')
				},
				100,
				'airSheetFallbackCopy'
			)()

			return true
		} catch (error) {
			console.error('降级方案异常:', error)
			ElMessage.error('复制失败，请重试')
			return false
		}
	}

	// 剪切选中单元格
	const cutSelectedCells = async () => {
		// ✅ 修复: 检查 sheet 对象是否存在
		if (!sheet) {
			console.error('Sheet 对象不存在，无法执行剪切操作')
			return
		}

		if (sheet.hooks.toolsHook.isLocked()) {
			ElMessage.warning('包含锁定单元格，无法剪切')
			return false
		}

		// ✅ 新增: 权限检查 - 在剪切前检查源区域是否被锁定
		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || rr === undefined || c === undefined || cc === undefined) return

		// 权限检查通过，执行复制到剪贴板
		await copySelectedCells(true)

		const oldCellData = []
		const cellChanges = [] // 收集单元格变更用于协同同步

		for (let i = r; i <= rr; i++) {
			for (let j = c; j <= cc; j++) {
				const oldValue = sheet.celldata.get(i)[j]
				oldCellData.push({
					r: i,
					c: j,
					v: oldValue,
				})

				// 收集变更用于协同同步
				if (sheet.config.synergy) {
					cellChanges.push({
						r: i,
						c: j,
						before: oldValue || '',
						after: '',
					})
				}

				sheet.celldata.get(i)[j] = ''
			}
		}
		sheet.hooks.historyHook.save(oldCellData, 'edit')

		// ✅ 修复: 协同编辑: 同步单元格变更到其他用户，添加错误处理
		if (sheet.config.synergy && cellChanges.length > 0) {
			console.log('剪切操作协同同步:', {
				变更数量: cellChanges.length,
				起始位置: `${r},${c}`,
			})
			try {
				cellChanges.forEach((change) => {
					sheet.hooks.synergyHook.changeCell({
						sheetId: sheet?.original?.sheetId || sheet.id,
						row: change.r,
						col: change.c,
						before: change.before,
						after: change.after,
					})
				})
			} catch (error) {
				console.error('剪切操作协同同步失败:', error)
				// 不中断剪切操作，只记录错误
			}
		}

		// ✅ 修复: 剪切操作后清除源区域的 deepPermissions（持久锁定）
		console.log('✅ useCopy.cut: 调用 clearDeepPermissions', {
			起始位置: {r, c},
			结束位置: {r: rr, c: cc},
			auth: sheet.config.auth,
		})

		// 调用 clearDeepPermissions 清除源区域的持久锁定
		sheet.hooks?.permissionsHook?.clearDeepPermissions?.(r, c, rr, cc)
	}

	// ✅ 修复: 点击粘贴时处理数据，添加错误处理
	const paste = async () => {
		try {
			// ✅ 修复: 检查 Clipboard API 是否可用
			if (!navigator.clipboard || !navigator.clipboard.readText) {
				ElMessage.error('剪贴板 API 不可用，请使用 Ctrl+V 粘贴')
				return
			}

			if (sheet.hooks.toolsHook.isLocked()) {
				ElMessage.warning('包含锁定单元格，无法粘贴')
				return false
			}

			const text = await navigator.clipboard.readText()
			await processClipboardData({text, isHtml: false})
		} catch (error) {
			console.error('粘贴失败:', error)
			ElMessage.error('粘贴失败，请重试或使用 Ctrl+V')
		}
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
	}

	// ✅ 修复: 防止事件监听器重复绑定
	const addEvent = (containerId) => {
		if (isEventBound) {
			console.warn('Copy 事件已绑定，跳过重复绑定')
			return
		}

		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('paste', handlePaste)
		isEventBound = true
		console.log('Copy 事件已绑定')
	}

	// ✅ 修复: 确保正确移除事件监听器
	const removeEvent = () => {
		if (!isEventBound) {
			return
		}

		document.removeEventListener('keydown', handleKeyDown)
		document.removeEventListener('paste', handlePaste)
		isEventBound = false
		console.log('Copy 事件已移除')
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => {
			console.log('installed useCopy')
		}, 16)

		return {
			paste,
			cutSelectedCells,
			copySelectedCells,
			destroy,

			refreshSheet,
			addEvent,
			removeEvent,
		}
	}

	const destroy = () => {
		document.removeEventListener('keydown', handleKeyDown)
		// 移除paste事件监听
		document.removeEventListener('paste', handlePaste)

		sheet = null
		sheetKey = null
	}

	return {
		init,
	}
}
