// 性能计时器
const performanceTimers = new Map()

/**
 * 开始计时
 * @param {string} name 计时器名称
 */
export const startTimer = (name = 'default') => {
	performanceTimers.set(name, performance.now())
}

/**
 * 结束计时并返回耗时（秒）
 * @param {string} name 计时器名称
 * @param {boolean} clear 是否清除计时器
 * @returns {number} 耗时秒数
 */
export const endTimer = (name = 'default', clear = true) => {
	const startTime = performanceTimers.get(name)
	if (!startTime) {
		console.warn(`Timer ${name} not found`)
		return 0
	}

	const endTime = performance.now()
	const duration = (endTime - startTime) / 1000 // 转换为秒

	if (clear) {
		performanceTimers.delete(name)
	}

	return Number(duration.toFixed(3))
}

/**
 * 清除指定计时器
 * @param {string} name 计时器名称
 */
export const clearTimer = (name = 'default') => {
	performanceTimers.delete(name)
}

/**
 * 清除所有计时器
 */
export const clearAllTimers = () => {
	performanceTimers.clear()
}

/**
 * 获取计时器状态
 * @returns {Object} 所有计时器的状态
 */
export const getTimerStatus = () => {
	const status = {}
	for (const [name, startTime] of performanceTimers) {
		status[name] = {
			startTime,
			running: true,
			duration: (performance.now() - startTime) / 1000,
		}
	}
	return status
}
