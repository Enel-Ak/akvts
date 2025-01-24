// 渲染状态
let renderState = {
	isRunning: false,
	data: null,
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

		// 找到起始行
		while (startRow < rowCount) {
			const rowHeight = rowHeights?.[startRow] || defaultRowHeight
			if (accHeight + rowHeight > scrollTop) {
				break
			}
			accHeight += rowHeight
			startRow++
		}

		let endRow = startRow
		let visibleHeight = 0

		// 计算可见行数
		while (endRow < rowCount && visibleHeight < viewportHeight) {
			const rowHeight = rowHeights?.[endRow] || defaultRowHeight
			visibleHeight += rowHeight
			endRow++
		}

		return {startRow, endRow}
	}

	// 计算列范围
	const calculateColRange = () => {
		let startCol = 0
		let accWidth = 0

		// 找到起始列
		while (startCol < colCount) {
			const colWidth = colWidths?.[startCol] || defaultColWidth
			if (accWidth + colWidth > scrollLeft) {
				break
			}
			accWidth += colWidth
			startCol++
		}

		let endCol = startCol
		let visibleWidth = 0

		// 计算可见列数
		while (endCol < colCount && visibleWidth < viewportWidth) {
			const colWidth = colWidths?.[endCol] || defaultColWidth
			visibleWidth += colWidth
			endCol++
		}

		return {startCol, endCol}
	}

	const rowRange = calculateRowRange()
	const colRange = calculateColRange()

	let startRow = rowRange.startRow
	let startCol = colRange.startCol
	let endRow = rowRange.endRow
	let endCol = colRange.endCol

	for (let [key, value] of Object.entries(mergedCells)) {
		const [rowIndex, colIndex] = key.split('-').map(Number)

		if (startRow - rowIndex < value.rowSpan && startRow >= rowIndex) {
			startRow = rowIndex
		}

		if (startCol - colIndex < value.colSpan && startCol >= colIndex) {
			startCol = colIndex
		}
	}

	// 计算缓冲区
	const bufferRange = calculateBufferRange(startRow, endRow, startCol, endCol, buffer)

	return {
		visible: {startRow, endRow, startCol, endCol},
		buffer: bufferRange,
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
