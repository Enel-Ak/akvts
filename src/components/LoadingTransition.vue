<script setup>
import {computed} from 'vue'

const props = defineProps({
	color: {
		type: String,
		default: 'var(--z-font-color)',
	},
	text: {
		type: String,
		default: '正在获取',
	},
})

const iconSize = computed(() => {
	let _size = 0
	if (typeof _size === 'number') {
		_size = `${_size}px`
	} else if (_size.includes('px') || _size.includes('rem') || _size.includes('em')) {
		_size = props.size
	} else {
		_size = `${_size}px`
	}
	return _size
})

const iconColor = computed(() => props.color)
</script>
<template>
	<div class="akvts-loading-transition">
		<Icons icon-name="Loading" :color="iconColor"></Icons>
		<span>
			<slot name="text">
				{{ text }}
			</slot>
			<small></small>
		</span>
	</div>
</template>
<style scoped lang="scss">
@keyframes rotate {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
@keyframes more {
	0% {
		content: '';
	}
	25% {
		content: '.';
	}
	50% {
		content: '..';
	}
	75% {
		content: '...';
	}
	100% {
		content: '....';
	}
}
.akvts-loading-transition {
	align-items: center;
	display: flex;
	i {
		animation: rotate 0.5s linear infinite;
		margin-right: 3px;
	}

	span {
		transform: translateY(-0.5px);
		small::after {
			content: '';
			animation: more 2s linear infinite;
		}
	}

	:deep(svg) {
		width: 13px !important;
		height: 13px !important;
	}
}
</style>
