<script setup>
import {computed, ref, reactive, watch, nextTick} from 'vue'
import useDebounce from '@/hooks/useDebounce'

const props = defineProps({
	sheet: {
		type: Object,
		default: () => ({}),
	},
	show: {
		type: Boolean,
		default: false,
	},
	data: {
		type: Array,
		default: () => [],
	},
})

const sheet = computed(() => props.sheet)
const emit = defineEmits(['update:show'])
const ranged = computed(() => {
	if (!sheet.value) return ''
	const {r, c} = sheet.value?.hooks?.selectionRangeHook?.getRanged() || {}

	if (r > -1 && c > -1) {
		return sheet.value.hooks.toolsHook.parseCellRange(`${r}-${c}`)
	}
	return ''
})
const container = computed(() => document.querySelector(`#${sheet.value.containerId}`))

// 记录上一次的选中单元格
const lastSelectedCell = ref({r: -1, c: -1})

// 虚拟滚动状态
const virtualScrollState = reactive({
	scrollTop: 0,
	visibleStart: 0,
	visibleEnd: 0,
})

const itemHeight = 70 // 每个项目的高度（包括 margin）
const containerHeight = 200 // .items 容器高度
const historyRef = ref(null)
const itemsRef = ref(null)

// 追踪上一次的数据长度，用于判断是否是新数据
const lastDataLength = ref(0)

// 标志：是否正在处理数据变化（防止滚动事件干扰）
const isUpdatingData = ref(false)

// 弹窗尺寸
const popupWidth = 400
const popupHeight = 255
const gap = 10 // 弹窗与单元格的间距

// 位置状态（相对于容器的绝对位置）
const position = reactive({
	top: 0,
	left: 0,
})

// 计算起始索引
const visibleStart = computed(() => {
	return Math.max(0, Math.floor(virtualScrollState.scrollTop / itemHeight))
})

// 计算可见的项目范围
const visibleItems = computed(() => {
	if (props.data.length === 0) return []

	const start = visibleStart.value

	// 计算结束索引（多加 2 个以确保覆盖整个可见区域）
	const end = Math.min(
		props.data.length,
		Math.ceil((virtualScrollState.scrollTop + containerHeight) / itemHeight) + 2
	)

	return props.data.slice(start, end)
})

// 计算虚拟滚动的偏移量
const virtualScrollOffset = computed(() => {
	return visibleStart.value * itemHeight
})

// 计算底部占位符高度
const virtualScrollBottomOffset = computed(() => {
	const end = Math.min(
		props.data.length,
		Math.ceil((virtualScrollState.scrollTop + containerHeight) / itemHeight) + 2
	)
	const bottomStart = end * itemHeight
	const totalHeight = props.data.length * itemHeight
	return Math.max(0, totalHeight - bottomStart)
})

// 计算弹窗位置（相对于容器）
const calculatePosition = () => {
	if (!sheet.value || !container.value) return

	try {
		const {r, c} = sheet.value?.hooks?.selectionRangeHook?.getRanged() || {}
		if (r === undefined || c === undefined || r < 0 || c < 0) return

		// 查找对应的单元格 DOM 元素
		const cellElement = container.value.querySelector(`[data-cell="${r}-${c}"]`)
		if (!cellElement) return

		const cellRect = cellElement.getBoundingClientRect()
		const containerRect = container.value.getBoundingClientRect()

		// 计算单元格相对于容器的位置
		const cellLeft = cellRect.left - containerRect.left
		const cellTop = cellRect.top - containerRect.top
		const cellRight = cellLeft + cellRect.width
		const cellBottom = cellTop + cellRect.height

		// 容器的可用空间
		const containerWidth = containerRect.width
		const containerHeight = containerRect.height

		// 计算四个方向的位置
		let posX = cellRight + gap // 默认显示在单元格右侧
		let posY = cellTop // 默认与单元格顶部对齐

		// 判断是否需要显示在左侧
		if (posX + popupWidth > containerWidth) {
			posX = cellLeft - popupWidth - gap
		}

		// 判断是否需要显示在上方
		if (posY + popupHeight > containerHeight) {
			posY = cellBottom - popupHeight
		}

		// 严格的边界限制：确保弹窗完全在容器内
		// 左边界：posX >= 0
		posX = Math.max(0, posX)
		// 右边界：posX + popupWidth <= containerWidth
		posX = Math.min(posX, Math.max(0, containerWidth - popupWidth))

		// 上边界：posY >= 0
		posY = Math.max(0, posY)
		// 下边界：posY + popupHeight <= containerHeight
		posY = Math.min(posY, Math.max(0, containerHeight - popupHeight))

		position.left = posX
		position.top = posY
	} catch (error) {
		console.error('计算位置失败:', error)
	}
}

// 处理滚动
const handleScroll = (e) => {
	// 如果正在更新数据，忽略滚动事件
	if (isUpdatingData.value) return
	virtualScrollState.scrollTop = e.target.scrollTop
}

// 滚动到最底部时的处理
const scrollToBottom = () => {
	if (!itemsRef.value) return
	isUpdatingData.value = true
	const {r, c, rr, cc} = sheet.value?.hooks?.selectionRangeHook?.getRanged() || {}
	// 触发异步加载历史记录事件
	sheet.value?.emits('asyncCellHistory', {r, c, rr, cc}, () => {
		nextTick(() => {
			// 虚拟滚动容器不会被隐藏，所以不需要恢复滚动位置
			// 直接关闭加载状态即可
			isUpdatingData.value = false
		})
	})
}

// 监听数据长度变化，处理虚拟滚动容器高度变化
watch(
	() => props.data.length,
	(newLength) => {
		// 当数据长度增加时（通过 push 添加新数据）
		if (newLength > lastDataLength.value && lastDataLength.value > 0) {
			// 数据被追加，虚拟滚动容器高度会自动增加
			// 不需要做任何处理，虚拟滚动会自动调整
		}
		// 更新上一次的数据长度
		lastDataLength.value = newLength
	}
)

// 监听选中单元格变化
watch(
	() => {
		const {r, c} = sheet.value?.hooks?.selectionRangeHook?.getRanged() || {}
		return `${r}-${c}`
	},
	(newVal) => {
		if (!sheet.value) return
		const [r, c] = newVal.split('-').map(Number)
		const lastR = lastSelectedCell.value.r
		const lastC = lastSelectedCell.value.c

		// 如果是第一次改变（从 -1 变为有效值）
		if (r >= 0 && c >= 0 && (r !== lastR || c !== lastC)) {
			// 选中单元格改变时关闭弹框
			emit('update:show', false)
			lastSelectedCell.value = {r, c}
		}
	}
)

// 监听 show 属性，当显示时计算位置
watch(
	() => props.show,
	(newVal) => {
		if (newVal) {
			nextTick(() => {
				calculatePosition()
			})
		}
	}
)

// 监听滚动位置，当滚动到最底部时调用 scrollToBottom
watch(
	() => virtualScrollState.scrollTop,
	(newScrollTop) => {
		if (!itemsRef.value || props.data.length === 0) return

		// 计算最大滚动距离
		const maxScroll = itemsRef.value.scrollHeight - itemsRef.value.clientHeight

		// 当滚动到最底部时（允许 10px 的误差）
		if (newScrollTop >= maxScroll - 10) {
			useDebounce(
				() => {
					scrollToBottom()
				},
				250,
				'airSheetWatchCellHistory'
			)()
		}
	}
)
</script>
<template>
	<div
		v-show="show"
		ref="historyRef"
		class="air-sheet-cell-history shadow-12"
		:style="{
			position: 'absolute',
			top: `${position.top}px`,
			left: `${position.left}px`,
		}"
	>
		<div class="title df aic">
			<strong class="red mg-right-5">{{ ranged?.sqref?.split(':')?.[0] }}</strong>
			改动记录
		</div>
		<div
			ref="itemsRef"
			class="items"
			:style="{'padding-right': props.data.length > 2 ? '5px' : '15px'}"
			@scroll="handleScroll"
		>
			<!-- 虚拟滚动容器 - 有数据时显示 -->
			<div
				v-if="props.data.length > 0"
				:style="{height: `${props.data.length * itemHeight}px`, position: 'relative'}"
			>
				<!-- 顶部占位符 -->
				<div :style="{height: `${virtualScrollOffset}px`}"></div>

				<!-- 可见项目 -->
				<div
					v-for="(item, index) in visibleItems"
					:key="`${visibleStart}-${index}`"
					:data-title="item.name"
					class="item tooltip"
				>
					<span class="name">
						{{ item.name || '未命名' }}
					</span>
					<span class="time">{{ item.time || '未知时间' }}</span>
					<div class="content" :title="item.conten">
						编辑内容: {{ item.content || '无内容' }}
					</div>
				</div>

				<!-- 底部占位符 -->
				<div :style="{height: `${virtualScrollBottomOffset}px`}"></div>
			</div>

			<!-- 空状态 -->
			<div v-if="props.data.length === 0" class="df aic jcc w-full h-full">
				<el-empty description="暂无历史记录" :image-size="70" />
			</div>

			<!-- 加载遮罩层 - 不隐藏虚拟滚动容器，只显示遮罩 -->
			<div
				v-if="isUpdatingData"
				class="df aic jcc w-full h-full"
				:style="{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(255, 255, 255, 0.7)',
					zIndex: 10,
				}"
			>
				<LoadingTransition text="正在获取历史记录" />
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-cell-history {
	border: 1px solid var(--z-line);
	background-color: rgba(var(--z-theme-rgb), 0.6);
	border-radius: 5px;
	backdrop-filter: blur(8px);
	position: absolute;
	transition: box-shadow 0.15s linear;
	width: 400px;
	height: 255px;
	z-index: 100;
	user-select: none;

	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.title {
		font-size: 14px;
		font-weight: 500;
		padding: 15px;
		user-select: none;
	}

	.tooltip {
		position: relative;
		cursor: pointer;
	}

	.tooltip::after {
		content: attr(data-title);
		border: 1px solid var(--z-line);
		position: absolute;
		left: 5px;
		top: 5px;
		background: rgba(var(--z-bg-secondary-rgb), 1);
		color: var(--z-font-color);
		padding: 4px 8px;
		border-radius: 5px;
		line-height: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 13px;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.1s;
		width: calc(100% - 28px);
		z-index: 1;
	}

	.tooltip:hover::after {
		opacity: 1;
	}

	.items {
		border-top: 1px solid var(--z-line);
		height: 200px;
		overflow: auto;
		padding: 10px 10px 0 15px;
		position: relative;

		.item {
			background-color: rgba(var(--z-theme-rgb), 1);
			border-radius: 5px;
			border: 1px solid var(--z-line);
			display: flex;
			flex-wrap: wrap;
			padding: 10px 15px;
			margin: 0 0 10px 0;
			height: 60px;
			box-sizing: border-box;

			.name {
				flex: 1;
				font-weight: 500;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.time {
				font-size: 12px;
				color: var(--z-text-secondary, #999);
				margin-left: 10px;
			}

			.content {
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			div {
				flex: none;
				padding: 10px 0 0 0;
				width: 100%;
				font-size: 12px;
				color: var(--z-text-secondary, #999);
			}
		}
	}
}
</style>
