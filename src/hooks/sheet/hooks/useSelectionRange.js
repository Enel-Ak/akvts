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

export const useSelectionRange = () => {
	let sheet = null
	// 基础配置
	let worker = null
	let container = null
	let mouseDownPos = {x: 0, y: 0}
	let selection = {r: -1, c: -1, rr: -1, cc: -1}

	// 选区状态管理
	const selecting = ref(false)
	const dragging = ref(false)

	const ranged = shallowRef({r: -1, c: -1, rr: -1, cc: -1})
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
			const rowCurrentHeight = sheet.hooks.resizeHook.getRowHeight(row)
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
			const colCurrentWidth = sheet.hooks.resizeHook.getColWidth(col)
			if (currentWidth + colCurrentWidth > x) {
				break
			}
			currentWidth += colCurrentWidth
			col++
		}

		// 检查是否在合并单元格内
		const mergedCell = sheet.hooks.mergeHook.findMergedCell?.(row, col)
		if (mergedCell) {
			return {
				r: mergedCell.r,
				c: mergedCell.c,
				mergedCell,
			}
		}
		return {r: row, c: col}
	}

	// 获取包含合并单元格的矩形区域
	const getExpandedRange = (r, c, rr, cc) => {
		let finalStartRow = r
		let finalEndRow = rr
		let finalStartCol = c
		let finalEndCol = cc

		// 检查选区边界上的合并单元格
		const checkBoundary = (row, col) => {
			const mergedCell = sheet.hooks.mergeHook.findMergedCell(row, col)
			if (mergedCell) {
				finalStartRow = Math.min(finalStartRow, mergedCell.r)
				finalEndRow = Math.max(finalEndRow, mergedCell.r + mergedCell.rowspan - 1)
				finalStartCol = Math.min(finalStartCol, mergedCell.c)
				finalEndCol = Math.max(finalEndCol, mergedCell.c + mergedCell.colspan - 1)
				return true
			}
			return false
		}

		// 检查选区的四个边界
		for (let row = r; row <= rr; row++) {
			checkBoundary(row, c)
			checkBoundary(row, cc)
		}
		for (let col = c; col <= cc; col++) {
			checkBoundary(r, col)
			checkBoundary(rr, col)
		}

		// 如果边界发生变化，递归检查新的边界
		if (
			finalStartRow !== r ||
			finalEndRow !== rr ||
			finalStartCol !== c ||
			finalEndCol !== cc
		) {
			return getExpandedRange(finalStartRow, finalStartCol, finalEndRow, finalEndCol)
		}

		return {
			r: finalStartRow,
			rr: finalEndRow,
			c: finalStartCol,
			cc: finalEndCol,
		}
	}

	// 缓存修改过的行和列的信息
	const modifiedRowsCache = () => {
		const before = new Map()
		let beforeSum = 0
		Object.entries(sheet.hooks.resizeHook.rowHeights).forEach(([row, height]) => {
			const rowNum = Number(row)
			const diff = height - sheet.props.rowHeight
			before.set(rowNum, diff)
			beforeSum += diff
		})
		return {map: before, sum: beforeSum}
	}

	const modifiedColsCache = () => {
		const before = new Map()
		let beforeSum = 0
		Object.entries(sheet.hooks.resizeHook.colWidths).forEach(([col, width]) => {
			const colNum = Number(col)
			const diff = width - sheet.props.colWidth
			before.set(colNum, diff)
			beforeSum += diff
		})
		return {map: before, sum: beforeSum}
	}

	const highlightRanges = new Map()
	const setHighlightRange = (highlight) => {
		const {id, r, c, rr, cc, value, state} = highlight

		// 计算行高
		let totalOffsetTop = r * sheet.props.rowHeight
		let totleHeight = (rr - r + 1) * sheet.props.rowHeight

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
		let totaloffsetLeft = c * sheet.props.colWidth
		let totleWidth = (cc - c + 1) * sheet.props.colWidth

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
			: ranged.value.r === ranged.value.rr && ranged.value.c === ranged.value.cc

		return isSingleCell ? 'selection-single' : 'selection-range'
	})

	// 计算选区样式
	const rangeStyle = computed(() => {
		if (!selecting.value && !ranged.value) return {}

		const {r, c, rr, cc} = ranged.value
		let sr = Math.min(r, rr)
		let er = Math.max(r, rr)
		let sc = Math.min(c, cc)
		let ec = Math.max(c, cc)

		if (selecting.value || dragging.value) {
			// 扩展选区以包含合并单元格
			const expand = getExpandedRange(sr, sc, er, ec)
			sr = expand.r
			er = expand.rr
			sc = expand.c
			ec = expand.cc
		}

		// 计算行高
		let totalOffsetTop = sr * sheet.props.rowHeight
		let totleHeight = (er - sr + 1) * sheet.props.rowHeight

		// 使用缓存计算修改的行的差值
		let modifiedBefore = 0
		let modifiedInRange = 0
		modifiedRowsCache().map.forEach((diff, row) => {
			if (row < sr) {
				modifiedBefore += diff
			} else if (row >= sr && row <= er) {
				modifiedInRange += diff
			}
		})

		// 计算列宽
		let totaloffsetLeft = sc * sheet.props.colWidth
		let totleWidth = (ec - sc + 1) * sheet.props.colWidth

		// 使用缓存计算修改的列的差值
		let modifiedColBefore = 0
		let modifiedColInRange = 0
		modifiedColsCache().map.forEach((diff, col) => {
			if (col < sc) {
				modifiedColBefore += diff
			} else if (col >= sc && col <= ec) {
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
		const {r, c, rr, cc} = ranged.value
		let sr, sc, er, ec

		// 根据状态选择使用的范围
		if (moving) {
			sr = selection.r
			sc = selection.c
			er = selection.rr
			ec = selection.cc
		} else {
			// 使用ranged.value，如果没有选区则直接返回
			if (r === -1 || rr === -1) {
				return false
			}
			sr = r
			sc = c
			er = rr
			ec = cc
		}

		// 计算实际的起始和结束位置
		const minRow = Math.min(sr, er)
		const maxRow = Math.max(sr, er)
		const minCol = Math.min(sc, ec)
		const maxCol = Math.max(sc, ec)

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
			r: Math.min(Math.max(0, pos.r), maxRow),
			c: Math.min(Math.max(0, pos.c), maxCol),
			mergedCell: pos.mergedCell,
		}
	}

	// 鼠标点击处理
	const handleMouseDown = (e) => {
		if (e.button !== 0) return // 只处理左键点击

		mouseDownPos = {x: e.clientX, y: e.clientY}

		// 只处理带有cell类的元素
		if (!e.target.classList.contains('cell')) return

		const pos = limitRange(getCellPosition(e))

		if (!pos) return
		if (pos.r > sheet.config.rowCount - 1 || pos.c > sheet.config.colCount - 1) return

		selecting.value = true
		dragging.value = false

		// 没有合并单元格，直接设置选区
		selection = {
			r: pos.r,
			c: pos.c,
			rr: pos.r,
			cc: pos.c,
		}

		// 如果起始点在合并单元格内，扩展初始选区
		if (pos.mergedCell) {
			const expanded = getExpandedRange(pos.r, pos.c, pos.r, pos.c)
			selection = {...expanded}
		}

		// 点击单元格
		ranged.value = {...selection}
	}

	// 鼠标移动处理
	const handleMouseMove = (e) => {
		// 移动选择时候, 不是拖拽
		if (!selecting.value || dragging.value) return

		const currentPos = limitRange(getCellPosition(e))

		if (
			!currentPos ||
			currentPos.r > sheet.config.rowCount - 1 ||
			currentPos.c > sheet.config.colCount - 1
		)
			return

		// 获取当前选区范围
		const sr = Math.min(selection.r, currentPos.r)
		const er = Math.max(selection.rr, currentPos.r)
		const sc = Math.min(selection.c, currentPos.c)
		const ec = Math.max(selection.cc, currentPos.c)

		if (sr < 0 || sc < 0) {
			return
		}

		const expanded = getExpandedRange(sr, sc, er, ec)
		// 没有变化，直接返回, 不触发computed
		const {r, c, rr, cc} = ranged.value
		if (r === expanded.r && c === expanded.c && rr === expanded.rr && cc === expanded.cc) {
			return
		}
		// 更新选区，确保不超过最大范围
		ranged.value = {...expanded}
	}

	// 鼠标抬起
	const handleMouseUp = () => {
		if (!selecting.value) return
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
		if (!pos || pos.r > sheet.config.rowCount - 1 || pos.c > sheet.config.colCount - 1) return

		// 保存当前选区作为起始点
		selection = {...ranged.value, rr: pos.r, cc: pos.c}
	}

	// 处理拖拽移动
	const handleDragMove = (e) => {
		if (!dragging.value || selecting.value) return

		const currentPos = limitRange(getCellPosition(e))
		if (
			!currentPos ||
			currentPos.r > sheet.config.rowCount - 1 ||
			currentPos.c > sheet.config.colCount - 1
		)
			return

		// 获取当前选区范围
		const sr = Math.min(selection.r, currentPos.r)
		const er = Math.max(selection.rr, currentPos.r)
		const sc = Math.min(selection.c, currentPos.c)
		const ec = Math.max(selection.cc, currentPos.c)

		if (sr < 0 || sc < 0) {
			return
		}

		// 扩展选区以包含所有相关的合并单元格
		const expanded = getExpandedRange(sr, sc, er, ec)

		// 更新选区的结束位置，使用当前鼠标位置来决定方向
		selection.rr = currentPos.r < selection.r ? expanded.rr : expanded.r
		selection.cc = currentPos.c < selection.c ? expanded.cc : expanded.c

		// 没有变化，直接返回, 不触发computed
		const {r, c, rr, cc} = ranged.value
		if (r === expanded.r && c === expanded.c && rr === expanded.rr && cc === expanded.cc) {
			return
		}

		// 更新选区，确保不超过最大范围
		ranged.value = {
			r: Math.max(0, expanded.r),
			c: Math.max(0, expanded.c),
			rr: Math.min(sheet.config.rowCount - 1, expanded.rr),
			cc: Math.min(sheet.config.colCount - 1, expanded.cc),
		}
	}

	// 处理拖拽结束
	const handleDragEnd = () => {
		if (!dragging.value) return
		dragging.value = false
		selection = {...ranged.value}
	}

	// 设置选区范围
	const setRange = async (
		r,
		c,
		rr = 0,
		cc = 0,
		force = false,
		callback = null,
		isClear = true
	) => {
		// 检查是否在合并单元格内
		const mc = sheet.hooks.mergeHook.findMergedCell?.(r, c)
		if (mc && !force) {
			ranged.value = {
				r: mc.r,
				c: mc.c,
				rr: mc.r + mc.rowspan - 1,
				cc: mc.c + mc.colspan - 1,
			}
		} else {
			ranged.value = {
				r,
				c,
				rr,
				cc,
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

		const {r, c} = ranged.value
		// 检查是否在合并单元格内
		const mergedCell = sheet.hooks.mergeHook.findMergedCell?.(r, c)
		if (mergedCell) {
			return {
				r: mergedCell.row,
				c: mergedCell.col,
				mergedCell,
			}
		}
		return {r, c}
	}

	// 获取框选范围的结束单元格
	const getEndCell = () => {
		if (!ranged.value) return null

		const {rr, cc} = ranged.value
		// 检查是否在合并单元格内
		const mergedCell = sheet.hooks.mergedCellsHook.findMergedCell?.(rr, cc)
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
		return {
			r: Math.min(ranged.value.r, ranged.value.rr),
			c: Math.min(ranged.value.c, ranged.value.cc),
			rr: Math.max(ranged.value.r, ranged.value.rr),
			cc: Math.max(ranged.value.c, ranged.value.cc),
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
				const mergedCell = sheet.hooks.mergedCellsHook.findMergedCell(row, col)
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
				if (ranged.value.c === 0) return

				ranged.value = {
					r: ranged.value.r,
					c: ranged.value.c - 1,
					rr: ranged.value.rr,
					cc: ranged.value.cc - 1,
				}
			}

			const moveRight = () => {
				if (
					ranged.value.c === sheet.config.colCount - 1 ||
					ranged.value.cc >= sheet.config.colCount - 1
				)
					return

				ranged.value = {
					r: ranged.value.r,
					c: ranged.value.c + 1,
					rr: ranged.value.rr,
					cc: ranged.value.cc + 1,
				}
			}

			const moveUp = () => {
				if (ranged.value.r === 0) return

				ranged.value = {
					r: ranged.value.r - 1,
					c: ranged.value.c,
					rr: ranged.value.rr - 1,
					cc: ranged.value.cc,
				}
			}

			const moveDown = () => {
				if (
					ranged.value.r === sheet.config.rowCount - 1 ||
					ranged.value.rr >= sheet.config.rowCount - 1
				)
					return

				ranged.value = {
					r: ranged.value.r + 1,
					c: ranged.value.c,
					rr: ranged.value.rr + 1,
					cc: ranged.value.cc,
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
		mouseDownPos = {x: 0, y: 0}
		selection = {r: -1, c: -1, rr: -1, cc: -1}
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
	const init = (containerId, reactiveSheet) => {
		sheet = reactiveSheet

		setTimeout(() => {
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

			setTimeout(() => console.log('installed useSelectionRange'), 16)
		}, 16)

		return {
			// 状态
			selecting,
			dragging,
			ranged,

			// 计算属性
			rangeClass,
			rangeStyle,
			statistics,

			//方法

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

	// 更新统计信息
	// watch(
	// 	() => [ranged.value, sheet.config.mergedCells],
	// 	() => getStatistics()
	// )

	return {
		init,
	}
}
