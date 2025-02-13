import {ref} from 'vue'

export const useSheetRender = (config) => {
	// 创建渲染worker
	let worker = null
	const {sheet, loading, loadingText, loadingProgress} = config

	// 渲染结果缓存
	const renderResult = ref(null)

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()
	const limit = 30000

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
		worker.terminate()
		renderRequests.clear()
	}

	const init = () => {
		const workerUrl = new URL('./worker/SheetRenderWorker.js', import.meta.url)
		worker = new Worker(workerUrl, {type: 'module'})
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
