const useProcessWithRAF = (data, callback, options = {}) => {
	// 支持 Map 和 Array
	let entries
	if (data instanceof Map) {
		entries = Array.from(data.entries())
	} else if (Array.isArray(data)) {
		entries = data.map((item, index) => [index, item])
	} else {
		throw new Error('useProcessWithRAF: 第一个参数必须是 Map 或 Array')
	}

	const {onComplete, timeSlice = 16} = options
	let index = 0
	let cancelled = false
	let rafId = null

	function process() {
		// 如果已取消，停止处理
		if (cancelled) {
			return
		}

		const start = performance.now()
		while (index < entries.length && performance.now() - start < timeSlice) {
			callback(entries[index][0], entries[index][1])
			index++
		}

		if (index < entries.length && !cancelled) {
			rafId = requestAnimationFrame(process)
		} else if (!cancelled && onComplete) {
			// 处理完成，调用完成回调
			onComplete()
		}
	}

	rafId = requestAnimationFrame(process)

	// 返回控制对象
	return {
		cancel: () => {
			cancelled = true
			if (rafId !== null) {
				cancelAnimationFrame(rafId)
				rafId = null
			}
		},
	}
}

export default useProcessWithRAF
