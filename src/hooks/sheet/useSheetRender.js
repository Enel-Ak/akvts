import {ref} from 'vue'
const workerCode = `
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
		
		// 扩展可见范围以包含合并单元格
		const expandedRange = expandRangeForMergedCells(bufferRange, mergedCells, colCount, rowCount, colWidths, defaultColWidth)

		return {
			visible: {
				startRow: expandedRange.startRow,
				endRow: expandedRange.endRow,
				startCol: expandedRange.startCol,
				endCol: expandedRange.endCol,
			},
			metrics: {
				accHeight,
				totalHeight,
				accWidth,
				totalWidth,
			}
		}
	}
	
	// 扩展可见范围以包含合并单元格
	const expandRangeForMergedCells = (range, mergedCells, colCount, rowCount, colWidths, defaultColWidth) => {
		const { startRow, endRow, startCol, endCol } = range
		let expandedStartCol = startCol
		let expandedEndCol = endCol
		
		// 检查所有合并单元格
		for (const key in mergedCells) {
			const [row, col] = key.split('-').map(Number)
			const { rowspan, colspan } = mergedCells[key]
			
			// 如果合并单元格的行在可见范围内
			if (row >= startRow && row < endRow) {
				// 检查合并单元格是否跨越了左边界
				if (col < startCol && col + colspan > startCol) {
					expandedStartCol = Math.min(expandedStartCol, col)
				}
				
				// 检查合并单元格是否跨越了右边界
				if (col < endCol && col + colspan > endCol) {
					expandedEndCol = Math.max(expandedEndCol, col + colspan)
				}
			}
		}
		
		// 确保不超出表格范围
		expandedStartCol = Math.max(0, expandedStartCol)
		expandedEndCol = Math.min(colCount, expandedEndCol)
		
		return {
			startRow,
			endRow,
			startCol: expandedStartCol,
			endCol: expandedEndCol
		}
	}

	// 渲染计算
	const calculateRender = (data) => {
		const range = calculateVisibleRange(data)

		return {
			visible: {
				startRow: range.visible.startRow,
				endRow: range.visible.endRow,
				startCol: range.visible.startCol,
				endCol: range.visible.endCol,
			},
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

export const useSheetRender = (config) => {
	// 创建渲染worker
	let worker = null
	// const {sheet, loading, loadingText, loadingProgress} = config

	// 渲染结果缓存
	const renderResult = ref(null)

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()
	// const limit = 30000

	// 获取渲染结果
	const getRenderResult = (data) => {
		if (!worker) return
		return new Promise((resolve, reject) => {
			const requestId = ++renderRequestId

			// 存储请求
			renderRequests.set(requestId, {resolve, reject})

			requestAnimationFrame(() => {
				// 发送渲染请求
				// if (sheet.config.rowCount >= limit) {
				// 	loadingProgress.value = -1
				// 	loadingText.value = `数据量较大,请稍后...`
				// 	loading.value = true
				// }
				worker.postMessage({
					type: 'render_request',
					requestId,
					data,
				})
			})

			// 设置超时处理
			setTimeout(() => {
				if (renderRequests.has(requestId)) {
					renderRequests.delete(requestId)
					reject(new Error('渲染请求超时'))
				}
			}, 5000) // 5秒超时
		})
	}

	const destroy = () => {
		if (worker) {
			worker.terminate()
		}
		renderRequests.clear()
	}

	const init = () => {
		const blob = new Blob([workerCode], {type: 'application/javascript'})
		const workerUrl = URL.createObjectURL(blob)
		worker = new Worker(workerUrl)

		// 监听worker消息
		let completedTimer = null
		worker.onmessage = (event) => {
			const {type, data, requestId} = event.data
			switch (type) {
				case 'render_response': {
					// 处理渲染结果
					const request = renderRequests.get(requestId)
					if (request) {
						clearTimeout(completedTimer)
						renderRequests.delete(requestId)
						renderResult.value = data
						request.resolve(data)

						// completedTimer = setTimeout(() => {
						// 	if (renderRequests.size === 0 && loading.value) {
						// 		loading.value = false
						// 	}
						// }, 100)
					}
					break
				}
				case 'error':
					console.error('Worker错误:', data)
					// 处理错误情况下的请求
					if (requestId && renderRequests.has(requestId)) {
						const request = renderRequests.get(requestId)
						renderRequests.delete(requestId)
						request.reject(new Error(data))
					}
					break
			}
		}
	}
	return {
		getRenderResult,
		init,
		destroy,
	}
}
