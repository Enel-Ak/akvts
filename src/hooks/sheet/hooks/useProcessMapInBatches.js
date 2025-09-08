import {useAirSheetStore} from '../store/useAirSheet'
let sheet = null
export const useProcessMapInBatches = (sheetKey, map, callback, batchSize = 3000) => {
	const entries = Array.from(map.entries())
	const total = entries.length
	let processed = 0

	sheet = useAirSheetStore().getSheet(sheetKey)

	// 优化：如果数据量较小，直接同步处理，避免异步开销
	if (total < 1000) {
		try {
			for (let i = 0; i < total; i++) {
				callback(entries[i][0], entries[i][1])
			}
			if (sheet) {
				sheet.state.progress = 100
			}
			return Promise.resolve()
		} catch (error) {
			return Promise.reject(error)
		}
	}

	return new Promise((resolve, reject) => {
		function processBatch() {
			const start = performance.now()
			let processedInBatch = 0

			try {
				// 优化：针对删除列操作使用更小的批处理大小，减少单次处理时间
				const dynamicBatchSize = Math.min(
					batchSize,
					Math.max(200, Math.floor(batchSize / 4)) // 进一步减少批处理大小
				)

				while (
					processed < total &&
					processedInBatch < dynamicBatchSize &&
					performance.now() - start < 8 // 进一步减少单批处理时间
				) {
					callback(entries[processed][0], entries[processed][1])
					processed++
					processedInBatch++
				}

				if (sheet) {
					sheet.state.progress = Math.floor((processed / total) * 100)
				}

				if (processed < total) {
					// 优化：使用 requestIdleCallback 或更短的延迟
					if (window.requestIdleCallback) {
						requestIdleCallback(processBatch, {timeout: 16})
					} else {
						setTimeout(processBatch, 0)
					}
				} else {
					if (sheet) {
						sheet.state.progress = 100
					}
					resolve()
				}
			} catch (error) {
				reject(error)
			}
		}

		// 立即开始处理，不等待下一帧
		processBatch()
	})
}
