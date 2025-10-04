import {ref} from 'vue'
import {useAirSheetStore} from '../store/useAirSheet'
import {workerCode} from '../worker/render.worker.js'

export const useRender = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = ''
	let sheet = null
	// 创建渲染worker
	let worker = null
	// 渲染结果缓存
	const renderResult = ref(null)

	// 渲染请求队列
	let renderRequestId = 0
	const renderRequests = new Map()

	// 获取渲染结果
	const getRenderResult = (data) => {
		if (!worker) return
		return new Promise((resolve, reject) => {
			const requestId = ++renderRequestId

			// 存储请求
			renderRequests.set(requestId, {resolve, reject})

			requestAnimationFrame(() => {
				// 发送渲染请求
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

		sheet = null
		sheetKey = null
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
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
		setTimeout(() => console.log('installed useRender'), 16)
		return {
			destroy,
			getRenderResult,
			refreshSheet,
		}
	}

	return {
		init,
	}
}
