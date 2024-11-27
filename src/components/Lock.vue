<script setup>
import {ref} from 'vue'

const _0x1A2B = (() => Date['now']())()
const loadWasm = async () => {
	try {
		const _0x3C4D = 0x3e8
		const response = await fetch('/akvts.wasm')
		if (!response.ok) {
			throw new Error('LoadWasm response was not ok')
		}

		const wasmModule = await WebAssembly.instantiateStreaming(response)
		const {instance} = wasmModule
		const validate = instance.exports.validate
		const memory = instance.exports.memory

		const validateInput = (input, ct) => {
			const encoder = new TextEncoder()
			const inputBytes = encoder.encode(input)
			const inputPtr = 100 // 确保与 WAT 中的比较逻辑一致
			const memoryView = new Uint8Array(memory.buffer)
			const ctBigInt = BigInt(ct)

			// 将输入字节写入内存的 inputPtr 位置
			memoryView.set(inputBytes, inputPtr)

			try {
				return validate(inputPtr, ctBigInt)
			} catch (error) {
				console.error('Error validating input:', error)
				return false
			}
		}

		const _0x5E6F = Math['floor'](_0x1A2B / _0x3C4D)

		const token = localStorage.getItem('AKVTS_TOKEN')

		if (!token) {
			console.warn('AKVTS_TOKEN 不存在')
			return false
		}

		const result = validateInput(token, _0x5E6F)
		console.log(result === 1 ? 'Valid' : 'Invalid', result)
		return result
	} catch (error) {
		console.error('Error loading wasm:', error)
		return false
	}
}

const isUse = ref(0)
loadWasm().then((val) => (isUse.value = val))
</script>
<template>
	<div class="akvts-lock">
		<slot v-if="isUse" name="default"></slot>
		<div v-else class="akvts-lock__content">
			<Icons icon-name="Lock" size="48" />
			<span class="message">授权已过期</span>
		</div>
	</div>
</template>
<style scoped lang="scss">
.akvts-lock__content {
	align-items: center;
	border-radius: 5px;
	border: 1px solid var(--z-line);
	display: flex;
	flex-direction: column;
	height: 100%;
	justify-content: center;
	margin: 20px;
	min-height: 400px;
	width: calc(100% - 40px);
	.message {
		color: var(--z-font-color);
		font-size: 16px;
		padding: 20px 0;
	}
}
</style>
