import {ref, onMounted, onUnmounted} from 'vue'

/**
 * 表格触摸操作钩子
 * @param {Object} options 配置项
 * @param {HTMLElement} options.container 容器元素
 * @param {Function} options.onZoom 缩放回调
 * @returns {Object} 触摸操作相关方法和状态
 */
export function useTouch(options) {
	const {id, sheet, onZoom, renderRange} = options
	let container = null

	// 追踪触摸状态
	const isTouching = ref(false)
	const startDistance = ref(0)
	const currentZoom = ref(1)
	const touchStartTime = ref(0)
	const initialZoom = ref(1) // 存储开始缩放时的初始缩放比例

	// 防止缩放过程中频繁渲染导致卡顿
	let isRendering = false
	let pendingZoom = null
	let rafId = null

	// 节流相关变量
	let lastZoomCallTime = 0
	const throttleDelay = 16 // 降低节流延迟时间，提高响应性
	let lastZoomValue = 0

	// 计算两个触摸点之间的距离
	const getDistance = (touches) => {
		if (touches.length < 2) return 0

		const dx = touches[0].clientX - touches[1].clientX
		const dy = touches[0].clientY - touches[1].clientY
		return Math.sqrt(dx * dx + dy * dy)
	}

	// 节流函数，限制频繁调用
	const throttledZoom = (zoomValue) => {
		const now = Date.now()

		// 如果是第一次调用或者与上次缩放值相差较大，立即调用
		if (now - lastZoomCallTime > throttleDelay || Math.abs(zoomValue - lastZoomValue) > 0.05) {
			if (onZoom && typeof onZoom === 'function' && !isRendering) {
				// 设置渲染标志，防止重复渲染
				isRendering = true

				// 取消之前的动画帧
				if (rafId) {
					cancelAnimationFrame(rafId)
				}

				// 使用requestAnimationFrame确保在下一帧渲染
				rafId = requestAnimationFrame(() => {
					onZoom(zoomValue)
					isRendering = false

					// 如果有待处理的缩放值，应用它
					if (pendingZoom !== null && Math.abs(pendingZoom - zoomValue) > 0.05) {
						const nextZoom = pendingZoom
						pendingZoom = null
						throttledZoom(nextZoom)
					}
				})
			} else if (isRendering) {
				// 如果正在渲染，存储最新的缩放值
				pendingZoom = zoomValue
			}

			lastZoomCallTime = now
			lastZoomValue = zoomValue
		}
	}

	// 处理触摸开始事件
	const handleTouchStart = (event) => {
		if (event.touches.length === 2) {
			event.preventDefault()

			// 取消之前的动画帧
			if (rafId) {
				cancelAnimationFrame(rafId)
				rafId = null
			}

			// 重置渲染状态
			isRendering = false
			pendingZoom = null

			isTouching.value = true
			startDistance.value = getDistance(event.touches)
			touchStartTime.value = Date.now()

			// 记录开始缩放时的当前缩放比例（确保使用最新值）
			initialZoom.value = sheet.config.zoom || 1
			currentZoom.value = initialZoom.value

			// 重置节流相关变量
			lastZoomCallTime = 0
			lastZoomValue = initialZoom.value

			// 保存缩放前的滚动位置
			if (container) {
				scrollPositionBeforeZoom.top = container.scrollTop
				scrollPositionBeforeZoom.left = container.scrollLeft

				// 计算视口中心点在内容中的相对位置
				const viewportWidth = container.clientWidth
				const viewportHeight = container.clientHeight
				const scrollWidth = container.scrollWidth
				const scrollHeight = container.scrollHeight

				scrollPositionBeforeZoom.centerX =
					(scrollPositionBeforeZoom.left + viewportWidth / 2) / scrollWidth
				scrollPositionBeforeZoom.centerY =
					(scrollPositionBeforeZoom.top + viewportHeight / 2) / scrollHeight
			}
		}
	}

	// 处理触摸移动事件
	const handleTouchMove = (event) => {
		if (!isTouching.value || event.touches.length !== 2) return

		event.preventDefault()

		const currentDistance = getDistance(event.touches)
		if (startDistance.value === 0) return

		// 计算缩放比例（基于初始缩放比例）
		const scale = currentDistance / startDistance.value

		// 从当前缩放比例计算新的缩放值
		const newZoom = initialZoom.value * scale

		// 限制缩放范围，防止过度缩放（使用更平滑的限制）
		const limitedZoom = Math.min(Math.max(newZoom, 0.5), 3)

		// 使用节流函数调用缩放回调
		throttledZoom(limitedZoom)

		currentZoom.value = limitedZoom
	}

	// 处理触摸结束事件
	const handleTouchEnd = (event) => {
		if (isTouching.value) {
			isTouching.value = false

			// 确保最后一次缩放值被应用
			if (onZoom && typeof onZoom === 'function') {
				// 取消之前的动画帧
				if (rafId) {
					cancelAnimationFrame(rafId)
				}

				// 使用requestAnimationFrame确保在下一帧渲染
				rafId = requestAnimationFrame(() => {
					onZoom(currentZoom.value)

					// 触摸结束后更新渲染范围
					if (renderRange && typeof renderRange === 'function') {
						setTimeout(() => {
							renderRange()

							// 在渲染范围更新后还原滚动位置
							if (onRestoreScroll && typeof onRestoreScroll === 'function') {
								setTimeout(() => {
									onRestoreScroll(scrollPositionBeforeZoom, currentZoom.value)
								}, 50) // 添加小延迟确保渲染已完成
							}
						}, 50) // 添加小延迟确保缩放已应用
					}

					isRendering = false
					pendingZoom = null
				})
			}
		}
	}

	const init = () => {
		container = document.querySelector(`#${id}`)

		if (container) {
			container.addEventListener('touchstart', handleTouchStart, {passive: false})
			container.addEventListener('touchmove', handleTouchMove, {passive: false})
			container.addEventListener('touchend', handleTouchEnd)
		}
	}

	const destroy = () => {
		// 取消可能存在的动画帧
		if (rafId) {
			cancelAnimationFrame(rafId)
			rafId = null
		}

		if (container) {
			container.removeEventListener('touchstart', handleTouchStart)
			container.removeEventListener('touchmove', handleTouchMove)
			container.removeEventListener('touchend', handleTouchEnd)
		}
	}

	return {
		init,
		destroy,
		isTouching,
		currentZoom,

		// 手动重置缩放
		resetZoom: () => {
			currentZoom.value = 1
			if (onZoom && typeof onZoom === 'function') {
				onZoom(1)
			}
		},
	}
}
