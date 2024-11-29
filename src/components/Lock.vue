<script setup>
import {ref} from 'vue'
import {_0x98AK} from '@/hooks/useWasm'

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
emits('update:modelValue', _0x98AK.value)
</script>
<template>
	<div class="akvts-lock">
		<!-- <template v-if="!_0x0Ol1">
			<slot v-if="_0xO0l1" name="default"></slot>
			<div v-else class="akvts-lock__content">
				<Icons icon-name="Lock" :size="size" color="var(--z-danger)" />
				<span
					v-if="label"
					class="message"
					:style="{
						'font-size': typeof fontSize === 'number' ? fontSize + 'px' : fontSize,
					}"
					>{{ label }}</span
				>
			</div>
		</template>
		<div v-else class="loader">
			<Icons icon-name="More"></Icons>
		</div> -->
		<slot name="default"></slot>
	</div>
</template>
<style scoped lang="scss">
.akvts-lock {
	// height: 100%;
	// width: 100%;
	.akvts-lock__content {
		align-items: center;
		display: flex;
		flex-direction: column;
		height: 100%;
		justify-content: center;
		padding: 20px;
		width: calc(100% - 10px);
		.message {
			color: var(--z-font-color);
			font-size: 12px;
			opacity: 0.8;
			padding: 20px 0;
		}
	}
	.loader {
		align-items: center;
		display: flex;
		justify-content: center;
		height: 100%;
		width: 100%;
	}
}
</style>
