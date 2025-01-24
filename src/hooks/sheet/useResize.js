import {ref} from 'vue'
export const useResize = (config = {}) => {
	// 创建渲染worker
	const worker = new Worker(new URL('./worker/ResizeRenderWorker.js', import.meta.url), {
		type: 'module',
	})

	// 行高调整相关
	const rowHeights = {} // 存储自定义行高
	const colWidths = {} // 存储自定义列宽

	const isResizing = ref(false) // 是否正在调整大小

	let resizingRow = null // 当前调整的行
	const startY = ref(0) // 开始拖动时的Y坐标
	const startHeight = ref(0) // 开始拖动时的行高

	let resizingCol = null // 当前调整的列
	const startX = ref(0) // 开始拖动时的X坐标
	const startWidth = ref(0) // 开始拖动时的列宽

	let rowHeight = config.rowHeight
	let colWidth = config.colWidth

	// 获取行的实际高度
	const getRowHeight = (index) => {
		return rowHeights[index] || rowHeight
	}

	// 获取列的实际宽度
	const getColWidth = (index) => {
		return colWidths[index] || colWidth
	}

	// 开始调整行高
	const startResize = (item, e, direction = 'vertical') => {
		e.preventDefault()
		isResizing.value = true

		if (direction === 'vertical') {
			resizingRow = item
			startY.value = e.clientY
			startHeight.value = getRowHeight(item.index)
		} else {
			resizingCol = item
			startX.value = e.clientX
			startWidth.value = getColWidth(item.index)
		}

		document.addEventListener('mousemove', onResize)
		document.addEventListener('mouseup', stopResize)
	}

	// 调整大小（行高或列宽）
	const onResize = (e) => {
		if (!isResizing.value) return

		if (resizingRow) {
			const deltaY = e.clientY - startY.value
			const newHeight = Math.max(25, startHeight.value + deltaY) // 最小高度25px
			rowHeights[resizingRow.index] = newHeight
		}

		if (resizingCol) {
			const deltaX = e.clientX - startX.value
			const newWidth = Math.max(100, startWidth.value + deltaX) // 最小宽度100px
			colWidths[resizingCol.index] = newWidth
		}
	}

	// 停止调整
	const stopResize = () => {
		if (isResizing.value) {
			if (resizingRow) {
				const finalHeight = rowHeights[resizingRow.index]
			}

			if (resizingCol) {
				const finalWidth = colWidths[resizingCol.index]
			}
		}

		isResizing.value = false
		resizingRow = null
		resizingCol = null

		document.removeEventListener('mousemove', onResize)
		document.removeEventListener('mouseup', stopResize)
	}

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()

	const getRenderResult = (data, type = 'render_request') => {
		return new Promise((resolve, reject) => {
			const requestId = ++renderRequestId

			// 存储请求
			renderRequests.set(requestId, {resolve, reject})

			switch (type) {
				// 发送渲染请求
				case 'render_request':
					worker.postMessage({
						type: 'render_request',
						requestId,
						data: {
							...data,
							rowHeight,
							rowHeights,
							colWidth,
							colWidths,
						},
					})
					break
			}

			// 设置超时处理
			setTimeout(() => {
				if (renderRequests.has(requestId)) {
					renderRequests.delete(requestId)
					reject(new Error('渲染请求超时'))
				}
			}, 5000) // 5秒超时
		})
	}

	// 监听worker消息
	worker.onmessage = (event) => {
		const {type, data, requestId} = event.data

		switch (type) {
			case 'error':
				console.error('Worker错误:', data)
				// 处理错误情况下的请求
				if (requestId && renderRequests.has(requestId)) {
					const request = renderRequests.get(requestId)
					renderRequests.delete(requestId)
					request.reject(new Error(data))
				}
				break
			default: {
				// 处理渲染结果
				const request = renderRequests.get(requestId)
				if (request) {
					renderRequests.delete(requestId)
					request.resolve(data)
				}
				break
			}
		}
	}

	return {
		getRenderResult,
		startResize,
		getRowHeight,
		getColWidth,
		rowHeights,
		colWidths,
	}
}
