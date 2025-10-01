<script setup>
import Icons from '@/enum/useIconsEnum'
import {computed} from 'vue'
const props = defineProps({
	name: {
		type: String,
		default: '',
	},
	svg: {
		type: String,
		default: '',
	},
	color: {
		type: String,
		default: 'var(--z-font-color)',
	},
	fill: {
		type: String,
		default: '',
	},
	stroke: {
		type: String,
		default: '',
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

// 生成唯一ID
const uniqueId = `icon-${Math.random().toString(36).slice(2)}`

// 处理SVG内容，替换颜色和ID
const svgContent = computed(() => {
	const content = props.svg || Icons[props.iconName] || Icons[props.name] || ''
	if (!content) return ''

	let result = content

	// 为SVG中的ID添加唯一标识，避免多个图标ID冲突
	// 替换linearGradient的id
	result = result.replace(/id="([^"]+)"/g, `id="$1-${uniqueId}"`)

	// 替换引用原ID的url(#id)
	result = result.replace(/url\(#([^)]+)\)/g, `url(#$1-${uniqueId})`)

	// 只有当颜色不是默认值时才替换颜色
	if (props.color !== 'var(--z-font-color)') {
		// 替换 stop-color="currentColor"
		result = result.replace(/stop-color="currentColor"/g, `stop-color="${props.color}"`)

		// 替换其他颜色属性
		result = result.replace(/fill="currentColor"/g, `fill="${props.fill || props.color}"`)
		result = result.replace(/stroke="currentColor"/g, `stroke="${props.stroke || props.color}"`)
	}

	return result
})
</script>
<template>
	<i :key="uniqueId" class="akvts-icons" v-bind="$attrs" v-html="svgContent"></i>
</template>
<style scoped lang="scss">
.akvts-icons {
	display: flex;
	:deep(i),
	:deep(svg) {
		font-size: v-bind(iconSize);
		height: 1em !important;
		width: 1em !important;
	}
}
</style>
