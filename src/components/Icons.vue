<script setup>
import Icons from '@/enum/useIconsEnum'
import {computed} from 'vue'
const props = defineProps({
	iconName: {
		type: String,
		default: '',
	},
	color: {
		type: String,
		default: '#000',
	},
	size: {
		type: [String, Number],
		default: '18px',
	},
})

const iconSize = computed(() => {
	let _size = props.size
	if (typeof _size === 'number') {
		_size = `${_size}px`
	} else if (_size.includes('px') || _size.includes('rem') || _size.includes('em')) {
		_size = _size
	} else {
		_size = `${_size}px`
	}
	return _size
})

const iconColor = computed(() => props.color)
</script>
<template>
	<i class="akvts-icons" v-html="Icons[iconName]"></i>
</template>
<style scoped lang="scss">
.akvts-icons {
	display: flex;
	:deep(svg) {
		color: v-bind(iconColor);
		font-size: v-bind(iconSize);
		height: 1em !important;
		width: 1em !important;
	}
}
</style>
