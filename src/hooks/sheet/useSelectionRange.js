import {computed, ref} from 'vue'
import {useEventListener} from '@vueuse/core'

export const useSelectionRange = (containerId, config = {}) => {
	// 基础配置
	let worker = null
	let container = null
	const {maxRowCount, maxColCount, useMergedCellsHook, renderRange} = config
	const useResizeHook = config.useResizeHook

	// 选区状态管理
	const selecting = ref(false)
	const isDragging = ref(false)
	const isRangeDragging = ref(false)
	const mouseDownPos = ref({x: 0, y: 0})
	const selectionStart = ref({row: -1, col: -1})
	const selectionEnd = ref({row: -1, col: -1})
	const ranged = ref(null)

	// 计算序号、字母样式缓存
	const selectionClassMap = new Map()

	// 点击阈值
	const clickThreshold = 5

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

		// 计算到当前行的总高度（包括之前所有行的实际高度）
		let totalOffsetTop = 0
		for (let i = 0; i < startRow; i++) {
			totalOffsetTop += useResizeHook.getRowHeight(i)
		}

		let totaloffsetLeft = 0
		for (let i = 0; i < startCol; i++) {
			totaloffsetLeft += useResizeHook.getColWidth(i)
		}

		// 计算合并单元格的总高度
		let totleHeight = 0
		for (let i = startRow; i <= endRow; i++) {
			totleHeight += useResizeHook.getRowHeight(i)
		}

		let totleWidth = 0
		for (let i = startCol; i <= endCol; i++) {
			totleWidth += useResizeHook.getColWidth(i)
		}

		return {
			top: `${totalOffsetTop}px`,
			left: `${totaloffsetLeft}px`,
			height: `${totleHeight - 1}px`,
			width: `${totleWidth - 1}px`,
		}
	})

	// 计算选区序号和字母样式
	const setSelectionClass = (row, col) => {
		const rowIndex = row?.rowIndex
		const colIndex = col?.colIndex

		// 扩展选区以包含所有相关的合并单元格
		const {row: startRow, col: startCol} = selectionStart.value
		const {row: endRow, col: endCol} = selectionEnd.value

		// 先计算实际的起始和结束位置
		const minRow = Math.min(startRow, endRow)
		const maxRow = Math.max(startRow, endRow)
		const minCol = Math.min(startCol, endCol)
		const maxCol = Math.max(startCol, endCol)

		if (rowIndex !== undefined && selectionClassMap.get(`r${rowIndex}`)) {
			selectionClassMap.delete(`r${rowIndex}`)
			return true
		}

		if (colIndex !== undefined && selectionClassMap.get(`c${colIndex}`)) {
			selectionClassMap.delete(`c${colIndex}`)
			return true
		}

		// 使用实际的最小最大值来获取扩展范围
		const expanded = getExpandedRange(minRow, maxRow, minCol, maxCol)

		let bool = false

		if (row) {
			bool = rowIndex >= expanded.startRow && rowIndex <= expanded.endRow
			if (bool) {
				for (let i = expanded.startRow; i <= expanded.endRow; i++) {
					selectionClassMap.set(`r${i}`, true)
				}
			}
		}

		if (col) {
			bool = colIndex >= expanded.startCol && colIndex <= expanded.endCol
			if (bool) {
				for (let i = expanded.startCol; i <= expanded.endCol; i++) {
					selectionClassMap.set(`c${i}`, true)
				}
			}
		}
		return bool
	}

	// 限制范围在最大值内
	const limitRange = (pos) => {
		if (!pos) return pos
		return {
			row: Math.min(Math.max(0, pos.row), maxRowCount - 1),
			col: Math.min(Math.max(0, pos.col), maxColCount - 1),
			mergedCell: pos.mergedCell,
		}
	}

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

		// 检查是否超过点击阈值
		if (!isDragging.value) {
			const deltaX = Math.abs(e.clientX - mouseDownPos.value.x)
			const deltaY = Math.abs(e.clientY - mouseDownPos.value.y)

			if (deltaX > clickThreshold || deltaY > clickThreshold) {
				isDragging.value = true
			} else {
				return
			}
		}

		const currentPos = limitRange(getCellPosition(e))
		if (!currentPos) return

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
	}

	// 处理拖拽移动
	const handleDragMove = (e) => {
		if (!isRangeDragging.value || !selecting.value) return

		const currentPos = limitRange(getCellPosition(e))
		if (!currentPos) return

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
				row: Math.min(maxRowCount - 1, expanded.endRow),
				col: Math.min(maxColCount - 1, expanded.endCol),
			},
		}
	}

	const handleMouseUp = () => {
		if (selecting.value) {
			// 获取当前选区范围
			const startRow = Math.min(selectionStart.value.row, selectionEnd.value.row)
			const endRow = Math.max(selectionStart.value.row, selectionEnd.value.row)
			const startCol = Math.min(selectionStart.value.col, selectionEnd.value.col)
			const endCol = Math.max(selectionStart.value.col, selectionEnd.value.col)

			// 扩展选区以包含所有相关的合并单元格
			const expanded = getExpandedRange(startRow, endRow, startCol, endCol)

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

	// 设置选区范围
	const setRange = (startRow, startCol, endRow = startRow, endCol = startCol, force = false) => {
		selecting.value = true

		selectionClassMap.clear()

		// 检查是否在合并单元格内
		const mergedCell = useMergedCellsHook.findMergedCell?.(startRow, startCol)
		if (mergedCell && !force) {
			selectionStart.value = {
				row: mergedCell.row,
				col: mergedCell.col,
				mergedCell,
			}
			selectionEnd.value = {
				row: mergedCell.row + mergedCell.rowSpan - 1,
				col: mergedCell.col + mergedCell.colSpan - 1,
				mergedCell,
			}
		} else {
			// 设置选区起始位置
			selectionStart.value = {
				row: startRow,
				col: startCol,
			}

			// 设置选区结束位置
			selectionEnd.value = {
				row: endRow,
				col: endCol,
			}
		}

		console.log('设置选区范围', selectionStart.value, selectionEnd.value, mergedCell)
		selecting.value = false

		ranged.value = {
			start: {
				row: selectionStart.value.row,
				col: selectionStart.value.col,
			},
			end: {
				row: selectionEnd.value.row,
				col: selectionEnd.value.col,
			},
		}
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

	// 清除选区的方法
	const clear = () => {
		selecting.value = false
		isDragging.value = false
		isRangeDragging.value = false
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
		}
	}

	// 初始化
	const init = () => {
		container = document.querySelector(`#${containerId}`)
		if (!container) {
			console.error('请检查是否存在id为' + containerId + '的容器')
			return
		}

		worker = new Worker(new URL('./worker/SelectionRangeWorker.js', import.meta.url), {
			type: 'module',
		})

		// 基本鼠标事件
		useEventListener(container, 'mousedown', handleMouseDown)
		useEventListener(window, 'mousemove', handleMouseMove)
		useEventListener(window, 'mouseup', handleMouseUp)

		// 拖拽相关事件
		document.addEventListener('mousemove', handleDragMove)
		document.addEventListener('mouseup', handleDragEnd)
	}

	return {
		// 状态
		selecting,
		isDragging,
		ranged,

		// 计算属性
		rangeClass,
		rangeStyle,
		selectionStart,
		selectionEnd,

		//方法
		init,
		getStartCell,
		setRange,
		setSelectionClass,
		drag: handleDragStart,
		clear,
		destroy,
	}
}
