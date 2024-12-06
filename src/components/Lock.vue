<script setup>
import {activated} from '@/hooks/useWasm'
import {watch} from 'vue'

const emits = defineEmits(['update:modelValue'])
const props = defineProps({
	label: {
		type: String,
		default: '',
	},
	size: {
		type: [Number, String],
		default: 38,
	},
	fontSize: {
		type: [Number, String],
		default: 12,
	},
})

watch(
	() => activated.value,
	(val) => {
		emits('update:modelValue', val)
	},
	{immediate: true}
)
</script>
<template>
	<slot name="default"></slot>
</template>
