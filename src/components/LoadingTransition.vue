<script setup>
import {computed, ref, watch} from 'vue'

const props = defineProps({
	color: {
		type: String,
		default: 'var(--z-font-color)',
	},
	text: {
		type: String,
		default: '正在获取',
	},
	align: {
		type: String,
		default: 'center',
	},
	size: {
		type: String,
		default: '14px',
	},
	static: {
		type: Boolean,
		default: false,
	},
})

const jc = computed(() => {
	let _jc = 'center'
	switch (props.align) {
		case 'left':
			_jc = 'flex-start'
			break
		case 'right':
			_jc = 'flex-end'
			break
	}
	return _jc
})

const id = `icon-${Math.random().toString(36).slice(2)}`
const _size = ref(props.size)
const _color = ref(props.color)
const _iconColor = ref(props.color)

watch(
	() => props.size,
	(val) => {
		_size.value = val
	}
)

watch(
	() => props.color,
	(val) => {
		_color.value = val
		_iconColor.value = val
	}
)
</script>
<template>
	<div class="akvts-loading-transition" :style="{justifyContent: jc}">
		<Icons :key="id" name="Loading2" :color="_iconColor" :size="_size"></Icons>
		<span>
			<slot name="text">
				{{ text }}
			</slot>
			<small v-if="!props.static"></small>
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
		animation: rotate 1.8s linear infinite;
		margin-right: 3px;
	}

	span {
		font-size: v-bind(_size) !important;
		color: v-bind(_color);
		// transform: translateY(-0.5px);
		small::after {
			content: '';
			animation: more 2s linear infinite;
			color: v-bind(_color);
		}
	}
}
</style>
