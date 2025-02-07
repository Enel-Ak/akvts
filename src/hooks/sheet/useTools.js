export const useTools = (config) => {
	let worker = null
	const {sheet} = config

	const destroy = () => {
		if (!worker) return
		worker.terminate()
		worker = null
	}

	const init = () => {
		worker = new Worker(new URL('./worker.js', import.meta.url), {
			type: 'module',
		})
	}

	return {
		init,
		destroy,
	}
}
