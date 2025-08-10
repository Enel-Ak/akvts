import {ref} from 'vue'
import {workerCode} from '../worker/resize.worker.js'

export const useResize = () => {
	let sheet = null

	// 创建渲染worker
	let worker = null

	// 行高调整相关
	const rowHeights = {} // 存储自定义行高
	const colWidths = {} // 存储自定义列宽

	// 响应参数
	const isResizing = ref(false) // 是否正在调整大小

	const resizingRow = ref(null) // 当前调整的行
	let startY = 0 // 开始拖动时的Y坐标
	let startHeight = 0 // 开始拖动时的行高

	const resizingCol = ref(null) // 当前调整的列
	let startX = 0 // 开始拖动时的X坐标
	let startWidth = 0 // 开始拖动时的列宽

	let resizingEl = null
	let resizingElRect = null
	let sheetContainer = null
	let sheetRect = null
	let guideLineRow = null
	let guideLineCol = null

	// 获取行的实际高度
	const getRowHeight = (index) => {
		return (rowHeights[index] || sheet.props.rowHeight) * sheet.config.zoom
	}

	// 获取列的实际宽度
	const getColWidth = (index) => {
		return (colWidths[index] || sheet.props.colWidth) * sheet.config.zoom
	}

	const setRowHeight = (index, height) => {
		rowHeights[index] = height < sheet.props.rowHeight ? sheet.props.rowHeight : height
	}

	const setColWidth = (index, width) => {
		colWidths[index] = width < sheet.props.colWidth ? sheet.props.colWidth : width
	}

	// 开始调整行高
	const startResize = (item, e, direction = 'vertical') => {
		e.preventDefault()

		isResizing.value = true

		let el = direction === 'vertical' ? '.number-cell' : '.alphabet-cell'

		resizingEl = e.target.closest(el)
		sheetContainer = resizingEl.closest('.sheet')
		sheetRect = sheetContainer.getBoundingClientRect()

		if (direction === 'vertical') {
			resizingRow.value = item
			startY = e.clientY
			startHeight = getRowHeight(item.rowIndex)
		} else if (direction === 'horizontal') {
			resizingCol.value = item
			startX = e.clientX
			startWidth = getColWidth(item.colIndex)
		}

		document.addEventListener('mousemove', onResize)
		document.addEventListener('mouseup', stopResize)
	}

	// 调整大小（行高或列宽）
	const onResize = (e) => {
		if (!isResizing.value) return

		// 获取元素和容器的位置信息
		resizingElRect = resizingEl.getBoundingClientRect()

		if (resizingRow.value) {
			const deltaY = e.clientY - startY
			const newHeight = Math.max(25, startHeight + deltaY) // 最小高度25px

			// 使用 requestAnimationFrame 优化性能
			requestAnimationFrame(() => {
				resizingEl.style.height = `${newHeight}px`
				if (guideLineRow) {
					guideLineRow.style.zIndex = 3
					if (deltaY > 0) {
						guideLineRow.style.top = `${
							resizingElRect.top - sheetRect.top + newHeight - 1.75
						}px`
					} else {
						// 修正位置
						setTimeout(() => {
							guideLineRow.style.top = `${
								resizingElRect.top - sheetRect.top + newHeight - 1.75
							}px`
						}, 16)
					}
				} else {
					guideLineRow = sheetContainer.querySelector('.grid-lines-row')
				}
			})

			// 更新行高
			resizingRow.value._newHeight = newHeight
		}

		if (resizingCol.value) {
			const deltaX = e.clientX - startX
			const newWidth = Math.max(100, startWidth + deltaX) // 最小宽度100px

			// 使用 requestAnimationFrame 优化性能
			requestAnimationFrame(() => {
				resizingEl.style.width = `${newWidth}px`
				if (guideLineCol) {
					guideLineCol.style.zIndex = 3
					if (deltaX > 0) {
						guideLineCol.style.left = `${
							resizingElRect.left - sheetRect.left + newWidth - 1.75
						}px`
					} else {
						// 修正位置
						setTimeout(() => {
							try {
								guideLineCol.style.left = `${
									resizingElRect.left - sheetRect.left + newWidth - 1.75
								}px`
							} catch (e) {}
						}, 16)
					}
				} else {
					guideLineCol = sheetContainer.querySelector('.grid-lines-col')
				}
			})

			// 更新列宽
			resizingCol.value._newWidth = newWidth
		}
	}

	// 停止调整
	const stopResize = () => {
		if (isResizing.value) {
			if (resizingRow.value) {
				rowHeights[resizingRow.value.rowIndex] = resizingRow.value._newHeight
				delete resizingRow.value._newHeight
			}

			if (resizingCol.value) {
				colWidths[resizingCol.value.colIndex] = resizingCol.value._newWidth
				delete resizingCol.value._newWidth
			}
			sheet.hooks.selectionRangeHook.selecting = true
			sheet.fn.render()
		}

		isResizing.value = false
		resizingEl = null
		sheetContainer = null
		resizingElRect = null
		sheetRect = null
		resizingRow.value = null
		resizingCol.value = null
		guideLineRow = null
		guideLineCol = null

		document.removeEventListener('mousemove', onResize)
		document.removeEventListener('mouseup', stopResize)
	}

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()

	const getRenderResult = (data, type = 'render_request') => {
		if (!worker) return
		return new Promise((resolve, reject) => {
			const requestId = ++renderRequestId

			// 存储请求
			renderRequests.set(requestId, {resolve, reject})

			if (type === 'render_request') {
				worker.postMessage({
					type: 'render_request',
					requestId,
					data: {
						...data,
						rowHeight,
						rowHeights: JSON.parse(JSON.stringify(rowHeights)),
						colWidth,
						colWidths: JSON.parse(JSON.stringify(colWidths)),
					},
				})
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

	const clear = () => {
		renderRequests.clear()
	}

	const destroy = () => {
		worker.terminate()
		renderRequests.clear()
	}

	const init = (reactiveSheet) => {
		sheet = reactiveSheet

		const blob = new Blob([workerCode], {type: 'application/javascript'})
		const workerUrl = URL.createObjectURL(blob)
		worker = new Worker(workerUrl)
		// worker = new Worker(workerURL, {type: 'module'})
		// 监听worker消息
		worker.onmessage = (event) => {
			const {type, data, requestId} = event.data

			if (type === 'error') {
				console.error('Worker错误:', data)
				// 处理错误情况下的请求
				if (requestId && renderRequests.has(requestId)) {
					const request = renderRequests.get(requestId)
					renderRequests.delete(requestId)
					request.reject(new Error(data))
				}
			} else {
				// 处理渲染结果
				const request = renderRequests.get(requestId)
				if (request) {
					renderRequests.delete(requestId)
					request.resolve(data)
				}
			}
		}

		setTimeout(() => console.log('installed useResize'), 16)
		return {
			isResizing,
			resizingRow,
			resizingCol,
			rowHeights,
			colWidths,

			getRenderResult,
			startResize,
			getRowHeight,
			getColWidth,
			setRowHeight,
			setColWidth,
			clear,
			destroy,
		}
	}

	return {
		init,
	}
}
