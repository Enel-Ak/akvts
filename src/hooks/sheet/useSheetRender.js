import {ref} from 'vue'

export const useSheetRender = (sheet) => {
	// 创建渲染worker
	const worker = new Worker(new URL('./worker/SheetRenderWorker.js', import.meta.url), {
		type: 'module',
	})

	// 渲染结果缓存
	const renderResult = ref(null)

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()

	// 获取渲染结果
	const getRenderResult = (data) => {
		return new Promise((resolve, reject) => {
			const requestId = ++renderRequestId

			// 存储请求
			renderRequests.set(requestId, {resolve, reject})

			// 发送渲染请求
			worker.postMessage({
				type: 'render_request',
				requestId,
				data,
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

	// 监听worker消息
	worker.onmessage = (event) => {
		const {type, data, requestId} = event.data

		switch (type) {
			case 'render_response': {
				// 处理渲染结果
				const request = renderRequests.get(requestId)

				if (request) {
					renderRequests.delete(requestId)
					renderResult.value = data
					request.resolve(data)
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

	return {
		getRenderResult,
	}
}
