<script setup>
import {useValidate} from '@/hooks/useWasm'
import {watch} from 'vue'
const props = defineProps({
	code: String,
})

watch(
	() => props.code,
	(val) => {
		if (val) {
			try {
				useValidate(val)
			} catch (e) {
				throw new Error('无法获取激活验证')
			}
		}
	},
	{immediate: true}
)
</script>
<template></template>
