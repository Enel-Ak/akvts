// 监听消息
self.onmessage = (event) => {
	try {
		self.postMessage({})
	} catch (error) {
		self.postMessage({})
	}
}
