<script setup>
import {ref, reactive, onUnmounted} from 'vue'
import {useContainerBounds} from '@/hooks/sheet/hooks/useContainerBounds'

const emits = defineEmits(['searchAll', 'searchPrevious', 'searchNext'])
const props = defineProps({
	show: {
		type: Boolean,
		default: false,
	},
})
const searchValue = ref('')

// 拖拽状态管理
const isDragging = ref(false)
const dragStart = reactive({
	x: 0,
	y: 0,
	elementX: 0,
	elementY: 0,
})
const currentPosition = reactive({
	left: '50%',
	top: '50%',
})

// 容器边界信息
const containerBounds = ref(null)
const searchElement = ref(null)

// 性能优化 - 使用 requestAnimationFrame
let rafId = null

const onDragstart = (e) => {
	if (e.button !== 0) return // 只处理左键点击

	e.preventDefault()
	isDragging.value = true

	// 记录鼠标起始位置
	dragStart.x = e.clientX
	dragStart.y = e.clientY

	// 获取元素当前位置
	const rect = searchElement.value.getBoundingClientRect()
	// 获取容器边界
	containerBounds.value = useContainerBounds(searchElement.value?.closest('.air-sheet-component'))

	dragStart.elementX = rect.left - 15
	dragStart.elementY = containerBounds.value.rect.top > 0 ? rect.top - rect.height + 25 : rect.top

	// 添加全局事件监听器
	document.addEventListener('mousemove', onDragMove)
	document.addEventListener('mouseup', onDragend)

	// 禁用文本选择并添加拖拽样式
	document.body.style.userSelect = 'none'
	document.body.classList.add('dragging')
}

const onDragMove = (e) => {
	if (!isDragging.value) return

	e.preventDefault()

	// 使用 requestAnimationFrame 进行性能优化
	if (rafId) {
		cancelAnimationFrame(rafId)
	}

	rafId = requestAnimationFrame(() => {
		try {
			// 计算鼠标移动距离
			const deltaX = e.clientX - dragStart.x
			const deltaY = e.clientY - dragStart.y

			// 计算新位置
			let newLeft = dragStart.elementX + deltaX
			let newTop = dragStart.elementY + deltaY

			// 边界检测
			if (containerBounds.value && searchElement.value) {
				const searchRect = searchElement.value.getBoundingClientRect()
				const searchWidth = searchRect.width
				const searchHeight = searchRect.height

				// 限制在容器边界内
				newLeft = Math.max(
					containerBounds.value.left + 10,
					Math.min(newLeft, containerBounds.value.right - searchWidth - 10)
				)
				newTop = Math.max(
					containerBounds.value.top + 7,
					Math.min(newTop, containerBounds.value.bottom - searchHeight - 10)
				)
			}

			// 更新位置
			currentPosition.left = `${newLeft}px`
			currentPosition.top = `${newTop}px`
		} catch (error) {
			console.warn('拖拽移动处理失败:', error)
		}
	})
}

const onDragend = () => {
	if (!isDragging.value) return

	isDragging.value = false

	// 取消可能存在的动画帧
	if (rafId) {
		cancelAnimationFrame(rafId)
		rafId = null
	}

	// 移除全局事件监听器
	document.removeEventListener('mousemove', onDragMove)
	document.removeEventListener('mouseup', onDragend)

	// 恢复文本选择并移除拖拽样式
	document.body.style.userSelect = ''
	document.body.classList.remove('dragging')
}

// 组件卸载时清理事件监听器
onUnmounted(() => {
	// 取消可能存在的动画帧
	if (rafId) {
		cancelAnimationFrame(rafId)
		rafId = null
	}

	if (isDragging.value) {
		document.removeEventListener('mousemove', onDragMove)
		document.removeEventListener('mouseup', onDragend)
		document.body.style.userSelect = ''
		document.body.classList.remove('dragging')
	}
})
</script>
<template>
	<div
		v-show="show"
		ref="searchElement"
		class="air-sheet-search shadow-12"
		:style="{
			left: currentPosition.left,
			top: currentPosition.top,
			transform:
				currentPosition.left === '50%' && currentPosition.top === '50%'
					? 'translate(-50%, -50%)'
					: 'none',
		}"
	>
		<div class="title df aic" @mousedown="onDragstart">
			<Icons name="Search" class="mg-right-5" />
			查找
		</div>
		<FormItem
			v-model="searchValue"
			:items="[
				{
					prop: 'keyword',
					label: '搜索',
					type: 'text',
					labelWidth: 0,
					placeholder: '请输入搜索内容',
				},
			]"
		></FormItem>
		<div class="all"></div>
		<div class="btns">
			<el-button @click="emits('searchAll')">查找全部</el-button>
			<el-button @click="emits('searchPrevious')">上一个</el-button>
			<el-button @click="emits('searchNext')" type="primary">下一个</el-button>
			<el-button @click="emits('close')">关闭</el-button>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-search {
	border: 1px solid var(--z-line);
	background-color: var(--z-theme);
	border-radius: 5px;
	width: 342px;
	padding: 10px;
	position: absolute;
	transition: box-shadow 0.2s ease;
	z-index: 10;

	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.title {
		cursor: move;
		font-size: 14px;
		font-weight: 500;
		margin-bottom: 10px;
		user-select: none;

		&:hover {
			opacity: 0.8;
		}

		&:active {
			opacity: 0.6;
		}
	}
}

// 拖拽时的全局样式
body.dragging {
	user-select: none !important;
	cursor: move !important;
}
</style>
