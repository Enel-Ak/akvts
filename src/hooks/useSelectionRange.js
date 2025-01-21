import {computed, ref} from 'vue'
import {useEventListener} from '@vueuse/core'
import {createMergedCellsManager} from '@/hooks/useMergedCells'

export const useSelectionRange = (containerEl, config = {}) => {
	const mergedCellsManager = createMergedCellsManager()

	// 选区状态
	let container = null
	const mouseDownPos = ref({x: 0, y: 0})
	const isDragging = ref(false) // 用于框选拖动
	const isRangeDragging = ref(false) // 用于选区拖拽
	const selecting = ref(false)
	const selectionStart = ref({row: -1, col: -1})
	const selectionEnd = ref({row: -1, col: -1})
	const getRanged = ref(null)
	const clickThreshold = 5 // 移动距离阈值，小于这个值认为是点击

	// 拖拽位置
	const dragStartPos = ref(null)
	const dragStartRange = ref(null)

	// 配置参数
	let rowHeight = 25
	let colWidth = 100

	// 获取单元格位置
	const getCellPosition = (e) => {
		const rect = container.getBoundingClientRect()
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		const row = Math.floor(y / rowHeight)
		const col = Math.floor(x / colWidth)

		// 检查是否在合并单元格内
		const mergedCell = mergedCellsManager.findMergedCell(row, col)
		if (mergedCell) {
			// 如果在合并单元格内，返回合并单元格的起始位置
			return {
				row: mergedCell.row,
				col: mergedCell.col,
				mergedCell,
			}
		}

		return {row, col}
	}

	// 添加计算属性判断选区类型
	const getRangeClass = computed(() => {
		if (!selecting.value && !getRanged.value) return ''

		// 判断是否是单个单元格
		const isSingleCell = selecting.value
			? !isDragging.value
			: getRanged.value.start.row === getRanged.value.end.row &&
			  getRanged.value.start.col === getRanged.value.end.col

		return isSingleCell ? 'selection-single' : 'selection-range'
	})

	// 获取包含合并单元格的矩形区域
	const getExpandedRange = (startRow, endRow, startCol, endCol) => {
		let finalStartRow = startRow
		let finalEndRow = endRow
		let finalStartCol = startCol
		let finalEndCol = endCol

		// 遍历选区内的所有单元格
		for (let row = startRow; row <= endRow; row++) {
			for (let col = startCol; col <= endCol; col++) {
				const mergedCell = mergedCellsManager.findMergedCell(row, col)
				if (mergedCell) {
					// 扩展选区以包含整个合并单元格
					finalStartRow = Math.min(finalStartRow, mergedCell.row)
					finalEndRow = Math.max(finalEndRow, mergedCell.row + mergedCell.rowSpan - 1)
					finalStartCol = Math.min(finalStartCol, mergedCell.col)
					finalEndCol = Math.max(finalEndCol, mergedCell.col + mergedCell.colSpan - 1)
				}
			}
		}

		return {
			startRow: finalStartRow,
			endRow: finalEndRow,
			startCol: finalStartCol,
			endCol: finalEndCol,
		}
	}

	// 计算选区样式
	const getRangeStyle = computed(() => {
		if (!selecting.value && !getRanged.value) return {}

		let startRow, endRow, startCol, endCol

		if (selecting.value && isDragging.value) {
			// 正在拖动选择时使用实时位置
			startRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
			endRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
			startCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
			endCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

			// 扩展选区以包含所有相关的合并单元格
			const expandedRange = getExpandedRange(startRow, endRow, startCol, endCol)
			startRow = expandedRange.startRow
			endRow = expandedRange.endRow
			startCol = expandedRange.startCol
			endCol = expandedRange.endCol
		} else if (selecting.value && !isDragging.value) {
			// 点击但未拖动时，检查是否在合并单元格内
			const mergedCell = mergedCellsManager.findMergedCell(
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
		} else {
			// 使用已保存的选区
			startRow = Math.min(getRanged.value.start.row, getRanged.value.end.row)
			endRow = Math.max(getRanged.value.start.row, getRanged.value.end.row)
			startCol = Math.min(getRanged.value.start.col, getRanged.value.end.col)
			endCol = Math.max(getRanged.value.start.col, getRanged.value.end.col)

			// 扩展已保存的选区以包含所有相关的合并单元格
			const expandedRange = getExpandedRange(startRow, endRow, startCol, endCol)
			startRow = expandedRange.startRow
			endRow = expandedRange.endRow
			startCol = expandedRange.startCol
			endCol = expandedRange.endCol
		}

		const left = startCol * colWidth
		const top = startRow * rowHeight
		const width = (endCol - startCol + 1) * colWidth
		const height = (endRow - startRow + 1) * rowHeight

		return {
			left: `${left}px`,
			top: `${top}px`,
			width: `${width - 1}px`,
			height: `${height}px`,
		}
	})

	// 处理鼠标事件
	const handleMouseDown = (e) => {
		if (e.button !== 0) return // 只处理左键
		const pos = getCellPosition(e)
		mouseDownPos.value = {x: e.clientX, y: e.clientY}
		isDragging.value = false

		// 检查是否点击在现有选区内
		if (getRanged.value) {
			const {start, end} = getRanged.value
			const startRow = Math.min(start.row, end.row)
			const endRow = Math.max(start.row, end.row)
			const startCol = Math.min(start.col, end.col)
			const endCol = Math.max(start.col, end.col)

			// 只有在点击选区外时才清除选区
			if (pos.row < startRow || pos.row > endRow || pos.col < startCol || pos.col > endCol) {
				getRanged.value = null
			}
		}

		selecting.value = true
		// 如果是合并单元格，设置选区为整个合并单元格
		if (pos.mergedCell) {
			const {row, col, rowSpan, colSpan} = pos.mergedCell
			selectionStart.value = {row, col}
			selectionEnd.value = {row: row + rowSpan - 1, col: col + colSpan - 1}
		} else {
			selectionStart.value = pos
			selectionEnd.value = pos
		}
	}

	const handleMouseMove = (e) => {
		if (!selecting.value) return

		// 计算移动距离
		const deltaX = Math.abs(e.clientX - mouseDownPos.value.x)
		const deltaY = Math.abs(e.clientY - mouseDownPos.value.y)

		// 如果移动距离超过阈值，标记为拖动选择
		if (deltaX > clickThreshold || deltaY > clickThreshold) {
			isDragging.value = true
		}

		const pos = getCellPosition(e)

		if (pos.row >= 0 && pos.col >= 0) {
			// 如果当前位置在合并单元格内，扩展选区到整个合并单元格
			if (pos.mergedCell) {
				const {row, col, rowSpan, colSpan} = pos.mergedCell
				selectionEnd.value = {
					row: row + rowSpan - 1,
					col: col + colSpan - 1,
				}
			} else {
				selectionEnd.value = pos
			}
		}
	}

	const handleMouseUp = () => {
		if (!selecting.value) return

		selecting.value = false

		// 如果是点击而不是拖动，只选中单个单元格
		if (!isDragging.value) {
			getRanged.value = {
				start: {...selectionStart.value},
				end: {...selectionStart.value}, // 结束位置和开始位置相同
			}
		} else {
			// 如果是拖动，保存整个选区
			getRanged.value = {
				start: {...selectionStart.value},
				end: {...selectionEnd.value},
			}
		}

		isDragging.value = false
	}

	// 处理拖拽开始
	const handleDragStart = (e) => {
		if (!getRanged.value) return // 如果没有选区，不进行拖拽

		e.preventDefault()
		isRangeDragging.value = true
		dragStartPos.value = {
			x: e.clientX,
			y: e.clientY,
		}
		dragStartRange.value = JSON.parse(JSON.stringify(getRanged.value)) // 深拷贝保存初始状态

		// 添加全局鼠标事件监听
		useEventListener(document, 'mousemove', handleDragMove)
		useEventListener(document, 'mouseup', handleDragEnd)
	}

	// 处理拖拽移动
	const handleDragMove = (e) => {
		if (!isRangeDragging.value || !getRanged.value) return

		const rect = container.getBoundingClientRect()
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		// 计算新的结束位置，确保不会出现负值
		const newEndCol = Math.max(0, Math.floor(x / colWidth))
		const newEndRow = Math.max(0, Math.floor(y / rowHeight))

		// 检查是否在合并单元格内
		const mergedCell = mergedCellsManager.findMergedCell(newEndRow, newEndCol)
		if (mergedCell) {
			getRanged.value.end = {
				row: mergedCell.row + mergedCell.rowSpan - 1,
				col: mergedCell.col + mergedCell.colSpan - 1,
			}
		} else {
			getRanged.value.end = {
				row: newEndRow,
				col: newEndCol - 1,
			}
		}
	}

	// 处理拖拽结束
	const handleDragEnd = () => {
		isRangeDragging.value = false
		dragStartPos.value = null
		dragStartRange.value = null

		// 移除全局鼠标事件监听
		document.removeEventListener('mousemove', handleDragMove)
		document.removeEventListener('mouseup', handleDragEnd)
	}

	// 清除选区的方法
	const clear = () => {
		selecting.value = false
		getRanged.value = null
		selectionStart.value = {row: -1, col: -1}
		selectionEnd.value = {row: -1, col: -1}
	}

	const init = () => {
		container = containerEl
		rowHeight = config.rowHeight || rowHeight
		colWidth = config.colWidth || colWidth

		useEventListener(container, 'mousedown', handleMouseDown)
		useEventListener(window, 'mousemove', handleMouseMove)
		useEventListener(window, 'mouseup', handleMouseUp)
	}

	const destroy = () => {
		clear()
		useEventListener(container, 'mousedown', handleMouseDown)
		useEventListener(window, 'mousemove', handleMouseMove)
		useEventListener(window, 'mouseup', handleMouseUp)
	}

	init()

	return {
		getRanged,
		selecting,
		getRangeStyle,
		getRangeClass,
		drag: handleDragStart,
		clear,
		destroy,
	}
}
