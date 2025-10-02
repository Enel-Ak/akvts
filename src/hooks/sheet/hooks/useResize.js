import {ref} from 'vue'
import {workerCode} from '../worker/resize.worker.js'
import {useAirSheetStore} from '../store/useAirSheet'

export const useResize = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null

	// 创建渲染worker
	let worker = null

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
		return (sheet.config.rResize[index] || sheet.props.rowHeight) * sheet.config.zoom
	}

	// 获取列的实际宽度
	const getColWidth = (index) => {
		return (sheet.config.cResize[index] || sheet.props.colWidth) * sheet.config.zoom
	}

	const setRowHeight = (index, height) => {
		sheet.config.rResize[index] =
			height < sheet.props.rowHeight ? sheet.props.rowHeight : height || sheet.props.rowHeight
	}

	const setColWidth = (index, width) => {
		sheet.config.cResize[index] =
			width < sheet.props.colWidth ? sheet.props.colWidth : width || sheet.props.colWidth
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
			startHeight = getRowHeight(item.r)
		} else if (direction === 'horizontal') {
			resizingCol.value = item
			startX = e.clientX
			startWidth = getColWidth(item.c)
		}

		sheet.hooks.historyHook.save()

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
				try {
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
								if (guideLineRow) {
									guideLineRow.style.top = `${
										resizingElRect.top - sheetRect.top + newHeight - 1.75
									}px`
								}
							}, 16)
						}
					} else {
						guideLineRow = sheetContainer.querySelector('.grid-lines-row')
					}
				} catch (err) {}
			})

			// 更新行高
			resizingRow.value._newHeight = newHeight
		}

		if (resizingCol.value) {
			const deltaX = e.clientX - startX
			const newWidth = Math.max(100, startWidth + deltaX) // 最小宽度100px

			// 使用 requestAnimationFrame 优化性能
			requestAnimationFrame(() => {
				if (resizingEl) {
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
				setRowHeight(resizingRow.value.r, resizingRow.value._newHeight)
			} else if (resizingCol.value) {
				setColWidth(resizingCol.value.c, resizingCol.value._newWidth)
			}
			sheet.hooks.selectionRangeHook.selecting = true
		}

		if (sheet.config.synergy) {
			// 同步配置
			sheet?.emits('asyncConfig', {
				rResize: sheet.config.rResize,
				cResize: sheet.config.cResize,
			})
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

	const clear = () => {
		renderRequests.clear()
	}

	const destroy = () => {
		worker.terminate()
		renderRequests.clear()
	}

	const refreshSheet = (id) => {
		sheetKey = id
		sheet = sheetStore.getSheet(id)
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)

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
			// getRenderResult,
			startResize,
			getRowHeight,
			getColWidth,
			setRowHeight,
			setColWidth,
			clear,
			destroy,

			refreshSheet,
		}
	}

	return {
		init,
	}
}
