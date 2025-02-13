// 渲染状态
let renderState = {
	isRunning: false,
	data: null,
}

const renderResize = (data) => {
	const {startRow, startCol, type, rowHeight, rowHeights, colWidth, colWidths} = data
	let offset = {top: 0, left: 0}

	if (type === 'offsetTop') {
		for (let i = 0; i < startRow; i++) {
			offset.top += rowHeights[i] || rowHeight
		}
	}

	if (type === 'offsetLeft') {
		for (let i = 0; i < startCol; i++) {
			offset.left += colWidths[i] || colWidth
		}
	}

	return {
		offset,
	}
}

// 监听消息
self.onmessage = (event) => {
	const {type, data, requestId} = event.data

	try {
		let result = null
		// 直接计算渲染结果
		if (type === 'render_request') {
			result = renderResize(data)
		}

		// 发送响应
		self.postMessage({type, requestId, data: result})
	} catch (error) {
		self.postMessage({type: 'error', requestId, data: error.message})
	}
}
