// 渲染状态
let renderState = {
	isRunning: false,
	data: null,
	cache: new Map(), // 添加缓存
	chunkSize: 100, // 分块大小
	lastVisibleRange: null, // 上次可见范围
}

// 计算缓冲区范围
const calculateBufferRange = (startRow, endRow, startCol, endCol, buffer) => {
	const bufferStartRow = Math.max(0, startRow - buffer)
	const bufferEndRow = endRow + buffer

	const bufferStartCol = Math.max(0, startCol - buffer)
	const bufferEndCol = endCol + buffer

	return {
		startRow: bufferStartRow,
		endRow: bufferEndRow,
		startCol: bufferStartCol,
		endCol: bufferEndCol,
	}
}

// 分块计算函数
const calculateChunkedRange = (startRow, endRow, startCol, endCol) => {
	const chunks = []
	for (let row = startRow; row < endRow; row += renderState.chunkSize) {
		for (let col = startCol; col < endCol; col += renderState.chunkSize) {
			const chunkEndRow = Math.min(row + renderState.chunkSize, endRow)
			const chunkEndCol = Math.min(col + renderState.chunkSize, endCol)
			chunks.push({
				startRow: row,
				endRow: chunkEndRow,
				startCol: col,
				endCol: chunkEndCol,
			})
		}
	}
	return chunks
}

// 计算可见范围
const calculateVisibleRange = (data) => {
	const {
		scrollTop,
		scrollLeft,
		viewportHeight,
		viewportWidth,
		rowCount,
		colCount,
		defaultRowHeight,
		defaultColWidth,
		rowHeights,
		colWidths,
		buffer,
		mergedCells = {},
	} = data

	// 计算行范围
	const calculateRowRange = () => {
		let startRow = 0
		let accHeight = 0
		let totalHeight = 0

		// 计算总高度
		for (let i = 0; i < rowCount; i++) {
			totalHeight += rowHeights?.[i] || defaultRowHeight
		}

		// 找到起始行
		while (startRow < rowCount) {
			const rowHeight = rowHeights?.[startRow] || defaultRowHeight
			if (accHeight + rowHeight > scrollTop) {
				break
			}
			accHeight += rowHeight
			startRow++
		}

		// 添加上方缓冲区
		const bufferRows = buffer
		startRow = Math.max(0, startRow - bufferRows)

		let endRow = startRow
		let visibleHeight = 0

		// 计算可见行数，增加底部缓冲区
		while (
			endRow < rowCount &&
			visibleHeight < viewportHeight + defaultRowHeight * bufferRows
		) {
			const rowHeight = rowHeights?.[endRow] || defaultRowHeight
			visibleHeight += rowHeight
			endRow++
		}

		// 特殊处理：如果接近底部，确保显示所有数据
		if (scrollTop + viewportHeight >= totalHeight - viewportHeight / 2) {
			endRow = rowCount
		}

		// 确保不超出总行数
		endRow = Math.min(rowCount, endRow + bufferRows)

		return {startRow, endRow, totalHeight}
	}

	// 计算列范围
	const calculateColRange = () => {
		let startCol = 0
		let accWidth = 0
		let totalWidth = 0

		// 计算总宽度
		for (let i = 0; i < colCount; i++) {
			totalWidth += colWidths?.[i] || defaultColWidth
		}

		// 找到起始列
		while (startCol < colCount) {
			const colWidth = colWidths?.[startCol] || defaultColWidth
			if (accWidth + colWidth > scrollLeft) {
				break
			}
			accWidth += colWidth
			startCol++
		}

		// 添加左侧缓冲区
		const bufferCols = buffer
		startCol = Math.max(0, startCol - bufferCols)

		let endCol = startCol
		let visibleWidth = 0

		// 计算可见列数，增加右侧缓冲区
		while (endCol < colCount && visibleWidth < viewportWidth + defaultColWidth * bufferCols) {
			const colWidth = colWidths?.[endCol] || defaultColWidth
			visibleWidth += colWidth
			endCol++
		}

		// 特殊处理：如果接近右边界，确保显示所有列
		if (scrollLeft + viewportWidth >= totalWidth - viewportWidth / 2) {
			endCol = colCount
		}

		// 确保不超出总列数
		endCol = Math.min(colCount, endCol + bufferCols)

		return {startCol, endCol, totalWidth}
	}

	const rowRange = calculateRowRange()
	const colRange = calculateColRange()

	let startRow = rowRange.startRow
	let startCol = colRange.startCol
	let endRow = rowRange.endRow
	let endCol = colRange.endCol

	for (let [key, value] of Object.entries(mergedCells)) {
		const [rowIndex, colIndex] = key.split('-').map(Number)

		if (startRow - rowIndex < value.rowspan && startRow >= rowIndex) {
			startRow = rowIndex
		}

		if (startCol - colIndex < value.colspan && startCol >= colIndex) {
			startCol = colIndex
		}
	}

	// 计算缓冲区
	const bufferRange = calculateBufferRange(startRow, endRow, startCol, endCol, buffer)

	// 分块计算
	const chunks = calculateChunkedRange(startRow, endRow, startCol, endCol)

	return {
		visible: {startRow, endRow, startCol, endCol},
		buffer: bufferRange,
		chunks,
	}
}

// 渲染计算
const calculateRender = (data) => {
	const range = calculateVisibleRange(data)

	return {
		startRow: range.visible.startRow,
		endRow: range.visible.endRow,
		startCol: range.visible.startCol,
		endCol: range.visible.endCol,
		buffer: range.buffer,
		chunks: range.chunks,
	}
}

// 监听消息
self.onmessage = (event) => {
	const {type, data, requestId} = event.data

	if (type === 'render_request') {
		try {
			// 直接计算渲染结果
			const result = calculateRender(data)

			// 发送响应
			self.postMessage({
				type: 'render_response',
				requestId,
				data: result,
			})
		} catch (error) {
			self.postMessage({
				type: 'error',
				requestId,
				data: error.message,
			})
		}
	}
}
