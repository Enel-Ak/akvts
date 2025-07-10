import {computed, ref, shallowRef, watch} from 'vue'

const workerCode = `
	self.onmessage = (event) => {
		try {
			const {} = event.data
			self.postMessage({})
		} catch (error) {
			self.postMessage({})
		}
	}

`

export const useSelectionRange = (containerId, config = {}) => {
	// 基础配置
	let worker = null
	let container = null
	const {sheet, rowHeight, colWidth, useMergedCellsHook, useResizeHook, render} = config

	// 选区状态管理
	const selecting = ref(false)
	const dragging = ref(false)
	const mouseDownPos = ref({x: 0, y: 0})
	const selectionStart = shallowRef({row: -1, col: -1})
	const selectionEnd = shallowRef({row: -1, col: -1})
	const ranged = shallowRef({start: {row: -1, col: -1}, end: {row: -1, col: -1}})
	const statistics = shallowRef({count: 0, average: 0, min: 0, max: 0, sum: 0})

	// 获取单元格位置
	const getCellPosition = (e) => {
		const rect = container.getBoundingClientRect()
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		// 使用累加方式找到正确的行
		let currentHeight = 0
		let row = 0
		while (currentHeight <= y) {
			const rowCurrentHeight = useResizeHook.getRowHeight(row)
			if (currentHeight + rowCurrentHeight > y) {
				break
			}
			currentHeight += rowCurrentHeight
			row++
		}

		// 使用累加方式计算列位置
		let currentWidth = 0
		let col = 0
		while (currentWidth <= x) {
			const colCurrentWidth = useResizeHook.getColWidth(col)
			if (currentWidth + colCurrentWidth > x) {
				break
			}
			currentWidth += colCurrentWidth
			col++
		}

		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook.findMergedCell?.(row, col)
		if (mergedCell) {
			return {
				row: mergedCell.row,
				col: mergedCell.col,
				mergedCell,
			}
		}
		return {row, col}
	}

	// 获取包含合并单元格的矩形区域
	const getExpandedRange = (startRow, endRow, startCol, endCol) => {
		let finalStartRow = startRow
		let finalEndRow = endRow
		let finalStartCol = startCol
		let finalEndCol = endCol

		// 检查选区边界上的合并单元格
		const checkBoundary = (row, col) => {
			const mergedCell = useMergedCellsHook.findMergedCell(row, col)
			if (mergedCell) {
				finalStartRow = Math.min(finalStartRow, mergedCell.row)
				finalEndRow = Math.max(finalEndRow, mergedCell.row + mergedCell.rowspan - 1)
				finalStartCol = Math.min(finalStartCol, mergedCell.col)
				finalEndCol = Math.max(finalEndCol, mergedCell.col + mergedCell.colspan - 1)
				return true
			}
			return false
		}

		// 检查选区的四个边界
		for (let row = startRow; row <= endRow; row++) {
			checkBoundary(row, startCol)
			checkBoundary(row, endCol)
		}
		for (let col = startCol; col <= endCol; col++) {
			checkBoundary(startRow, col)
			checkBoundary(endRow, col)
		}

		// 如果边界发生变化，递归检查新的边界
		if (
			finalStartRow !== startRow ||
			finalEndRow !== endRow ||
			finalStartCol !== startCol ||
			finalEndCol !== endCol
		) {
			return getExpandedRange(finalStartRow, finalEndRow, finalStartCol, finalEndCol)
		}

		return {
			startRow: finalStartRow,
			endRow: finalEndRow,
			startCol: finalStartCol,
			endCol: finalEndCol,
		}
	}

	// 缓存修改过的行和列的信息
	const modifiedRowsCache = () => {
		const before = new Map()
		let beforeSum = 0
		Object.entries(useResizeHook.rowHeights).forEach(([row, height]) => {
			const rowNum = Number(row)
			const diff = height - rowHeight
			before.set(rowNum, diff)
			beforeSum += diff
		})
		return {map: before, sum: beforeSum}
	}

	const modifiedColsCache = () => {
		const before = new Map()
		let beforeSum = 0
		Object.entries(useResizeHook.colWidths).forEach(([col, width]) => {
			const colNum = Number(col)
			const diff = width - colWidth
			before.set(colNum, diff)
			beforeSum += diff
		})
		return {map: before, sum: beforeSum}
	}

	const highlightRanges = new Map()
	const setHighlightRange = (highlight) => {
		const {id, r, c, rr, cc, value, state} = highlight

		// 计算行高
		let totalOffsetTop = r * rowHeight
		let totleHeight = (rr - r + 1) * rowHeight

		// 使用缓存计算修改的行的差值
		let modifiedBefore = 0
		let modifiedInRange = 0
		modifiedRowsCache().map.forEach((diff, row) => {
			if (row < r) {
				modifiedBefore += diff
			} else if (row >= r && row <= rr) {
				modifiedInRange += diff
			}
		})

		// 计算列宽
		let totaloffsetLeft = c * colWidth
		let totleWidth = (cc - c + 1) * colWidth

		// 使用缓存计算修改的列的差值
		let modifiedColBefore = 0
		let modifiedColInRange = 0
		modifiedColsCache().map.forEach((diff, col) => {
			if (col < c) {
				modifiedColBefore += diff
			} else if (col >= c && col <= cc) {
				modifiedColInRange += diff
			}
		})

		// 生成随机暖色系, 且不重复、不与已有的颜色重复、不会与已有的颜色相近、颜色不会太浅
		const randomColor = () => {
			// 收集已存在的颜色
			const existingColors = Array.from(highlightRanges.values())
				.map((style) => style['--z-highlight-color'])
				.filter(Boolean)

			// 生成暖色系颜色
			// 暖色系的色相范围大致在 0-60 (红到黄) 和 300-360 (紫红)
			const generateWarmColor = () => {
				// 随机选择色相范围：红-黄(0-60)或紫红(300-360)
				const hueRange = Math.random() > 0.7 ? [300, 360] : [0, 60]
				const hue = Math.floor(Math.random() * (hueRange[1] - hueRange[0]) + hueRange[0])

				// 较高的饱和度，确保颜色鲜艳
				const saturation = Math.floor(Math.random() * 30 + 70) // 70-100%

				// 适中的亮度，不会太暗也不会太浅
				const lightness = Math.floor(Math.random() * 25 + 45) // 45-70%

				return `hsl(${hue}, ${saturation}%, ${lightness}%)`
			}

			// 检查颜色是否与已有颜色相近
			const isColorSimilar = (color1, color2) => {
				// 简单的字符串比较，完全相同的颜色
				if (color1 === color2) return true

				// 解析 HSL 颜色值进行比较
				const parseHSL = (hslStr) => {
					const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
					if (!match) return null
					return {
						h: parseInt(match[1]),
						s: parseInt(match[2]),
						l: parseInt(match[3]),
					}
				}

				const hsl1 = parseHSL(color1)
				const hsl2 = parseHSL(color2)

				if (!hsl1 || !hsl2) return false

				// 计算色相差异（考虑色环）
				const hueDiff = Math.min(Math.abs(hsl1.h - hsl2.h), 360 - Math.abs(hsl1.h - hsl2.h))

				// 计算饱和度和亮度差异
				const satDiff = Math.abs(hsl1.s - hsl2.s)
				const lightDiff = Math.abs(hsl1.l - hsl2.l)

				// 如果色相、饱和度和亮度都很接近，则认为颜色相似
				return hueDiff < 30 && satDiff < 20 && lightDiff < 20
			}

			// 尝试生成不重复且不相似的颜色，最多尝试50次
			let newColor
			let attempts = 0
			const maxAttempts = 50

			do {
				newColor = generateWarmColor()
				attempts++

				// 检查是否与现有颜色相似
				const isSimilarToExisting = existingColors.some((existingColor) =>
					isColorSimilar(newColor, existingColor)
				)

				if (!isSimilarToExisting || attempts >= maxAttempts) {
					break
				}
			} while (attempts < maxAttempts)

			return newColor
		}

		let color = null

		if (!highlightRanges.has(id)) {
			color = randomColor()
		} else {
			color = highlightRanges.get(id)['--z-highlight-color']
		}

		if (state && sheet.celldata.get(r)) {
			sheet.celldata.get(r)[c] = value
			highlight.state = 0
		}

		highlightRanges.set(id, {
			border: `1px solid ${color}`,
			top: (totalOffsetTop + modifiedBefore - 0.5) * sheet.config.zoom + 'px',
			left: (totaloffsetLeft + modifiedColBefore - 0.5) * sheet.config.zoom + 'px',
			height: (totleHeight + modifiedInRange + 1) * sheet.config.zoom + 'px',
			width: (totleWidth + modifiedColInRange + 1) * sheet.config.zoom + 'px',
			'--z-highlight-color': color,
		})

		return highlightRanges.get(id)
	}

	// 计算选区类型
	const rangeClass = computed(() => {
		if (!selecting.value && !ranged.value) return ''

		// 判断是否是单个单元格
		const isSingleCell = selecting.value
			? !dragging.value
			: ranged.value.start.row === ranged.value.end.row &&
			  ranged.value.start.col === ranged.value.end.col

		return isSingleCell ? 'selection-single' : 'selection-range'
	})

	// 计算选区样式
	const rangeStyle = computed(() => {
		if (!selecting.value && !ranged.value) return {}
		let startRow, endRow, startCol, endCol

		if (selecting.value || dragging.value) {
			// 正在拖动或移动框选选择时使用实时位置
			startRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
			endRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
			startCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
			endCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

			// 扩展选区以包含合并单元格
			const expandedRange = getExpandedRange(startRow, endRow, startCol, endCol)
			startRow = expandedRange.startRow
			endRow = expandedRange.endRow
			startCol = expandedRange.startCol
			endCol = expandedRange.endCol
		} else if (ranged.value) {
			// 使用已保存的选区
			startRow = Math.min(ranged.value.start.row, ranged.value.end.row)
			endRow = Math.max(ranged.value.start.row, ranged.value.end.row)
			startCol = Math.min(ranged.value.start.col, ranged.value.end.col)
			endCol = Math.max(ranged.value.start.col, ranged.value.end.col)
		}

		// 计算行高
		let totalOffsetTop = startRow * rowHeight
		let totleHeight = (endRow - startRow + 1) * rowHeight

		// 使用缓存计算修改的行的差值
		let modifiedBefore = 0
		let modifiedInRange = 0
		modifiedRowsCache().map.forEach((diff, row) => {
			if (row < startRow) {
				modifiedBefore += diff
			} else if (row >= startRow && row <= endRow) {
				modifiedInRange += diff
			}
		})

		// 计算列宽
		let totaloffsetLeft = startCol * colWidth
		let totleWidth = (endCol - startCol + 1) * colWidth

		// 使用缓存计算修改的列的差值
		let modifiedColBefore = 0
		let modifiedColInRange = 0
		modifiedColsCache().map.forEach((diff, col) => {
			if (col < startCol) {
				modifiedColBefore += diff
			} else if (col >= startCol && col <= endCol) {
				modifiedColInRange += diff
			}
		})

		const zoom = sheet.config.zoom

		return {
			top: `${(totalOffsetTop + modifiedBefore) * zoom}px`,
			left: `${(totaloffsetLeft + modifiedColBefore) * zoom}px`,
			height: `${(totleHeight + modifiedInRange) * zoom}px`,
			width: `${(totleWidth + modifiedColInRange) * zoom}px`,
		}
	})

	// 计算选区序号和字母样式
	const setSelectionClass = (row, col) => {
		if (!ranged.value) return

		const rowIndex = row?.rowIndex
		const colIndex = col?.colIndex

		// 判断是否在拖拽或框选状态
		const moving = selecting.value || dragging.value

		let startRow, startCol, endRow, endCol

		// 根据状态选择使用的范围
		if (moving) {
			startRow = selectionStart.value.row
			startCol = selectionStart.value.col
			endRow = selectionEnd.value.row
			endCol = selectionEnd.value.col
		} else {
			// 使用ranged.value，如果没有选区则直接返回
			if (ranged.value.start.row === -1 || ranged.value.end.row === -1) {
				return false
			}
			startRow = ranged.value.start.row
			startCol = ranged.value.start.col
			endRow = ranged.value.end.row
			endCol = ranged.value.end.col
		}

		// 计算实际的起始和结束位置
		const minRow = Math.min(startRow, endRow)
		const maxRow = Math.max(startRow, endRow)
		const minCol = Math.min(startCol, endCol)
		const maxCol = Math.max(startCol, endCol)

		if (maxRow === sheet.config.rowCount - 1) {
			return minCol === maxCol && minCol === colIndex && maxCol === colIndex
		}

		if (maxCol === sheet.config.colCount - 1) {
			return minRow === maxRow && minRow === rowIndex && maxRow === rowIndex
		}

		// 直接判断是否在范围内
		if (row) {
			return rowIndex >= minRow && rowIndex <= maxRow
		}

		if (col) {
			return colIndex >= minCol && colIndex <= maxCol
		}

		return false
	}

	// 限制范围在最大值内
	const limitRange = (pos) => {
		if (!pos) return null

		// 确保不超过最大行列数
		const maxRow = sheet.config.rowCount - 1
		const maxCol = sheet.config.colCount - 1

		return {
			row: Math.min(Math.max(0, pos.row), maxRow),
			col: Math.min(Math.max(0, pos.col), maxCol),
			mergedCell: pos.mergedCell,
		}
	}

	// 事件处理
	const handleMouseDown = (e) => {
		if (e.button !== 0) return // 只处理左键点击

		mouseDownPos.value = {x: e.clientX, y: e.clientY}

		// 只处理带有cell类的元素
		if (!e.target.classList.contains('cell')) return

		const pos = limitRange(getCellPosition(e))

		if (!pos) return
		if (pos.row > sheet.config.rowCount - 1 || pos.col > sheet.config.colCount - 1) return

		selecting.value = true
		dragging.value = false

		selectionStart.value = pos
		selectionEnd.value = pos

		// 如果起始点在合并单元格内，扩展初始选区
		if (pos.mergedCell) {
			const expanded = getExpandedRange(pos.row, pos.row, pos.col, pos.col)
			selectionStart.value = {
				row: expanded.startRow,
				col: expanded.startCol,
			}
			selectionEnd.value = {
				row: expanded.endRow,
				col: expanded.endCol,
			}
		}

		ranged.value = {
			start: selectionStart.value,
			end: selectionEnd.value,
		}
	}

	const handleMouseMove = (e) => {
		if (!selecting.value || dragging.value) return

		const currentPos = limitRange(getCellPosition(e))
		if (
			!currentPos ||
			currentPos.row > sheet.config.rowCount - 1 ||
			currentPos.col > sheet.config.colCount - 1
		)
			return

		// 获取当前选区范围
		const startRow = Math.min(selectionStart.value.row, currentPos.row)
		const endRow = Math.max(selectionStart.value.row, currentPos.row)
		const startCol = Math.min(selectionStart.value.col, currentPos.col)
		const endCol = Math.max(selectionStart.value.col, currentPos.col)

		if (startRow < 0 || startCol < 0) {
			return
		}

		const expanded = getExpandedRange(startRow, endRow, startCol, endCol)

		// 更新选区的结束位置，根据拖动方向决定使用expanded的哪个边界
		selectionEnd.value = {
			row: currentPos.row < selectionStart.value.row ? expanded.startRow : expanded.endRow,
			col: currentPos.col < selectionStart.value.col ? expanded.startCol : expanded.endCol,
		}

		// 更新选区，确保不超过最大范围
		ranged.value = {
			start: {
				row: Math.max(0, expanded.startRow),
				col: Math.max(0, expanded.startCol),
			},
			end: {
				row: Math.min(sheet.config.rowCount - 1, expanded.endRow),
				col: Math.min(sheet.config.colCount - 1, expanded.endCol),
			},
		}
	}

	const handleMouseUp = () => {
		if (!selecting.value) return
		// 结束选择状态
		selecting.value = false
	}

	// 处理拖拽开始
	const handleDragStart = (e) => {
		if (!ranged.value) return // 如果没有选区，不进行拖拽

		e.preventDefault()
		dragging.value = true
		selecting.value = false

		// 获取拖拽起始位置的单元格
		const pos = limitRange(getCellPosition(e))
		if (!pos || pos.row > sheet.config.rowCount - 1 || pos.col > sheet.config.colCount - 1)
			return

		// 保存当前选区作为起始点
		selectionStart.value = {...ranged.value.start}
		// 设置拖拽点为结束点
		selectionEnd.value = pos
	}

	// 处理拖拽移动
	const handleDragMove = (e) => {
		if (!dragging.value || selecting.value) return

		const currentPos = limitRange(getCellPosition(e))
		if (
			!currentPos ||
			currentPos.row > sheet.config.rowCount - 1 ||
			currentPos.col > sheet.config.colCount - 1
		)
			return

		// 获取当前选区范围
		const startRow = Math.min(selectionStart.value.row, currentPos.row)
		const endRow = Math.max(selectionStart.value.row, currentPos.row)
		const startCol = Math.min(selectionStart.value.col, currentPos.col)
		const endCol = Math.max(selectionStart.value.col, currentPos.col)

		if (startRow < 0 || startCol < 0) {
			return
		}

		// 扩展选区以包含所有相关的合并单元格
		const expanded = getExpandedRange(startRow, endRow, startCol, endCol)

		// 更新选区的结束位置，使用当前鼠标位置来决定方向
		selectionEnd.value = {
			row: currentPos.row < selectionStart.value.row ? expanded.startRow : expanded.endRow,
			col: currentPos.col < selectionStart.value.col ? expanded.startCol : expanded.endCol,
		}

		// 更新选区，确保不超过最大范围
		ranged.value = {
			start: {
				row: Math.max(0, expanded.startRow),
				col: Math.max(0, expanded.startCol),
			},
			end: {
				row: Math.min(sheet.config.rowCount - 1, expanded.endRow),
				col: Math.min(sheet.config.colCount - 1, expanded.endCol),
			},
		}
	}

	// 处理拖拽结束
	const handleDragEnd = () => {
		if (!dragging.value) return

		dragging.value = false

		selectionStart.value = {...ranged.value.start}
		selectionEnd.value = {...ranged.value.end}
	}

	// 设置选区范围
	const setRange = async (
		startRow,
		startCol,
		endRow = 0,
		endCol = 0,
		force = false,
		callback = null,
		isClear = true
	) => {
		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook.findMergedCell?.(startRow, startCol)
		if (mergedCell && !force) {
			ranged.value = {
				start: {
					row: mergedCell.row,
					col: mergedCell.col,
				},
				end: {
					row: mergedCell.row + mergedCell.rowspan - 1,
					col: mergedCell.col + mergedCell.colspan - 1,
				},
			}
		} else {
			ranged.value = {
				start: {
					row: startRow,
					col: startCol,
				},
				end: {
					row: endRow,
					col: endCol,
				},
			}
		}

		setTimeout(() => {
			if (typeof callback === 'function') {
				callback(ranged.value)
				isClear && clear()
			}
		}, 16)
	}

	// 根据鼠标位置获取单元格
	const getRangeByMouse = (e) => {
		const pos = limitRange(getCellPosition(e))
		if (!pos) return null
		return pos
	}

	// 获取框选范围的起始单元格
	const getStartCell = () => {
		if (!ranged.value) return null

		const {start} = ranged.value
		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook.findMergedCell?.(start.row, start.col)
		if (mergedCell) {
			return {
				row: mergedCell.row,
				col: mergedCell.col,
				mergedCell,
			}
		}
		return start
	}

	const getEndCell = () => {
		if (!ranged.value) return null

		const {end} = ranged.value
		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook.findMergedCell?.(end.row, end.col)
		if (mergedCell) {
			return {
				row: mergedCell.row + mergedCell.rowspan - 1,
				col: mergedCell.col + mergedCell.colspan - 1,
				mergedCell,
			}
		}
		return end
	}

	// 快速获取选区数据
	const getRangeData = () => {
		const startRow = Math.min(ranged.value.start.row, ranged.value.end.row)
		const endRow = Math.max(ranged.value.start.row, ranged.value.end.row)
		const startCol = Math.min(ranged.value.start.col, ranged.value.end.col)
		const endCol = Math.max(ranged.value.start.col, ranged.value.end.col)
		return {
			startRow,
			endRow,
			startCol,
			endCol,
		}
	}

	// 状态栏显示的统计信息
	const getStatistics = () => {
		if (!ranged.value) return 0
		const {startRow, endRow, startCol, endCol} = getRangeData()

		let count = 0
		let sum = 0
		let values = []

		const mergedCells = new Set() // 用于记录已经计算过的合并单元格

		// 遍历选中区域的每个单元格
		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				// 检查当前位置是否在合并单元格内
				const mergedCell = useMergedCellsHook.findMergedCell(row, col)
				if (mergedCell) {
					// 生成合并单元格的唯一标识
					const mergedId = `${mergedCell.row}-${mergedCell.col}`
					// 如果这个合并单元格还没计算过，就计数
					if (!mergedCells.has(mergedId)) {
						//计数
						count++

						// 平均值
						const rowData = sheet.celldata.get(mergedCell.row)
						if (rowData) {
							const cellData = rowData[mergedCell.col]
							if (!isNaN(cellData)) {
								sum += parseFloat(cellData)
								values.push(parseFloat(cellData))
							}
						}
						mergedCells.add(mergedId)
					}
				} else {
					// 非合并单元格正常计数
					count++

					// 非合并单元格正常计算平均值
					const rowData = sheet.celldata.get(row)
					if (rowData) {
						const cellData = rowData[col]?.toString().trim()
						if (cellData && !isNaN(cellData)) {
							sum += parseFloat(cellData)
							values.push(parseFloat(cellData))
						}
					}
				}
			}
		}

		statistics.value = {
			count,
			sum,
			average: (sum / 2).toFixed(2),
			min: values.length > 0 ? Math.min(...values) : 0,
			max: values.length > 0 ? Math.max(...values) : 0,
		}
	}

	// 键盘事件
	const handleKeyDown = (e) => {
		const editing = container.querySelector('[contenteditable="true"]')
		if (editing || !ranged.value) return

		// 允许的特殊按键：方向键
		const allowedKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab']
		if (allowedKeys.includes(e.key)) {
			e.preventDefault()

			const key = e.key

			const moveLeft = () => {
				if (ranged.value.start.col === 0) return

				ranged.value = {
					start: {
						row: ranged.value.start.row,
						col: ranged.value.start.col - 1,
					},
					end: {
						row: ranged.value.end.row,
						col: ranged.value.end.col - 1,
					},
				}
			}

			const moveRight = () => {
				if (
					ranged.value.start.col === sheet.config.colCount - 1 ||
					ranged.value.end.col >= sheet.config.colCount - 1
				)
					return

				ranged.value = {
					start: {
						row: ranged.value.start.row,
						col: ranged.value.start.col + 1,
					},
					end: {
						row: ranged.value.end.row,
						col: ranged.value.end.col + 1,
					},
				}
			}

			const moveUp = () => {
				if (ranged.value.start.row === 0) return

				ranged.value = {
					start: {
						row: ranged.value.start.row - 1,
						col: ranged.value.start.col,
					},
					end: {
						row: ranged.value.end.row - 1,
						col: ranged.value.end.col,
					},
				}
			}

			const moveDown = () => {
				if (
					ranged.value.start.row === sheet.config.rowCount - 1 ||
					ranged.value.end.row >= sheet.config.rowCount - 1
				)
					return

				ranged.value = {
					start: {
						row: ranged.value.start.row + 1,
						col: ranged.value.start.col,
					},
					end: {
						row: ranged.value.end.row + 1,
						col: ranged.value.end.col,
					},
				}
			}

			switch (key) {
				case 'ArrowLeft':
					moveLeft()
					break
				case 'Tab':
				case 'ArrowRight':
					moveRight()
					break
				case 'ArrowUp':
					moveUp()
					break
				case 'ArrowDown':
					moveDown()
					break
			}
		}
	}

	const handleKeyUp = (e) => {}

	// 清除选区的方法
	const clear = () => {
		selecting.value = false
		dragging.value = false
		mouseDownPos.value = {x: 0, y: 0}
		selectionStart.value = {row: -1, col: -1}
		selectionEnd.value = {row: -1, col: -1}
		ranged.value = null
	}

	// 移除事件监听器
	const destroy = () => {
		clear()
		if (container) {
			worker.terminate()
			container.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleMouseUp)
			document.removeEventListener('mousemove', handleDragMove)
			document.removeEventListener('mouseup', handleDragEnd)
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)
		}
	}

	// 初始化
	const init = () => {
		container = document.querySelector(`#${containerId}`)
		if (!container) {
			console.error('请检查是否存在id为' + containerId + '的容器')
			return
		}

		const blob = new Blob([workerCode], {type: 'application/javascript'})
		const workerUrl = URL.createObjectURL(blob)
		worker = new Worker(workerUrl)
		worker.onmessage = (e) => {}

		// 基本鼠标事件
		container.addEventListener('mousedown', handleMouseDown)
		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('mouseup', handleMouseUp)

		// 拖拽相关事件
		document.addEventListener('mousemove', handleDragMove)
		document.addEventListener('mouseup', handleDragEnd)

		// 键盘相关事件
		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('keyup', handleKeyUp)
	}

	// 更新统计信息
	watch(
		() => [ranged.value, sheet.config.mergedCells],
		() => getStatistics()
	)

	return {
		// 状态
		selecting,
		dragging,
		ranged,

		// 计算属性
		rangeClass,
		rangeStyle,
		selectionStart,
		selectionEnd,
		statistics,

		//方法
		init,
		getStartCell,
		getEndCell,
		getRangeByMouse,
		getRangeData,
		setRange,
		setSelectionClass,
		setHighlightRange,
		drag: handleDragStart,
		clear,
		destroy,
	}
}
