<script setup>
import {computed} from 'vue'
import CryptoJS from 'crypto-js'

const akvtsCode = localStorage.getItem('AKVTS_CODE')
const secret = import.meta.env.VITE_AKVTS_KEY
const use = computed(() => akvtsCode && decrypt(akvtsCode) === import.meta.env.VITE_AKVTS_PASSWORD)

const encrypt = (text) => {
	const key = CryptoJS.enc.Utf8.parse(secret)
	const iv = CryptoJS.enc.Utf8.parse(secret)
	const encrypted = CryptoJS.AES.encrypt(text, key, {
		iv: iv,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7,
	})
	return encrypted.toString()
}

const decrypt = (ciphertext) => {
	const key = CryptoJS.enc.Utf8.parse(secret)
	const iv = CryptoJS.enc.Utf8.parse(secret)
	const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
		iv: iv,
		mode: CryptoJS.mode.CBC,
		padding: CryptoJS.pad.Pkcs7,
	})
	return decrypted.toString(CryptoJS.enc.Utf8)
}
</script>
<template>
	<div class="akvts-lock">
		<slot v-if="use" name="default"></slot>
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
	min-height: 400px;
	width: 100%;
	.message {
		color: var(--z-font-color);
		font-size: 16px;
		padding: 20px 0;
	}
}
</style>
