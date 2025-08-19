/**
 * 防抖 Hook
 * @param {Function} fn - 需要防抖的函数
 * @param {number} [ms=1000] - 防抖延迟时间(毫秒)
 * @param {string} [key] - 可选的唯一标识符，用于区分不同的防抖函数
 * @returns {Function} 防抖处理后的函数
 */
const debounceMap = new Map()

export const useDebounce = (fn, ms = 1000, key) => {
	// 如果没有提供 key，则使用 Symbol 生成唯一标识
	const cacheKey = key || Symbol('debounceKey')

	return function (...args) {
		// 清除之前的定时器
		if (debounceMap.has(cacheKey)) {
			clearTimeout(debounceMap.get(cacheKey))
		}

		const id = setTimeout(() => {
			fn(...args)
			debounceMap.delete(cacheKey)
		}, ms)
		debounceMap.set(cacheKey, id)
	}
}

// 提供一个清理函数，用于手动清除某个防抖函数
useDebounce.cancel = (key) => {
	if (debounceMap.has(key)) {
		clearTimeout(debounceMap.get(key))
		debounceMap.delete(key)
		return true
	}
	return false
}

// 清理所有防抖函数
useDebounce.cancelAll = () => {
	for (const timer of debounceMap.values()) {
		clearTimeout(timer)
	}
	debounceMap.clear()
}
