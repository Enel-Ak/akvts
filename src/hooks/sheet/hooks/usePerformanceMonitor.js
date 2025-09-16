import { ref, reactive } from 'vue'

/**
 * AirSheet 性能监控工具
 * 用于监控多 sheet 功能和 Excel 导入的性能指标
 */
export const usePerformanceMonitor = () => {
	// 性能指标存储
	const metrics = reactive({
		sheetSwitching: {
			count: 0,
			totalTime: 0,
			averageTime: 0,
			maxTime: 0,
			minTime: Infinity,
			lastSwitchTime: 0
		},
		excelImport: {
			count: 0,
			totalTime: 0,
			averageTime: 0,
			maxTime: 0,
			minTime: Infinity,
			totalFileSize: 0,
			averageFileSize: 0
		},
		memoryUsage: {
			heapUsed: 0,
			heapTotal: 0,
			jsHeapSizeLimit: 0,
			lastCheck: 0
		},
		renderPerformance: {
			frameDrops: 0,
			averageFPS: 0,
			lastFPSCheck: 0
		}
	})

	// 性能警告阈值
	const thresholds = {
		sheetSwitchTime: 100, // ms
		excelImportTime: 5000, // ms
		memoryUsagePercent: 80, // %
		minFPS: 30
	}

	// 开始监控 Sheet 切换
	const startSheetSwitchMonitor = () => {
		return performance.now()
	}

	// 结束监控 Sheet 切换
	const endSheetSwitchMonitor = (startTime) => {
		const duration = performance.now() - startTime
		
		metrics.sheetSwitching.count++
		metrics.sheetSwitching.totalTime += duration
		metrics.sheetSwitching.averageTime = metrics.sheetSwitching.totalTime / metrics.sheetSwitching.count
		metrics.sheetSwitching.maxTime = Math.max(metrics.sheetSwitching.maxTime, duration)
		metrics.sheetSwitching.minTime = Math.min(metrics.sheetSwitching.minTime, duration)
		metrics.sheetSwitching.lastSwitchTime = duration

		// 性能警告
		if (duration > thresholds.sheetSwitchTime) {
			console.warn(`Sheet切换性能警告: ${duration.toFixed(2)}ms (阈值: ${thresholds.sheetSwitchTime}ms)`)
		}

		return duration
	}

	// 开始监控 Excel 导入
	const startExcelImportMonitor = (fileSize = 0) => {
		return {
			startTime: performance.now(),
			fileSize
		}
	}

	// 结束监控 Excel 导入
	const endExcelImportMonitor = ({ startTime, fileSize }) => {
		const duration = performance.now() - startTime
		
		metrics.excelImport.count++
		metrics.excelImport.totalTime += duration
		metrics.excelImport.averageTime = metrics.excelImport.totalTime / metrics.excelImport.count
		metrics.excelImport.maxTime = Math.max(metrics.excelImport.maxTime, duration)
		metrics.excelImport.minTime = Math.min(metrics.excelImport.minTime, duration)
		
		if (fileSize > 0) {
			metrics.excelImport.totalFileSize += fileSize
			metrics.excelImport.averageFileSize = metrics.excelImport.totalFileSize / metrics.excelImport.count
		}

		// 性能警告
		if (duration > thresholds.excelImportTime) {
			console.warn(`Excel导入性能警告: ${duration.toFixed(2)}ms (阈值: ${thresholds.excelImportTime}ms)`)
		}

		return duration
	}

	// 检查内存使用情况
	const checkMemoryUsage = () => {
		if (performance.memory) {
			const memory = performance.memory
			metrics.memoryUsage.heapUsed = memory.usedJSHeapSize
			metrics.memoryUsage.heapTotal = memory.totalJSHeapSize
			metrics.memoryUsage.jsHeapSizeLimit = memory.jsHeapSizeLimit
			metrics.memoryUsage.lastCheck = Date.now()

			const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

			// 内存使用警告
			if (usagePercent > thresholds.memoryUsagePercent) {
				console.warn(`内存使用警告: ${usagePercent.toFixed(2)}% (阈值: ${thresholds.memoryUsagePercent}%)`)
			}

			return {
				used: memory.usedJSHeapSize,
				total: memory.totalJSHeapSize,
				limit: memory.jsHeapSizeLimit,
				usagePercent
			}
		}
		return null
	}

	// FPS 监控
	let frameCount = 0
	let lastTime = performance.now()
	const monitorFPS = () => {
		frameCount++
		const currentTime = performance.now()
		
		if (currentTime - lastTime >= 1000) {
			const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
			metrics.renderPerformance.averageFPS = fps
			metrics.renderPerformance.lastFPSCheck = currentTime

			if (fps < thresholds.minFPS) {
				metrics.renderPerformance.frameDrops++
				console.warn(`FPS性能警告: ${fps} (阈值: ${thresholds.minFPS})`)
			}

			frameCount = 0
			lastTime = currentTime
		}

		requestAnimationFrame(monitorFPS)
	}

	// 获取性能报告
	const getPerformanceReport = () => {
		const memoryInfo = checkMemoryUsage()
		
		return {
			timestamp: new Date().toISOString(),
			sheetSwitching: { ...metrics.sheetSwitching },
			excelImport: { ...metrics.excelImport },
			memoryUsage: memoryInfo,
			renderPerformance: { ...metrics.renderPerformance },
			recommendations: generateRecommendations()
		}
	}

	// 生成性能优化建议
	const generateRecommendations = () => {
		const recommendations = []

		if (metrics.sheetSwitching.averageTime > thresholds.sheetSwitchTime) {
			recommendations.push('Sheet切换平均耗时过长，建议优化数据结构或减少响应式更新')
		}

		if (metrics.excelImport.averageTime > thresholds.excelImportTime) {
			recommendations.push('Excel导入平均耗时过长，建议优化批处理算法或增加进度反馈')
		}

		if (metrics.renderPerformance.frameDrops > 10) {
			recommendations.push('渲染性能不佳，建议优化虚拟滚动或减少DOM操作')
		}

		const memoryInfo = checkMemoryUsage()
		if (memoryInfo && memoryInfo.usagePercent > thresholds.memoryUsagePercent) {
			recommendations.push('内存使用率过高，建议清理无用数据或优化数据结构')
		}

		return recommendations
	}

	// 重置性能指标
	const resetMetrics = () => {
		metrics.sheetSwitching.count = 0
		metrics.sheetSwitching.totalTime = 0
		metrics.sheetSwitching.averageTime = 0
		metrics.sheetSwitching.maxTime = 0
		metrics.sheetSwitching.minTime = Infinity

		metrics.excelImport.count = 0
		metrics.excelImport.totalTime = 0
		metrics.excelImport.averageTime = 0
		metrics.excelImport.maxTime = 0
		metrics.excelImport.minTime = Infinity
		metrics.excelImport.totalFileSize = 0
		metrics.excelImport.averageFileSize = 0

		metrics.renderPerformance.frameDrops = 0
		metrics.renderPerformance.averageFPS = 0
	}

	// 启动性能监控
	const startMonitoring = () => {
		// 启动 FPS 监控
		monitorFPS()
		
		// 定期检查内存使用情况
		setInterval(checkMemoryUsage, 5000)
		
		console.log('AirSheet 性能监控已启动')
	}

	return {
		metrics,
		thresholds,
		startSheetSwitchMonitor,
		endSheetSwitchMonitor,
		startExcelImportMonitor,
		endExcelImportMonitor,
		checkMemoryUsage,
		getPerformanceReport,
		resetMetrics,
		startMonitoring
	}
}
