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

// ==================== 虚拟滚动常量定义 ====================
const DATE_HEADER_HEIGHT = 23 // 日期头部高度（包含 margin-bottom）
const LIST_ITEM_HEIGHT = 78 // 单个 list 项高度（包含 margin）
const ITEM_PADDING_TOP = 10 // item 容器的 padding-top
const BUFFER_SIZE = 2 // 缓冲区大小（上下各渲染额外的项）
const CONTAINER_HEIGHT = 500 // 容器高度的估算值，用于计算可见项数量

// ==================== 状态管理 ====================
// 展开/收起状态管理（key: 日期字符串, value: boolean）
const expandedStates = reactive({})

// 虚拟滚动状态
const virtualScrollState = reactive({
	scrollTop: 0,
})

// 滚动容器引用
const itemsRef = ref(null)

// 追踪上一次的数据长度，用于判断是否是新数据
const lastDataLength = ref(0)

// 数据更新状态（用于防止在加载数据时触发滚动事件）
const isUpdatingData = ref(false)

// ==================== 高度计算系统 ====================
/**
 * 计算单个日期分组的高度
 * @param {Object} item - 日期分组对象 {date, list}
 * @param {boolean} isExpanded - 是否展开
 * @returns {number} 高度（px）
 */
const getItemHeight = (item, isExpanded) => {
	// 基础高度：item 的 padding-top + 日期头部高度
	let height = ITEM_PADDING_TOP + DATE_HEADER_HEIGHT

	// 如果展开，加上所有 list 项的高度
	if (isExpanded && item.list && item.list.length > 0) {
		height += item.list.length * LIST_ITEM_HEIGHT
	}

	return height
}

/**
 * 计算高度映射表
 * 返回每个日期分组的高度和累积偏移量
 */
const heightMap = computed(() => {
	const map = []
	let accumulatedHeight = 0

	props.data.forEach((item, index) => {
		const isExpanded = expandedStates[item.date] !== false // 默认展开
		const height = getItemHeight(item, isExpanded)

		map.push({
			index,
			height,
			top: accumulatedHeight,
			bottom: accumulatedHeight + height,
			date: item.date,
			isExpanded,
		})

		accumulatedHeight += height
	})

	return map
})

/**
 * 计算总高度
 */
const totalHeight = computed(() => {
	if (heightMap.value.length === 0) return 0
	const lastItem = heightMap.value[heightMap.value.length - 1]
	return lastItem.bottom
})

// ==================== 虚拟滚动可见范围计算 ====================
/**
 * 二分查找：根据 scrollTop 查找起始索引
 * @param {number} scrollTop - 滚动位置
 * @returns {number} 起始索引
 */
const findStartIndex = (scrollTop) => {
	const map = heightMap.value
	if (map.length === 0) return 0

	let left = 0
	let right = map.length - 1

	while (left < right) {
		const mid = Math.floor((left + right) / 2)
		if (map[mid].bottom <= scrollTop) {
			left = mid + 1
		} else {
			right = mid
		}
	}

	return left
}

/**
 * 计算可见范围
 */
const visibleRange = computed(() => {
	const scrollTop = virtualScrollState.scrollTop
	const map = heightMap.value

	if (map.length === 0) {
		return {start: 0, end: 0, offsetY: 0}
	}

	// 查找起始索引
	let start = findStartIndex(scrollTop)
	// 向前扩展缓冲区
	start = Math.max(0, start - BUFFER_SIZE)

	// 查找结束索引
	const viewportBottom = scrollTop + CONTAINER_HEIGHT
	let end = start

	while (end < map.length && map[end].top < viewportBottom) {
		end++
	}

	// 向后扩展缓冲区
	end = Math.min(map.length, end + BUFFER_SIZE)

	// 计算偏移量（第一个可见项的 top 值）
	const offsetY = start < map.length ? map[start].top : 0

	return {start, end, offsetY}
})

/**
 * 计算可见项列表
 */
const visibleItems = computed(() => {
	const {start, end} = visibleRange.value
	return props.data.slice(start, end).map((item, index) => ({
		...item,
		originalIndex: start + index,
		isExpanded: expandedStates[item.date] !== false, // 默认展开
	}))
})

// ==================== 交互事件处理 ====================
/**
 * 处理滚动事件
 */
const handleScroll = (e) => {
	// 如果正在更新数据，忽略滚动事件
	if (isUpdatingData.value) return
	virtualScrollState.scrollTop = e.target.scrollTop
}

/**
 * 滚动到最底部时的处理
 */
const scrollToBottom = () => {
	if (!itemsRef.value) return
	// 如果已经在加载中，直接返回，防止重复触发
	if (isUpdatingData.value) return

	isUpdatingData.value = true
	// 触发异步加载历史记录事件
	sheet.value?.emits('asyncAllHistory', () => {
		nextTick(() => {
			// 虚拟滚动容器不会被隐藏，所以不需要恢复滚动位置
			// 直接关闭加载状态即可
			isUpdatingData.value = false
		})
	})
}

/**
 * 切换展开/收起状态
 * @param {string} date - 日期字符串
 */
const toggleExpand = (date) => {
	// 如果状态不存在，默认为 true（展开），点击后变为 false（收起）
	// 如果状态存在，则切换
	expandedStates[date] = expandedStates[date] === false ? true : false
}

// ==================== 数据变化响应 ====================
/**
 * 监听数据变化，初始化新日期的展开状态
 */
watch(
	() => props.data,
	(newData) => {
		// 为新增的日期初始化展开状态（默认展开）
		newData.forEach((item) => {
			if (!(item.date in expandedStates)) {
				expandedStates[item.date] = true
			}
		})
	},
	{deep: true, immediate: true}
)

/**
 * 监听数据长度变化，处理虚拟滚动容器高度变化
 */
watch(
	() => props.data.length,
	(newLength) => {
		// 当数据长度增加时（通过 push 添加新数据）
		if (newLength > lastDataLength.value && lastDataLength.value > 0) {
			// 数据被追加，虚拟滚动容器高度会自动增加
			// 重置加载状态，允许下一次加载
			// 这是一个备用机制，即使外部没有调用回调，也能通过数据变化来恢复
			nextTick(() => {
				isUpdatingData.value = false
			})
		}
		// 更新上一次的数据长度
		lastDataLength.value = newLength
	}
)

/**
 * 监听滚动位置，当滚动到最底部时调用 scrollToBottom
 */
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
				'airSheetWatchAllHistory'
			)()
		}
	}
)
</script>
<template>
	<div
		class="air-sheet-all-history"
		:class="{on: sheet.state.allHistory, 'shadow-12': sheet.state.allHistory}"
	>
		<div class="head df aic">
			<span class="title flx">协作历史</span>
			<span class="close" @click="emit('update:show', false)">&times;</span>
		</div>
		<div ref="itemsRef" class="items" @scroll="handleScroll">
			<!-- 虚拟滚动：占位容器，撑开总高度 -->
			<div class="virtual-scroll-phantom" :style="{height: `${totalHeight}px`}"></div>

			<!-- 虚拟滚动：内容容器，使用 transform 偏移 -->
			<div
				class="virtual-scroll-content"
				:style="{transform: `translateY(${visibleRange.offsetY}px)`}"
			>
				<div v-for="item in visibleItems" :key="item.date" class="item">
					<!-- 日期头部：可点击展开/收起 -->
					<div class="date df aic" @click="toggleExpand(item.date)">
						<Icons
							name="ArrowRight"
							class="arrow-icon"
							:class="{expanded: item.isExpanded}"
						/>
						{{ item.date }}
					</div>

					<!-- 列表内容：根据展开状态显示/隐藏 -->
					<div v-show="item.isExpanded" class="list">
						<div v-for="(record, index) in item.list" :key="index" class="box">
							<div class="user">
								<span class="time">{{ record.time }}</span>
								{{ record.name }}
							</div>
							<div class="content">
								编辑
								<strong>
									{{
										sheet.hooks.toolsHook
											.parseCellRange(`${record.r}-${record.c}`)
											?.sqref?.split(':')[0]
									}} </strong
								>{{ record.content }}
							</div>
						</div>
					</div>
				</div>
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
.air-sheet-all-history {
	border-left: 1px solid var(--z-line);
	background-color: rgba(var(--z-theme-rgb), 0.15);
	backdrop-filter: blur(8px);
	display: none;
	height: 100%;
	position: absolute;
	right: 0;
	transition: box-shadow 0.15s linear;
	top: 0;
	width: 0;
	z-index: 3;
	user-select: none;

	&:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	&.on {
		display: block;
		width: 20%;
	}

	.head {
		border-bottom: 1px solid var(--z-line);
		padding: 10px;
		.title {
			font-size: 14px;
			font-weight: 500;
		}
		.close {
			cursor: pointer;
			font-size: 14px;
		}
	}

	.items {
		overflow: auto;
		height: calc(100% - 34px);
		position: relative;

		// 虚拟滚动：占位容器
		.virtual-scroll-phantom {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			z-index: -1;
		}

		// 虚拟滚动：内容容器
		.virtual-scroll-content {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
		}

		.item {
			padding: 10px 10px 0 10px;
		}

		.date {
			cursor: pointer;
			margin-bottom: 5px;

			// 箭头图标旋转动画
			.arrow-icon {
				transition: transform 0.2s ease;
				transform: rotate(0deg);

				&.expanded {
					transform: rotate(90deg);
				}
			}
		}

		// .list 使用 v-show 控制显示/隐藏，无需额外样式

		.box {
			border: 1px solid var(--z-line);
			border-radius: 5px;
			background-color: rgba(var(--z-theme-rgb), 1);
			padding: 10px;
			margin: 0 5px 10px 5px;

			strong {
				color: #f00;
				padding: 0 5px 0 0;
			}

			.user {
				margin-bottom: 10px;
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}

			.content {
				overflow: hidden;
				text-overflow: ellipsis;
				white-space: nowrap;
			}
		}
	}
}
</style>
