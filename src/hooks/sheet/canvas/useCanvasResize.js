/**
 * Canvas 上的行列调整功能
 * 处理在 Canvas 绘制的行号和列字母上的拖动调整
 */
export const useCanvasResize = () => {
	let canvas = null
	let sheet = null
	let rowOverlay = null // 行号区域的覆盖层
	let colOverlay = null // 列字母区域的覆盖层
	let isResizing = false
	let resizeType = null // 'row' or 'col'
	let resizeIndex = null // 正在调整的行号或列号
	let startPos = 0 // 开始拖动时的鼠标位置
	let startSize = 0 // 开始拖动时的行高或列宽
	let currentSize = 0 // 当前的行高或列宽

	// 拖动热区大小（像素）
	const RESIZE_HANDLE_SIZE = 5

	/**
	 * 创建覆盖层
	 */
	const createOverlays = () => {
		const canvasParent = canvas.parentElement
		if (!canvasParent) return

		const zoom = sheet.config.zoom || 1
		const numberWidth = 35 * zoom
		const letterHeight = 25 * zoom

		// 创建行号区域覆盖层（左侧）
		rowOverlay = document.createElement('div')
		rowOverlay.style.position = 'absolute'
		rowOverlay.style.top = `${letterHeight}px`
		rowOverlay.style.left = '0'
		rowOverlay.style.width = `${numberWidth}px`
		rowOverlay.style.height = `calc(100% - ${letterHeight + 10}px)`
		rowOverlay.style.zIndex = '2' // 在 Canvas 上面
		rowOverlay.style.cursor = 'default'
		canvasParent.appendChild(rowOverlay)

		// 创建列字母区域覆盖层（顶部）
		colOverlay = document.createElement('div')
		colOverlay.style.position = 'absolute'
		colOverlay.style.top = '0'
		colOverlay.style.left = `${numberWidth}px`
		colOverlay.style.width = `calc(100% - ${numberWidth + 10}px)`
		colOverlay.style.height = `${letterHeight}px`
		colOverlay.style.zIndex = '2' // 在 Canvas 上面
		colOverlay.style.cursor = 'default'
		canvasParent.appendChild(colOverlay)

		// 添加事件监听
		rowOverlay.addEventListener('mousemove', handleMouseMove)
		rowOverlay.addEventListener('mousedown', handleMouseDown)
		rowOverlay.addEventListener('mouseup', handleMouseUp)
		rowOverlay.addEventListener('mouseleave', handleMouseLeave)

		colOverlay.addEventListener('mousemove', handleMouseMove)
		colOverlay.addEventListener('mousedown', handleMouseDown)
		colOverlay.addEventListener('mouseup', handleMouseUp)
		colOverlay.addEventListener('mouseleave', handleMouseLeave)

		// 全局监听鼠标移动和释放（用于拖动时）
		document.addEventListener('mousemove', handleDocumentMouseMove)
		document.addEventListener('mouseup', handleDocumentMouseUp)
	}

	/**
	 * 初始化
	 */
	const init = (canvasElement, sheetInstance) => {
		canvas = canvasElement
		sheet = sheetInstance

		if (!canvas) return

		// Canvas 保持 pointer-events: none，让事件穿透
		canvas.style.pointerEvents = 'none'

		// 创建覆盖层来处理行号和列字母的交互
		createOverlays()
	}

	/**
	 * 获取鼠标在 Canvas 上的坐标
	 */
	const getCanvasCoords = (e) => {
		const rect = canvas.getBoundingClientRect()
		const dpr = window.devicePixelRatio || 1
		return {
			x: (e.clientX - rect.left) * dpr,
			y: (e.clientY - rect.top) * dpr,
		}
	}

	/**
	 * 全局鼠标移动处理（用于拖动时）
	 */
	const handleDocumentMouseMove = (e) => {
		if (isResizing) {
			handleResize(e)
		}
	}

	/**
	 * 全局鼠标释放处理（用于拖动时）
	 */
	const handleDocumentMouseUp = () => {
		if (isResizing) {
			handleMouseUp()
		}
	}

	/**
	 * 检测鼠标是否在行边界附近（可拖动区域）
	 */
	const detectRowResize = (x, y, visibleRangeRef, scrollTop) => {
		if (!visibleRangeRef || !visibleRangeRef.visible) return null

		const zoom = sheet.config.zoom || 1
		const numberWidth = 35 * zoom
		const letterHeight = 25 * zoom
		const dpr = window.devicePixelRatio || 1

		// 检查是否在序号列区域内
		if (x > numberWidth * dpr) return null

		// 检查是否在字母行下方
		if (y < letterHeight * dpr) return null

		const {startRow, endRow} = visibleRangeRef.visible

		// 计算起始偏移量
		let offsetTop = 0
		for (let i = 0; i < startRow; i++) {
			offsetTop += sheet.hooks?.resizeHook?.getRowHeight(i) || sheet.config.rowHeight * zoom
		}

		const adjustedOffsetTop = offsetTop - scrollTop + letterHeight

		// 遍历可见行，检测鼠标是否在行边界附近
		let currentY = adjustedOffsetTop
		for (let row = startRow; row < endRow; row++) {
			const rowHeight =
				sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom
			const rowBottom = (currentY + rowHeight) * dpr

			// 检查鼠标是否在行底部边界附近
			if (Math.abs(y - rowBottom) < RESIZE_HANDLE_SIZE * dpr) {
				return {row, currentY, rowHeight}
			}

			currentY += rowHeight
		}

		return null
	}

	/**
	 * 检测鼠标是否在列边界附近（可拖动区域）
	 */
	const detectColResize = (x, y, visibleRangeRef, scrollLeft) => {
		if (!visibleRangeRef || !visibleRangeRef.visible) return null

		const zoom = sheet.config.zoom || 1
		const numberWidth = 35 * zoom
		const letterHeight = 25 * zoom
		const dpr = window.devicePixelRatio || 1

		// 检查是否在字母行区域内
		if (y > letterHeight * dpr) return null

		// 检查是否在序号列右侧
		if (x < numberWidth * dpr) return null

		const {startCol, endCol} = visibleRangeRef.visible

		// 计算起始偏移量
		let offsetLeft = 0
		for (let i = 0; i < startCol; i++) {
			offsetLeft += sheet.hooks?.resizeHook?.getColWidth(i) || sheet.config.colWidth * zoom
		}

		const adjustedOffsetLeft = offsetLeft - scrollLeft + numberWidth

		// 遍历可见列，检测鼠标是否在列边界附近
		let currentX = adjustedOffsetLeft
		for (let col = startCol; col < endCol; col++) {
			const colWidth =
				sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom
			const colRight = (currentX + colWidth) * dpr

			// 检查鼠标是否在列右侧边界附近
			if (Math.abs(x - colRight) < RESIZE_HANDLE_SIZE * dpr) {
				return {col, currentX, colWidth}
			}

			currentX += colWidth
		}

		return null
	}

	/**
	 * 获取当前的滚动位置和可见范围
	 */
	const getCurrentRenderData = () => {
		const visibleRangeRef = sheet.hooks.canvasHook.getVisibleRange?.()
		if (!visibleRangeRef) return null

		return {
			visibleRangeRef,
			scrollTop: visibleRangeRef.scrollTop || 0,
			scrollLeft: visibleRangeRef.scrollLeft || 0,
		}
	}

	/**
	 * 鼠标移动事件处理
	 */
	const handleMouseMove = (e) => {
		if (!sheet || !sheet.hooks?.canvasHook) return
		if (isResizing) return // 拖动时由全局处理

		const renderData = getCurrentRenderData()
		if (!renderData) return

		const {x, y} = getCanvasCoords(e)
		const {visibleRangeRef, scrollTop, scrollLeft} = renderData

		// 检测是否在可拖动区域，更新鼠标样式
		const rowResize = detectRowResize(x, y, visibleRangeRef, scrollTop)
		const colResize = detectColResize(x, y, visibleRangeRef, scrollLeft)

		if (rowResize) {
			rowOverlay.style.cursor = 'ns-resize'
		} else if (colResize) {
			colOverlay.style.cursor = 'ew-resize'
		} else {
			if (rowOverlay) rowOverlay.style.cursor = 'default'
			if (colOverlay) colOverlay.style.cursor = 'default'
		}
	}

	/**
	 * 鼠标按下事件处理
	 */
	const handleMouseDown = (e) => {
		if (!sheet || !sheet.hooks?.canvasHook) return

		const renderData = getCurrentRenderData()
		if (!renderData) return

		const {x, y} = getCanvasCoords(e)
		const {visibleRangeRef, scrollTop, scrollLeft} = renderData

		// 检测是否点击在可拖动区域
		const rowResize = detectRowResize(x, y, visibleRangeRef, scrollTop)
		const colResize = detectColResize(x, y, visibleRangeRef, scrollLeft)

		if (rowResize) {
			// 开始调整行高
			isResizing = true
			resizeType = 'row'
			resizeIndex = rowResize.row
			startPos = e.clientY
			startSize = rowResize.rowHeight
			currentSize = startSize
			e.preventDefault()
		} else if (colResize) {
			// 开始调整列宽
			isResizing = true
			resizeType = 'col'
			resizeIndex = colResize.col
			startPos = e.clientX
			startSize = colResize.colWidth
			currentSize = startSize
			e.preventDefault()
		}
	}

	/**
	 * 拖动调整处理
	 */
	const handleResize = (e) => {
		if (!isResizing) return

		const renderData = getCurrentRenderData()
		if (!renderData) return

		const {visibleRangeRef, scrollTop, scrollLeft} = renderData
		const zoom = sheet.config.zoom || 1
		const minRowHeight = 25 * zoom
		const minColWidth = 100 * zoom

		if (resizeType === 'row') {
			const delta = e.clientY - startPos
			currentSize = Math.max(minRowHeight, startSize + delta)

			// 临时更新行高（不保存到配置）
			sheet.hooks.resizeHook.setRowHeight(resizeIndex, currentSize / zoom)

			// 触发 canvas 重绘
			const selectedCell = sheet.hooks?.selectionRangeHook?.getRanged()
			sheet.hooks.canvasHook.render(visibleRangeRef, scrollTop, scrollLeft, selectedCell)
		} else if (resizeType === 'col') {
			const delta = e.clientX - startPos
			currentSize = Math.max(minColWidth, startSize + delta)

			// 临时更新列宽（不保存到配置）
			sheet.hooks.resizeHook.setColWidth(resizeIndex, currentSize / zoom)

			// 触发 canvas 重绘
			const selectedCell = sheet.hooks?.selectionRangeHook?.getRanged()
			sheet.hooks.canvasHook.render(visibleRangeRef, scrollTop, scrollLeft, selectedCell)
		}
	}

	/**
	 * 鼠标释放事件处理
	 */
	const handleMouseUp = () => {
		if (!isResizing) return

		// 保存最终的行高或列宽
		if (resizeType === 'row') {
			sheet.hooks.resizeHook.setRowHeight(resizeIndex, currentSize / (sheet.config.zoom || 1))
		} else if (resizeType === 'col') {
			sheet.hooks.resizeHook.setColWidth(resizeIndex, currentSize / (sheet.config.zoom || 1))
		}

		// 重置状态
		isResizing = false
		resizeType = null
		resizeIndex = null
		startPos = 0
		startSize = 0
		currentSize = 0

		if (rowOverlay) rowOverlay.style.cursor = 'default'
		if (colOverlay) colOverlay.style.cursor = 'default'
	}

	/**
	 * 鼠标离开覆盖层事件处理
	 */
	const handleMouseLeave = () => {
		if (!isResizing) {
			if (rowOverlay) rowOverlay.style.cursor = 'default'
			if (colOverlay) colOverlay.style.cursor = 'default'
		}
	}

	/**
	 * 销毁
	 */
	const destroy = () => {
		// 移除覆盖层事件监听
		if (rowOverlay) {
			rowOverlay.removeEventListener('mousemove', handleMouseMove)
			rowOverlay.removeEventListener('mousedown', handleMouseDown)
			rowOverlay.removeEventListener('mouseup', handleMouseUp)
			rowOverlay.removeEventListener('mouseleave', handleMouseLeave)
			rowOverlay.remove()
			rowOverlay = null
		}

		if (colOverlay) {
			colOverlay.removeEventListener('mousemove', handleMouseMove)
			colOverlay.removeEventListener('mousedown', handleMouseDown)
			colOverlay.removeEventListener('mouseup', handleMouseUp)
			colOverlay.removeEventListener('mouseleave', handleMouseLeave)
			colOverlay.remove()
			colOverlay = null
		}

		// 移除全局事件监听
		document.removeEventListener('mousemove', handleDocumentMouseMove)
		document.removeEventListener('mouseup', handleDocumentMouseUp)

		canvas = null
		sheet = null
	}

	return {
		init,
		destroy,
	}
}
