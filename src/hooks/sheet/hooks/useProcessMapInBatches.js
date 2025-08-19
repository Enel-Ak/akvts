import {useAirSheetStore} from '../store/useAirSheet'
let sheet = null
export const useProcessMapInBatches = (sheetKey, map, callback, batchSize = 3000) => {
	const entries = Array.from(map.entries())
	const total = entries.length
	let processed = 0

	sheet = useAirSheetStore().getSheet(sheetKey)

	return new Promise((resolve) => {
		function processBatch() {
			const start = performance.now()
			let processedInBatch = 0

			// 添加 batchSize 限制
			while (
				processed < total &&
				processedInBatch < batchSize && // 确保每批处理不超过 batchSize
				performance.now() - start < 16
			) {
				// 保持原有的时间限制
				callback(entries[processed][0], entries[processed][1])
				processed++
				processedInBatch++
			}

			if (sheet) {
				sheet.state.progress = Math.floor((processed / total) * 100)
			}

			if (processed < total) {
				requestAnimationFrame(processBatch)
			} else {
				if (sheet) {
					sheet.state.progress = 100
				}
				resolve()
			}
		}
		requestAnimationFrame(processBatch)
	})
}
