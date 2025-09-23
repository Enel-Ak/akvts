<script setup>
import {ref, reactive, onUnmounted, computed} from 'vue'
import {useContainerBounds} from '@/hooks/sheet/hooks/useContainerBounds'

const emits = defineEmits([
	'searchAll',
	'searchPrevious',
	'searchNext',
	'update:show',
	'jumpToCell',
])
const props = defineProps({
	show: {
		type: Boolean,
		default: false,
	},
	searchList: {
		type: Array,
		default: () => [],
	},
})
const searchValue = ref({keyword: ''})
const activeRow = ref(-1)
const activeCol = ref(-1)

// 跳转到指定单元格
const jumpToCell = (item) => {
	activeRow.value = item.r
	activeCol.value = item.c
	emits('jumpToCell', item.r, item.c)
}

// 处理回车键搜索
const onKeyPress = (event) => {
	if (event.key === 'Enter') {
		emits('searchAll', searchValue.value.keyword)
	}
}

// 虚拟滚动配置
const ITEM_HEIGHT = 36 // 每个搜索结果项的高度
const VISIBLE_COUNT = 8 // 可见的搜索结果数量
const BUFFER_SIZE = 2 // 缓冲区大小

// 虚拟滚动状态
const scrollTop = ref(0)
const containerHeight = VISIBLE_COUNT * ITEM_HEIGHT

// 计算可见范围
const visibleRange = computed(() => {
	const start = Math.floor(scrollTop.value / ITEM_HEIGHT)
	const end = Math.min(start + VISIBLE_COUNT + BUFFER_SIZE * 2, props.searchList.length)
	return {
		start: Math.max(0, start - BUFFER_SIZE),
		end,
		offsetY: Math.max(0, start - BUFFER_SIZE) * ITEM_HEIGHT,
	}
})

// 可见的搜索结果
const visibleItems = computed(() => {
	const {start, end} = visibleRange.value
	return props.searchList.slice(start, end).map((item, index) => ({
		...item,
		index: start + index,
	}))
})

// 处理滚动事件
const onScroll = (event) => {
	scrollTop.value = event.target.scrollTop
}

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
	dragStart.elementY =
		containerBounds.value.rect.top > 0
			? rect.top - rect.height + 25 + (props.searchList.length ? containerHeight + 50 : 0)
			: rect.top

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

const numberToLetters = (num) => {
	let result = ''
	while (num > 0) {
		let mod = (num - 1) % 26
		result = String.fromCharCode(65 + mod) + result
		num = Math.floor((num - 1) / 26)
	}
	return result
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
		@keydown.stop
	>
		<div class="title df aic" @mousedown="onDragstart">
			<Icons name="Search" class="mg-right-5" />
			查找
		</div>
		<FormItem
			v-model="searchValue.keyword"
			:items="[
				{
					prop: 'keyword',
					label: '搜索',
					type: 'text',
					labelWidth: 0,
					placeholder: '请输入搜索内容',
					attrs: {
						onKeypress: onKeyPress,
					},
				},
			]"
		></FormItem>
		<div v-show="searchList.length" class="all">
			<div class="header">
				<span>单元格</span>
				<span>内容</span>
				<div class="search-header">找到 {{ searchList.length }} 个匹配项</div>
			</div>
			<div class="virtual-list" :style="{height: `${containerHeight}px`}" @scroll="onScroll">
				<div
					class="virtual-list-phantom"
					:style="{height: `${searchList.length * ITEM_HEIGHT}px`}"
				></div>
				<div
					class="virtual-list-content"
					:style="{transform: `translateY(${visibleRange.offsetY}px)`}"
				>
					<div
						v-for="item in visibleItems"
						:key="`${item.r}-${item.c}`"
						class="item"
						:class="{active: item.r === activeRow && item.c === activeCol}"
						:style="{height: `${ITEM_HEIGHT}px`}"
						@click="jumpToCell(item)"
					>
						<span class="position">
							{{ numberToLetters(item.c + 1) }}{{ item.r + 1 }}
						</span>
						<span class="content" :title="item.v">{{ item.v }}</span>
					</div>
				</div>
			</div>
		</div>
		<div class="btns">
			<el-button @click="emits('searchAll', searchValue.keyword)">查找全部</el-button>
			<el-button @click="emits('searchPrevious', searchValue.keyword)">上一个</el-button>
			<el-button @click="emits('searchNext', searchValue.keyword)" type="primary"
				>下一个</el-button
			>
			<el-button @click="emits('update:show', false)">关闭</el-button>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-search {
	border: 1px solid var(--z-line);
	background-color: rgba(var(--z-theme-rgb), 0.5);
	backdrop-filter: blur(8px);
	border-radius: 5px;
	width: 342px;
	padding: 10px;
	position: absolute;
	transition: box-shadow 0.2s ease;
	user-select: none;
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

	.all {
		border: 1px solid var(--z-line);
		border-radius: 5px;
		margin: -10px 0 10px 0;
		padding: 10px 10px 0 10px;

		.header {
			align-items: center;
			border-radius: 2px;
			border-bottom: 1px solid var(--z-line);
			background-color: rgba(var(--z-bg-secondary-rgb), 0.5);
			display: flex;
			font-weight: 500;

			margin-bottom: 8px;
			padding: 8px 5px;
			span:nth-child(1) {
				width: 98px;
			}
			span:nth-child(2) {
				flex: 1;
			}
		}

		.search-header {
			font-size: 13px;
			color: rgba(var(--z-font-color-rgb), 0.7);
		}

		.virtual-list {
			position: relative;
			overflow-y: auto;
			border: 1px solid var(--z-line);
			border-radius: 3px;
			background: var(--z-theme);
			margin-bottom: 10px;
		}

		.virtual-list-phantom {
			position: absolute;
			left: 0;
			top: 0;
			right: 0;
			z-index: -1;
		}

		.virtual-list-content {
			position: absolute;
			left: 0;
			right: 0;
			top: 0;
		}

		.item {
			align-items: center;
			cursor: pointer;
			display: flex;
			padding: 8px 12px;
			border-bottom: 1px solid var(--z-line);
			transition: background-color 0.2s;
			box-sizing: border-box;

			&.active {
				background-color: rgba(var(--z-bg-secondary-rgb), 1);
			}

			&:hover {
				background-color: rgba(var(--z-bg-secondary-rgb), 0.5);
			}

			&:last-child {
				border-bottom: none;
			}
		}

		.position {
			font-size: 13px;
			color: rgba(var(--z-font-color-rgb), 0.5);
			min-width: 40px;
			flex-shrink: 0;
			width: 80px;
		}

		.content {
			flex: 1;
			padding: 0 10px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			font-size: 13px;
			line-height: 1.5;
		}
	}

	.btns {
		button {
			font-size: 13px;
		}
	}
}

// 拖拽时的全局样式
body.dragging {
	user-select: none !important;
	cursor: move !important;
}
</style>
