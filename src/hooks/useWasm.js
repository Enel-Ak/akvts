import {ref} from 'vue'
const _0xW98S = ref(null)
const _0x98AK = ref(0)

const useWasm = () => {
	if (_0xW98S.value) {
		return Promise.resolve(_0xW98S.value)
	}
	return new Promise((resolve) => {
		const res = fetch('/akvts.wasm')
		_0xW98S.value = WebAssembly.instantiateStreaming(res)
		resolve(_0xW98S.value)
	})
}

const _0x1A2B = (() => Date['now']())()
const _0x4V3E = (_0x1A2B, _0x2B3C) => Math['floor'](_0x1A2B / _0x2B3C)
const _0x6HJW = (_0xI9T6) => {
	const {_0xAK98, _0xAK97} = _0xI9T6.exports
	return {
		_0x8H9I: _0xAK98,
		_0xAJBK: _0xAK97,
	}
}

const _0x8QP = async () => {
	const _0x2B3C = 0x3e8
	try {
		const {instance} = await useWasm()
		const _0xYZAB = localStorage.getItem('AKVTS_TOKEN')

		if (!_0xYZAB) {
			return 0
		}

		const {_0x8H9I, _0xAJBK} = _0x6HJW(instance)
		const _0xCLDM = (it, ct) => {
			const _0xENFO = new TextEncoder()
			const _0xPGHQ = _0xENFO.encode(it)
			const _0xRIJS = 0x64
			const _0xKLTU = new Uint8Array(_0xAJBK.buffer)
			const _0xMNOP = BigInt(ct)

			_0xKLTU.set(_0xPGHQ, _0xRIJS)
			return _0x8H9I(_0xRIJS, _0xMNOP)
		}
		const _0xUVWX = _0x4V3E(_0x1A2B, _0x2B3C)
		return _0xCLDM(_0xYZAB, _0xUVWX)
	} catch (_0xHIJKL) {
		return 0
	}
}

useWasm().then(() => {
	_0x8QP().then((res) => {
		_0x98AK.value = res
		console.log(_0x98AK.value ? '已激活' : '未激活')
	})
})

export {_0x98AK}
