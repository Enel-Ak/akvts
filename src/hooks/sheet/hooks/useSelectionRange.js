import {computed, ref, shallowRef, watch, nextTick} from 'vue'
import {useAirSheetStore} from '../store/useAirSheet'

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
	const sheetStore = useAirSheetStore()
	let sheetKey = null
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

	// 缓存优化：避免重复计算
	let modifiedRowsCacheData = null
	let modifiedColsCacheData = null
	let cacheVersion = 0
	let rowResizeVersion = 0
	let colResizeVersion = 0

	// 获取单元格位置
	const getCellPosition = (e) => {
		const rect = container.getBoundingClientRect()
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		// 检查是否处于筛选状态
		const isFiltered = sheet.config?.filtered && sheet.config.filtered.length > 0
		const hasFilteredData = sheet.filterCellData && sheet.filterCellData.size > 0

		// 使用累加方式找到正确的行
		let currentHeight = 0
		let row = 0

		if (isFiltered && hasFilteredData) {
			// 筛选状态下，需要基于筛选后的数据计算行位置
			// 遍历筛选后的行，找到对应的物理位置
			const filteredRowCount = sheet.filterCellData.size
			let filteredRowIndex = 0

			while (currentHeight <= y && filteredRowIndex < filteredRowCount) {
				// 获取筛选后行对应的原始行号
				const originalRowIndex =
					sheet.rowMapping?.[filteredRowIndex]?.originalIndex ?? filteredRowIndex
				const rowCurrentHeight = sheet.hooks.resizeHook.getRowHeight(originalRowIndex)

				if (currentHeight + rowCurrentHeight > y) {
					break
				}
				currentHeight += rowCurrentHeight
				filteredRowIndex++
			}

			// 在筛选状态下，返回原始行号（用于样式操作）
			row = sheet.rowMapping?.[filteredRowIndex]?.originalIndex ?? filteredRowIndex
		} else {
			// 正常状态下的行计算
			while (currentHeight <= y) {
				const rowCurrentHeight = sheet.hooks.resizeHook.getRowHeight(row)
				if (currentHeight + rowCurrentHeight > y) {
					break
				}
				currentHeight += rowCurrentHeight
				row++
			}
		}

		// 使用累加方式计算列位置（列不受筛选影响）
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
	const getExpandedRange = (r, c, rr, cc, depth = 0) => {
		try {
			if (depth > 10) {
				console.warn('Maximum recursion depth reached', {r, c, rr, cc, depth})
				return {r, c, rr, cc}
			}

			depth++

			let finalStartRow = r
			let finalEndRow = rr
			let finalStartCol = c
			let finalEndCol = cc

			// 检查选区边界上的合并单元格
			const checkBoundary = (row, col) => {
				const mergedCell = sheet.hooks.mergeHook.findMergedCell(row, col)
				if (mergedCell) {
					finalStartRow = Math.min(finalStartRow, mergedCell.r)
					finalEndRow = Math.max(finalEndRow, mergedCell.r + mergedCell.rs)
					finalStartCol = Math.min(finalStartCol, mergedCell.c)
					finalEndCol = Math.max(finalEndCol, mergedCell.c + mergedCell.cs)
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
				(finalEndCol !== cc &&
					!(
						isNaN(finalStartRow) ||
						isNaN(finalEndRow) ||
						isNaN(finalStartCol) ||
						isNaN(finalEndCol)
					))
			) {
				return getExpandedRange(
					finalStartRow,
					finalStartCol,
					finalEndRow,
					finalEndCol,
					depth
				)
			}

			return {
				r: finalStartRow,
				rr: finalEndRow,
				c: finalStartCol,
				cc: finalEndCol,
				depth,
			}
		} catch (err) {
			console.log(err)
		}
	}

	// 缓存修改过的行和列的信息
	const modifiedRowsCache = () => {
		const currentVersion = Object.keys(sheet.config.rResize || {}).length
		if (modifiedRowsCacheData && rowResizeVersion === currentVersion) {
			return modifiedRowsCacheData
		}

		const before = new Map()
		let beforeSum = 0
		Object.entries(sheet.config.rResize || {}).forEach(([row, height]) => {
			const rowNum = Number(row)
			const diff = height - sheet.props.rowHeight
			before.set(rowNum, diff)
			beforeSum += diff
		})

		modifiedRowsCacheData = {map: before, sum: beforeSum}
		rowResizeVersion = currentVersion
		return modifiedRowsCacheData
	}

	const modifiedColsCache = () => {
		const currentVersion = Object.keys(sheet.config.cResize || {}).length
		if (modifiedColsCacheData && colResizeVersion === currentVersion) {
			return modifiedColsCacheData
		}

		const before = new Map()
		let beforeSum = 0
		Object.entries(sheet.config.cResize || {}).forEach(([col, width]) => {
			const colNum = Number(col)
			const diff = width - sheet.props.colWidth
			before.set(colNum, diff)
			beforeSum += diff
		})

		modifiedColsCacheData = {map: before, sum: beforeSum}
		colResizeVersion = currentVersion
		return modifiedColsCacheData
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

	// 优化的样式计算函数
	const calculateRangeStyle = (r, c, rr, cc) => {
		// 检查是否处于筛选状态
		const isFiltered = sheet.config?.filtered && sheet.config.filtered.length > 0
		const hasFilteredData = sheet.filterCellData && sheet.filterCellData.size > 0

		let totalOffsetTop = 0
		let totleHeight = 0

		if (isFiltered && hasFilteredData) {
			// 筛选状态下，需要计算选择范围在筛选视图中的位置
			// 找到选择范围中的行在筛选数据中的位置
			let filteredStartRow = -1
			let filteredEndRow = -1
			let visibleRowCount = 0

			// 遍历筛选后的行映射，找到选择范围对应的筛选行
			if (sheet.rowMapping) {
				sheet.rowMapping.forEach((mapping, filteredIndex) => {
					const originalIndex = mapping.originalIndex
					if (originalIndex >= r && originalIndex <= rr) {
						if (filteredStartRow === -1) {
							filteredStartRow = filteredIndex
						}
						filteredEndRow = filteredIndex
						visibleRowCount++
					}
				})
			}

			if (filteredStartRow !== -1) {
				// 计算筛选视图中的位置

				// 计算top位置：累加筛选视图中前面行的高度
				for (let i = 0; i < filteredStartRow; i++) {
					const originalRowIndex = sheet.rowMapping[i]?.originalIndex ?? i
					totalOffsetTop += sheet.hooks.resizeHook.getRowHeight(originalRowIndex)
				}

				// 计算height：累加选择范围内可见行的高度
				for (let i = filteredStartRow; i <= filteredEndRow; i++) {
					const originalRowIndex = sheet.rowMapping[i]?.originalIndex ?? i
					totleHeight += sheet.hooks.resizeHook.getRowHeight(originalRowIndex)
				}
			} else {
				// 选择的行在筛选结果中不可见，返回空样式
				return {
					height: '0px',
					width: '0px',
					display: 'none',
					transform: `translateY(0px) translateX(0px)`,
				}
			}
		} else {
			// 正常状态下的计算
			totalOffsetTop = r * sheet.props.rowHeight
			totleHeight = (rr - r + 1) * sheet.props.rowHeight

			// 处理行高调整
			const rowCache = modifiedRowsCache()
			if (rowCache.map.size > 0) {
				let modifiedBefore = 0
				let modifiedInRange = 0

				rowCache.map.forEach((diff, row) => {
					if (row < r) {
						modifiedBefore += diff
					} else if (row >= r && row <= rr) {
						modifiedInRange += diff
					}
				})

				totalOffsetTop += modifiedBefore
				totleHeight += modifiedInRange
			}
		}

		// 列的计算不受筛选影响
		let totaloffsetLeft = c * sheet.props.colWidth
		let totleWidth = (cc - c + 1) * sheet.props.colWidth

		const colCache = modifiedColsCache()
		if (colCache.map.size > 0) {
			let modifiedColBefore = 0
			let modifiedColInRange = 0

			colCache.map.forEach((diff, col) => {
				if (col < c) {
					modifiedColBefore += diff
				} else if (col >= c && col <= cc) {
					modifiedColInRange += diff
				}
			})

			totaloffsetLeft += modifiedColBefore
			totleWidth += modifiedColInRange
		}

		const zoom = sheet.config.zoom || 1

		return {
			height: `${totleHeight * zoom}px`,
			width: `${totleWidth * zoom}px`,
			transform: `translateY(${totalOffsetTop * zoom}px) translateX(${
				totaloffsetLeft * zoom
			}px)`,
		}
	}

	// 计算选区样式（优化版本）
	const rangeStyle = computed(() => {
		if (!selecting.value && !ranged.value) return {}

		const {r, c, rr, cc} = getRanged()
		let expand = {r, c, rr, cc}

		if (selecting.value || dragging.value) {
			// 扩展选区以包含合并单元格
			expand = getExpandedRange(r, c, rr, cc)
		}

		return calculateRangeStyle(expand.r, expand.c, expand.rr, expand.cc)
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

	// 防抖优化的鼠标移动处理
	let mouseMoveTimer = null
	let lastMouseMoveTime = 0
	const MOUSE_MOVE_THROTTLE = 16 // 约60fps

	const handleMouseMove = (e) => {
		// 移动选择时候, 不是拖拽
		if (!selecting.value || dragging.value) return

		const now = Date.now()
		if (now - lastMouseMoveTime < MOUSE_MOVE_THROTTLE) {
			// 使用防抖，避免过于频繁的更新
			clearTimeout(mouseMoveTimer)
			mouseMoveTimer = setTimeout(() => {
				handleMouseMoveInternal(e)
			}, MOUSE_MOVE_THROTTLE)
			return
		}

		lastMouseMoveTime = now
		handleMouseMoveInternal(e)
	}

	const handleMouseMoveInternal = (e) => {
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

		// 检查是否有变化，避免不必要的更新
		if (
			sr === ranged.value.r &&
			sc === ranged.value.c &&
			er === ranged.value.rr &&
			ec === ranged.value.cc
		) {
			return
		}

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

	// 处理拖拽移动（优化版本）
	let dragMoveTimer = null
	const handleDragMove = (e) => {
		if (!dragging.value || selecting.value) return

		// 使用节流优化拖拽性能
		if (dragMoveTimer) return

		dragMoveTimer = setTimeout(() => {
			dragMoveTimer = null
			handleDragMoveInternal(e)
		}, MOUSE_MOVE_THROTTLE)
	}

	const handleDragMoveInternal = (e) => {
		const currentPos = limitRange(getCellPosition(e))
		if (!currentPos) return

		// 检查是否处于筛选状态
		const isFiltered = sheet.config?.filtered && sheet.config.filtered.length > 0
		const hasFilteredData = sheet.filterCellData && sheet.filterCellData.size > 0

		// 在筛选状态下，需要使用筛选后的行数进行边界检查
		const maxRowCount =
			isFiltered && hasFilteredData ? sheet.filterCellData.size : sheet.config.rowCount
		const maxColCount = sheet.config.colCount

		if (currentPos.r >= maxRowCount || currentPos.c >= maxColCount) {
			return
		}

		let adjustedCurrentPos = currentPos
		let adjustedSelectionPos = selection

		if (isFiltered && hasFilteredData) {
			// 筛选状态下：需要将原始行号转换为筛选后的显示行号
			// getCellPosition返回的是原始行号，需要转换为筛选后的显示索引
			const currentOriginalRow = currentPos.r
			const selectionOriginalRow = selection.r

			// 查找原始行号对应的筛选后显示索引
			const currentFilteredIndex =
				sheet.rowMapping?.findIndex(
					(mapping) => mapping.originalIndex === currentOriginalRow
				) ?? -1
			const selectionFilteredIndex =
				sheet.rowMapping?.findIndex(
					(mapping) => mapping.originalIndex === selectionOriginalRow
				) ?? -1

			// 如果找到了对应的筛选索引，使用筛选后的索引进行计算
			if (currentFilteredIndex !== -1 && selectionFilteredIndex !== -1) {
				adjustedCurrentPos = {...currentPos, r: currentFilteredIndex}
				adjustedSelectionPos = {...selection, r: selectionFilteredIndex}
			}
		}

		// 获取当前选区范围（使用调整后的位置）
		const sr = Math.min(adjustedSelectionPos.r, adjustedCurrentPos.r)
		const er = Math.max(adjustedSelectionPos.r, adjustedCurrentPos.r)
		const sc = Math.min(adjustedSelectionPos.c, adjustedCurrentPos.c)
		const ec = Math.max(adjustedSelectionPos.c, adjustedCurrentPos.c)

		// 在筛选状态下，需要特殊处理合并单元格
		let expanded
		if (isFiltered && hasFilteredData) {
			// 筛选状态下，先将显示索引转换回原始索引进行合并单元格检查
			const srOriginal = sheet.rowMapping?.[sr]?.originalIndex ?? sr
			const erOriginal = sheet.rowMapping?.[er]?.originalIndex ?? er

			// 使用原始索引进行合并单元格扩展
			const originalExpanded = getExpandedRange(srOriginal, sc, erOriginal, ec)

			// 将扩展后的原始索引转换回显示索引
			const expandedStartFilteredIndex =
				sheet.rowMapping?.findIndex(
					(mapping) => mapping.originalIndex === originalExpanded.r
				) ?? -1
			const expandedEndFilteredIndex =
				sheet.rowMapping?.findIndex(
					(mapping) => mapping.originalIndex === originalExpanded.rr
				) ?? -1

			if (expandedStartFilteredIndex !== -1 && expandedEndFilteredIndex !== -1) {
				expanded = {
					r: expandedStartFilteredIndex,
					c: originalExpanded.c,
					rr: expandedEndFilteredIndex,
					cc: originalExpanded.cc,
				}
			} else {
				expanded = {r: sr, c: sc, rr: er, cc: ec}
			}
		} else {
			// 正常状态下的合并单元格处理
			expanded = getExpandedRange(sr, sc, er, ec)
		}

		// 检查是否有变化
		const {r, c, rr, cc} = ranged.value
		if (r === expanded.r && c === expanded.c && rr === expanded.rr && cc === expanded.cc) {
			return
		}

		// 更新选区，确保不超过最大范围
		ranged.value = {
			r: Math.max(0, expanded.r),
			c: Math.max(0, expanded.c),
			rr: Math.min(maxRowCount - 1, expanded.rr),
			cc: Math.min(maxColCount - 1, expanded.cc),
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
	const getRanged = () => {
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
		const {r, c, rr, cc} = getRanged()

		let count = 0
		let sum = 0
		let values = []

		const mergedCells = new Set() // 用于记录已经计算过的合并单元格

		// 遍历选中区域的每个单元格
		for (let row = r; row <= rr; row++) {
			for (let col = c; col <= cc; col++) {
				// 检查当前位置是否在合并单元格内
				const mergedCell = sheet.hooks.mergeHook.findMergedCell(row, col)
				if (mergedCell) {
					// 生成合并单元格的唯一标识
					const mergedId = `${mergedCell.r}-${mergedCell.c}`
					// 如果这个合并单元格还没计算过，就计数
					if (!mergedCells.has(mergedId)) {
						//计数
						count++

						// 平均值
						const rowData = sheet.celldata.get(mergedCell.r)
						if (rowData) {
							const cellData = rowData[mergedCell.c]
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
	// 清理缓存的函数
	const clearCache = () => {
		modifiedRowsCacheData = null
		modifiedColsCacheData = null
		cacheVersion = 0
		rowResizeVersion = 0
		colResizeVersion = 0
	}

	// 刷新选区计算，用于删除操作后的性能优化
	const refreshSelection = () => {
		// 清理缓存
		clearCache()

		// 如果当前有选区，重新计算选区样式
		if (ranged.value && ranged.value.r !== -1) {
			// 触发选区样式重新计算
			const currentRange = {...ranged.value}
			ranged.value = {r: -1, c: -1, rr: -1, cc: -1}

			// 使用 nextTick 确保 DOM 更新后再恢复选区
			nextTick(() => {
				ranged.value = currentRange
			})
		}
	}

	const destroy = () => {
		clear()

		// 清理定时器
		if (mouseMoveTimer) {
			clearTimeout(mouseMoveTimer)
			mouseMoveTimer = null
		}
		if (dragMoveTimer) {
			clearTimeout(dragMoveTimer)
			dragMoveTimer = null
		}

		// 清理缓存
		clearCache()

		if (container) {
			if (worker) {
				worker.terminate()
				worker = null
			}
			container.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleMouseUp)
			document.removeEventListener('mousemove', handleDragMove)
			document.removeEventListener('mouseup', handleDragEnd)
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)
			container = null
		}

		// 重置状态
		selecting.value = false
		dragging.value = false
		ranged.value = {r: -1, c: -1, rr: -1, cc: -1}
		selection = {r: -1, c: -1, rr: -1, cc: -1}
	}

	// 监听配置变化，清理缓存
	const watchConfigChanges = () => {
		if (sheet?.config) {
			watch(
				() => [sheet.config.rResize, sheet.config.cResize],
				() => {
					clearCache()
				},
				{deep: true}
			)
		}
	}

	// 初始化
	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)

		// 初始化缓存监听
		watchConfigChanges()

		setTimeout(() => {
			container = document.querySelector(`#${sheetKey}`)
			if (!container) {
				console.error('请检查是否存在id为' + sheetKey + '的容器')
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

			setTimeout(() => console.log('installed useSelectionRange with optimizations'), 16)
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
			getRanged,
			setRange,
			setSelectionClass,
			setHighlightRange,
			drag: handleDragStart,
			clear,
			clearCache,
			refreshSelection,
			destroy,
		}
	}

	// 更新统计信息
	watch(
		() => [ranged.value, sheet?.config.merged],
		() => getStatistics()
	)

	return {
		init,
	}
}
