export const workerCode = `
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
		// 确保缓冲区上下对称
		const bufferStartRow = Math.max(0, startRow - buffer)
		const bufferEndRow = Math.min(renderState.data.rowCount, endRow + buffer)

		const bufferStartCol = Math.max(0, startCol - buffer)
		const bufferEndCol = Math.min(renderState.data.colCount, endCol + buffer)

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
		renderState.data = data
		const {
			scrollTop,
			scrollLeft,
			viewportHeight,
			viewportWidth,
			rowCount,
			colCount,
			buffer = 5,
			defaultRowHeight,
			defaultColWidth,
			rowHeights = {},
			colWidths = {},
			mergedCells = {},
		} = data

		// 计算可见行范围
		let accHeight = 0 // 用于确定可视区域的起始位置
		let startRow = 0
		let endRow = 0
		let totalHeight = 0 // 整个表格的最终总高度

		// 先计算总高度
		for (let i = 0; i < rowCount; i++) {
			const height = rowHeights[i] || defaultRowHeight
			totalHeight += height

			if (accHeight <= scrollTop) {
				startRow = i
			}

			accHeight += height

			if (accHeight >= scrollTop + viewportHeight && endRow === 0) {
				endRow = i + 1
			}
		}

		// 如果没有找到结束行，设置为最后一行
		if (endRow === 0) {
			endRow = rowCount
		}

		// 计算可见列范围
		let accWidth = 0
		let startCol = 0
		let endCol = 0
		let totalWidth = 0

		for (let i = 0; i < colCount; i++) {
			const width = colWidths[i] || defaultColWidth
			totalWidth += width

			if (accWidth <= scrollLeft) {
				startCol = i
			}

			accWidth += width

			if (accWidth >= scrollLeft + viewportWidth && endCol === 0) {
				endCol = i + 1
			}
		}

		// 如果没有找到结束列，设置为最后一列
		if (endCol === 0) {
			endCol = colCount
		}

		// 计算缓冲区
		const bufferRange = calculateBufferRange(startRow, endRow, startCol, endCol, buffer)

		// ✅ 性能优化：保存原始的实际可视范围（用于渲染普通单元格）
		const actualVisibleRange = {
			startRow: bufferRange.startRow,
			endRow: bufferRange.endRow,
			startCol: bufferRange.startCol,
			endCol: bufferRange.endCol,
		}

		// 收集与可视范围有交集的合并单元格信息
		const mergedCellsInView = []
		for (const key in mergedCells) {
			const [row, col] = key.split('-').map(Number)
			const { rs, cs } = mergedCells[key]
			const mergeEndRow = row + rs
			const mergeEndCol = col + cs

			// 检查是否与实际可视范围有交集
			const rowIntersects = row < bufferRange.endRow && mergeEndRow > bufferRange.startRow
			const colIntersects = col < bufferRange.endCol && mergeEndCol > bufferRange.startCol

			if (rowIntersects && colIntersects) {
				mergedCellsInView.push({
					r: row,
					c: col,
					rs: rs,
					cs: cs,
					key: key
				})
			}
		}

		return {
			// 实际可视范围（用于渲染普通单元格，性能优化）
			actualVisible: actualVisibleRange,
			// 合并单元格信息（用于渲染超长合并单元格）
			mergedCellsInView: mergedCellsInView,
			// 保持向后兼容，visible 使用实际可视范围
			visible: actualVisibleRange,
			metrics: {
				accHeight,
				totalHeight,
				accWidth,
				totalWidth,
			}
		}
	}
	
	// ✅ 性能优化：移除 expandRangeForMergedCells 方法
	// 现在直接在 calculateVisibleRange 中收集合并单元格信息，不再扩展渲染范围

	// 渲染计算
	const calculateRender = (data) => {
		const range = calculateVisibleRange(data)

		return {
			visible: range.visible,
			actualVisible: range.actualVisible,
			mergedCellsInView: range.mergedCellsInView,
			metrics: range.metrics
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
`
