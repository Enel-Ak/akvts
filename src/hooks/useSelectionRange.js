import {computed, onMounted, ref, nextTick} from 'vue'
import {useEventListener} from '@vueuse/core'

export const useSelectionRange = (containerId, config = {}) => {
	// 基础配置
	let container = null
	let useMergedCellsHook = null
	let rowHeight = config.rowHeight
	let colWidth = config.colWidth

	// 选区状态管理
	const selecting = ref(false)
	const isDragging = ref(false)
	const isRangeDragging = ref(false)
	const mouseDownPos = ref({x: 0, y: 0})
	const selectionStart = ref({row: -1, col: -1})
	const selectionEnd = ref({row: -1, col: -1})
	const ranged = ref(null)

	// 点击阈值
	const clickThreshold = 5

	// 获取单元格位置
	const getCellPosition = (e) => {
		const rect = container.getBoundingClientRect()
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		const row = Math.floor(y / rowHeight)
		const col = Math.floor(x / colWidth)

		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook?.findMergedCell?.(row, col)
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
				finalEndRow = Math.max(finalEndRow, mergedCell.row + mergedCell.rowSpan - 1)
				finalStartCol = Math.min(finalStartCol, mergedCell.col)
				finalEndCol = Math.max(finalEndCol, mergedCell.col + mergedCell.colSpan - 1)
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

	// 计算选区类型
	const rangeClass = computed(() => {
		if (!selecting.value && !ranged.value) return ''

		// 判断是否是单个单元格
		const isSingleCell = selecting.value
			? !isDragging.value
			: ranged.value.start.row === ranged.value.end.row &&
			  ranged.value.start.col === ranged.value.end.col

		return isSingleCell ? 'selection-single' : 'selection-range'
	})

	// 计算选区样式
	const rangeStyle = computed(() => {
		if (!selecting.value && !ranged.value) return {}

		let startRow, endRow, startCol, endCol

		if (selecting.value && isDragging.value) {
			// 正在拖动选择时使用实时位置
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
		} else if (selecting.value && !isDragging.value) {
			// 点击但未拖动时，检查是否在合并单元格内
			const mergedCell = useMergedCellsHook.findMergedCell(
				selectionStart.value.row,
				selectionStart.value.col
			)
			if (mergedCell) {
				startRow = mergedCell.row
				endRow = mergedCell.row + mergedCell.rowSpan - 1
				startCol = mergedCell.col
				endCol = mergedCell.col + mergedCell.colSpan - 1
			} else {
				startRow = endRow = selectionStart.value.row
				startCol = endCol = selectionStart.value.col
			}
		} else if (ranged.value) {
			// 使用已保存的选区
			startRow = Math.min(ranged.value.start.row, ranged.value.end.row)
			endRow = Math.max(ranged.value.start.row, ranged.value.end.row)
			startCol = Math.min(ranged.value.start.col, ranged.value.end.col)
			endCol = Math.max(ranged.value.start.col, ranged.value.end.col)
		}

		return {
			top: `${startRow * rowHeight}px`,
			left: `${startCol * colWidth}px`,
			height: `${(endRow - startRow + 1) * rowHeight}px`,
			width: `${(endCol - startCol + 1) * colWidth}px`,
		}
	})

	// 事件处理
	const handleMouseDown = (e) => {
		if (e.button !== 0) return // 只处理左键点击

		const pos = getCellPosition(e)
		mouseDownPos.value = {x: e.clientX, y: e.clientY}
		selecting.value = true
		isDragging.value = false
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
	}

	const handleMouseMove = (e) => {
		if (!selecting.value) return

		const currentPos = getCellPosition(e)
		if (
			!currentPos ||
			typeof currentPos.row === 'undefined' ||
			typeof currentPos.col === 'undefined'
		)
			return

		const deltaX = Math.abs(e.clientX - mouseDownPos.value.x)
		const deltaY = Math.abs(e.clientY - mouseDownPos.value.y)

		// 判断是否超过点击阈值
		if (!isDragging.value && (deltaX > clickThreshold || deltaY > clickThreshold)) {
			isDragging.value = true
		}

		if (isDragging.value) {
			// 获取当前选区范围
			const startRow = Math.min(selectionStart.value.row, currentPos.row)
			const endRow = Math.max(selectionStart.value.row, currentPos.row)
			const startCol = Math.min(selectionStart.value.col, currentPos.col)
			const endCol = Math.max(selectionStart.value.col, currentPos.col)

			// 扩展选区以包含所有相关的合并单元格
			const expanded = getExpandedRange(startRow, endRow, startCol, endCol)

			selectionEnd.value = {
				row:
					currentPos.row < selectionStart.value.row ? expanded.startRow : expanded.endRow,
				col:
					currentPos.col < selectionStart.value.col ? expanded.startCol : expanded.endCol,
			}
		}
	}

	const handleMouseUp = () => {
		if (selecting.value) {
			ranged.value = {
				start: {...selectionStart.value},
				end: {...selectionEnd.value},
			}
			// 结束选择状态
			selecting.value = false
			isDragging.value = false
		}
	}

	// 处理拖拽开始
	const handleDragStart = (e) => {
		if (!ranged.value) return // 如果没有选区，不进行拖拽

		e.preventDefault()
		isRangeDragging.value = true
		selecting.value = true

		// 获取拖拽起始位置的单元格
		const pos = getCellPosition(e)
		if (!pos) return

		// 保存当前选区作为起始点
		selectionStart.value = {...ranged.value.start}
		// 设置拖拽点为结束点
		selectionEnd.value = pos
	}

	// 处理拖拽移动
	const handleDragMove = (e) => {
		if (!isRangeDragging.value || !selecting.value) return

		const currentPos = getCellPosition(e)
		if (!currentPos) return

		// 更新选区的结束位置
		selectionEnd.value = currentPos

		// 获取当前选区范围
		const startRow = Math.min(selectionStart.value.row, currentPos.row)
		const endRow = Math.max(selectionStart.value.row, currentPos.row)
		const startCol = Math.min(selectionStart.value.col, currentPos.col)
		const endCol = Math.max(selectionStart.value.col, currentPos.col)

		// 扩展选区以包含所有相关的合并单元格
		const expanded = getExpandedRange(startRow, endRow, startCol, endCol)

		// 更新选区
		ranged.value = {
			start: {
				row: expanded.startRow,
				col: expanded.startCol,
			},
			end: {
				row: expanded.endRow,
				col: expanded.endCol,
			},
		}
	}

	// 处理拖拽结束
	const handleDragEnd = () => {
		if (isRangeDragging.value) {
			isRangeDragging.value = false
			selecting.value = false
			// 保持最终的选区状态
			selectionStart.value = {...ranged.value.start}
			selectionEnd.value = {...ranged.value.end}
		}
	}

	// 清除选区的方法
	const clear = () => {
		selecting.value = false
		isDragging.value = false
		isRangeDragging.value = false
		mouseDownPos.value = {x: 0, y: 0}
		selectionStart.value = {row: -1, col: -1}
		selectionEnd.value = {row: -1, col: -1}
		ranged.value = null

		// 正确移除事件监听器
		if (container) {
			container.removeEventListener('mousedown', handleMouseDown)
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleMouseUp)
			document.removeEventListener('mousemove', handleDragMove)
			document.removeEventListener('mouseup', handleDragEnd)
		}
	}

	// 初始化
	const init = () => {
		container = document.querySelector(`#${containerId}`)
		if (!container) {
			console.error('请检查是否存在id为' + containerId + '的容器')
			return
		}

		rowHeight = config.rowHeight
		colWidth = config.colWidth
		useMergedCellsHook = config.useMergedCellsHook

		// 基本鼠标事件
		useEventListener(container, 'mousedown', handleMouseDown)
		useEventListener(window, 'mousemove', handleMouseMove)
		useEventListener(window, 'mouseup', handleMouseUp)

		// 拖拽相关事件
		document.addEventListener('mousemove', handleDragMove)
		document.addEventListener('mouseup', handleDragEnd)
	}

	onMounted(() => {
		nextTick(() => init())
	})

	return {
		// 状态
		selecting,
		isDragging,
		isRangeDragging,
		mouseDownPos,
		selectionStart,
		selectionEnd,
		ranged,
		// 计算属性
		rangeClass,
		rangeStyle,

		drag: handleDragStart,
		distory: clear,
	}
}
