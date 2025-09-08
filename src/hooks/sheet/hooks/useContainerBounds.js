export const useContainerBounds = (container) => {
	try {
		let containerBounds = null
		if (container) {
			const rect = container.getBoundingClientRect()
			containerBounds = {
				left: 0,
				top: 0,
				right: rect.right - rect.left,
				bottom: rect.bottom - rect.top,
				width: rect.width,
				height: rect.height,
				rect,
			}
			return containerBounds
		}
		return null
	} catch (error) {
		console.warn('获取容器边界失败:', error)
		return null
	}
}
