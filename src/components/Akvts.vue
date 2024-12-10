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
			useValidate(val)
		}
	},
	{immediate: true}
)
</script>
<template></template>
