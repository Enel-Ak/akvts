<script setup>
import {ref} from 'vue'

const props = defineProps({
	label: {
		type: String,
		default: '授权已过期',
	},
})

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
		const _0xYZAB = localStorage.getItem('AKVTS_TOKEN')
		const _0x4D5E = await fetch('/akvts.wasm')
		if (!_0x4D5E.ok || !_0xYZAB) {
			return 0
		}

		const _0x6F7G = await WebAssembly.instantiateStreaming(_0x4D5E)
		const {instance} = _0x6F7G
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

const _0xO0l1 = ref(0)
_0x8QP().then((val) => (_0xO0l1.value = val))
</script>
<template>
	<div class="akvts-lock">
		<slot v-if="_0xO0l1" name="default"></slot>
		<div v-else class="akvts-lock__content">
			<Icons icon-name="Lock" size="38" color="var(--z-danger)" />
			<span class="message">{{ label }}</span>
		</div>
	</div>
</template>
<style scoped lang="scss">
.akvts-lock {
	height: 100%;
	width: 100%;
	.akvts-lock__content {
		align-items: center;
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: center;
		padding: 20px;
		width: calc(100% - 40px);
		.message {
			color: var(--z-font-color);
			font-size: 12px;
			opacity: 0.8;
			padding: 10px 0;
		}
	}
}
</style>
