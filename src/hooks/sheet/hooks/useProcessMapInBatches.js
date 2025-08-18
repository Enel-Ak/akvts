export const useProcessMapInBatches = (map, callback, batchSize = 5000) => {
	const entries = Array.from(map.entries())
	const total = entries.length
	let processed = 0

	return new Promise((resolve) => {
		function processBatch() {
			const start = performance.now()

			while (processed < total && performance.now() - start < 16) {
				callback(entries[processed][0], entries[processed][1])
				processed++
			}

			if (processed < total) {
				if (processed % batchSize !== 0) {
					loadingProgress.value = Math.floor((processed / total) * 100)
				}
				requestAnimationFrame(processBatch)
			} else {
				resolve()
			}
		}

		requestAnimationFrame(processBatch)
	})
}
