let _0xW98S = null
const useWasm = () => {
	if (_0xW98S) {
		return Promise.resolve(_0xW98S)
	}
	return new Promise((resolve) => {
		const res = fetch('/akvts.wasm')
		_0xW98S = WebAssembly.instantiateStreaming(res)
		resolve(_0xW98S)
	})
}

export {useWasm}
