import {ref} from 'vue'
const wasm = ref(null)
const activated = ref(0)

const useWasm = async () => {
	if (wasm.value) {
		return wasm.value
	}
	const res = await fetch('/akvts.wasm')
	const {instance} = await WebAssembly.instantiateStreaming(res)
	wasm.value = instance
	return wasm.value
}

const useValidate = async (input) => {
	const {exports} = await useWasm()
	const {memory, validate} = exports
	const encoder = new TextEncoder()
	const inputWithNull = input + '\0' // 添加 null 终止符
	const inputBytes = encoder.encode(inputWithNull)
	const inputPtr = 200
	const memoryView = new Uint8Array(memory.buffer)
	memoryView.set(inputBytes, inputPtr)
	activated.value = validate(inputPtr, BigInt(Math.floor(Date.now() / 1000)))
}

export {activated, useValidate}
