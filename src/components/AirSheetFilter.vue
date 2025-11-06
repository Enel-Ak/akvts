<script setup>
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'

const emits = defineEmits(['update:modelValue', 'confirm', 'confirmOnly'])
const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
	filterCol: {
		type: Array,
		default: () => [],
	},
	colIndex: {
		type: Number,
		default: -1,
	},
	// 当前筛选状态，用于同步选中项
	currentFiltered: {
		type: Array,
		default: () => [],
	},
	show: {
		type: Boolean,
		default: false,
	},
})

const mask = ref(false)
const position = ref({top: 0, left: 0})
const filterList = ref([])
const checked = ref([])
const searchValue = ref('')

// 虚拟滚动相关状态
const scrollContainer = ref(null)
const itemHeight = ref(32) // 每个筛选项的预估高度（px）
const containerHeight = ref(300) // 滚动容器的高度（px）
const scrollTop = ref(0) // 当前滚动位置
const bufferCount = ref(10) // 缓冲区项目数量（上下各添加的额外项目）
const startIndex = ref(0) // 可视区域起始索引
const endIndex = ref(0) // 可视区域结束索引
const savedScrollPosition = ref(0) // 保存的滚动位置

// 滚动优化相关状态
const isScrolling = ref(false) // 是否正在滚动
const scrollAnimationId = ref(null) // requestAnimationFrame ID
const lastScrollTime = ref(0) // 上次滚动时间
const scrollVelocity = ref(0) // 滚动速度
const isRendering = ref(false) // 是否正在渲染
const renderQueue = ref([]) // 渲染队列

// 计算属性：过滤后的数据列表
const filteredList = computed(() => {
	if (!searchValue.value) {
		return filterList.value.filter((item) => item.v)
	}
	return filterList.value.filter((item) => item.v && item.v.includes(searchValue.value))
})

// 计算属性：动态缓冲区大小
const dynamicBufferCount = computed(() => {
	// 根据滚动速度动态调整缓冲区大小
	const baseBuffer = bufferCount.value
	const velocityMultiplier = Math.min(scrollVelocity.value * 0.1, 3) // 最大3倍缓冲区
	const dynamicBuffer = Math.ceil(baseBuffer * (1 + velocityMultiplier))

	// 快速滚动时增加缓冲区，最大不超过50个项目
	return Math.min(dynamicBuffer, 50)
})

// 缓存相关状态
const visibleItemsCache = ref(new Map())
const lastCacheKey = ref('')

// 计算属性：可视区域内的数据 - 带缓存优化
const visibleItems = computed(() => {
	const currentBuffer = dynamicBufferCount.value
	const start = Math.max(0, startIndex.value - currentBuffer)
	const end = Math.min(filteredList.value.length, endIndex.value + currentBuffer)

	// 生成缓存键
	const cacheKey = `${start}-${end}-${filteredList.value.length}-${currentBuffer}`

	// 检查缓存
	if (cacheKey === lastCacheKey.value && visibleItemsCache.value.has(cacheKey)) {
		return visibleItemsCache.value.get(cacheKey)
	}

	// 计算新的可视项目
	const items = filteredList.value.slice(start, end).map((item, index) => ({
		...item,
		virtualIndex: start + index, // 虚拟索引，用于定位
	}))

	// 更新缓存（保持缓存大小在合理范围内）
	if (visibleItemsCache.value.size > 10) {
		visibleItemsCache.value.clear()
	}
	visibleItemsCache.value.set(cacheKey, items)
	lastCacheKey.value = cacheKey

	return items
})

// 计算属性：上方占位空间高度
const offsetTop = computed(() => {
	const currentBuffer = dynamicBufferCount.value
	const start = Math.max(0, startIndex.value - currentBuffer)
	return start * itemHeight.value
})

// 计算属性：下方占位空间高度
const offsetBottom = computed(() => {
	const currentBuffer = dynamicBufferCount.value
	const end = Math.min(filteredList.value.length, endIndex.value + currentBuffer)
	return (filteredList.value.length - end) * itemHeight.value
})

// 计算可视区域索引的函数 - 优化版本
const updateVisibleRange = () => {
	const scrollPosition = scrollTop.value
	const containerH = containerHeight.value
	const itemH = itemHeight.value
	const totalItems = filteredList.value.length

	// 边界检查
	if (totalItems === 0 || itemH <= 0 || containerH <= 0) {
		startIndex.value = 0
		endIndex.value = 0
		return
	}

	// 计算可视区域的起始和结束索引，添加容错处理
	const start = Math.max(0, Math.floor(scrollPosition / itemH))
	const visibleItemCount = Math.ceil(containerH / itemH) + 1 // +1 确保覆盖边界情况
	const end = Math.min(totalItems, start + visibleItemCount)

	// 确保索引有效性
	const validStart = Math.max(0, Math.min(start, totalItems - 1))
	const validEnd = Math.max(validStart, Math.min(end, totalItems))

	// 只有在索引真正改变时才更新
	if (startIndex.value !== validStart || endIndex.value !== validEnd) {
		startIndex.value = validStart
		endIndex.value = validEnd

		console.log('虚拟滚动 - 可视区域更新:', {
			scrollPosition,
			startIndex: startIndex.value,
			endIndex: endIndex.value,
			totalItems,
			visibleItems: endIndex.value - startIndex.value,
			bufferSize: dynamicBufferCount.value,
			scrollVelocity: scrollVelocity.value.toFixed(2),
		})
	}
}

// 渲染队列处理函数
const processRenderQueue = () => {
	if (isRendering.value || renderQueue.value.length === 0) {
		return
	}

	isRendering.value = true
	const renderTask = renderQueue.value.shift()

	requestAnimationFrame(() => {
		try {
			renderTask()
		} finally {
			isRendering.value = false
			// 继续处理队列中的下一个任务
			if (renderQueue.value.length > 0) {
				processRenderQueue()
			}
		}
	})
}

// 添加渲染任务到队列
const queueRender = (task) => {
	renderQueue.value.push(task)
	processRenderQueue()
}

// 初始化可视区域
const initializeVisibleRange = () => {
	// 计算初始的可视区域
	const containerH = containerHeight.value
	const itemH = itemHeight.value
	const initialVisibleCount = Math.ceil(containerH / itemH)

	startIndex.value = 0
	endIndex.value = Math.min(filteredList.value.length, initialVisibleCount)
	scrollTop.value = 0
	scrollVelocity.value = 0
	lastScrollTime.value = 0

	// console.log('虚拟滚动 - 初始化:', {
	// 	containerHeight: containerH,
	// 	itemHeight: itemH,
	// 	initialVisibleCount,
	// 	endIndex: endIndex.value,
	// })
}

// 防抖函数
const debounce = (func, wait) => {
	let timeout
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

// 清理缓存的函数
const clearVisibleItemsCache = () => {
	visibleItemsCache.value.clear()
	lastCacheKey.value = ''
}

// 优化的滚动事件处理 - 使用渲染队列和 requestAnimationFrame
const handleScroll = (event) => {
	const target = event.target
	const currentTime = performance.now()

	// 计算滚动速度
	if (lastScrollTime.value > 0) {
		const timeDelta = currentTime - lastScrollTime.value
		const scrollDelta = Math.abs(target.scrollTop - scrollTop.value)
		scrollVelocity.value = timeDelta > 0 ? scrollDelta / timeDelta : 0
	}

	scrollTop.value = target.scrollTop
	lastScrollTime.value = currentTime
	isScrolling.value = true

	// 取消之前的动画帧
	if (scrollAnimationId.value) {
		cancelAnimationFrame(scrollAnimationId.value)
	}

	// 使用渲染队列确保数据更新与DOM渲染同步
	scrollAnimationId.value = requestAnimationFrame(() => {
		// 清空渲染队列，只保留最新的渲染任务
		renderQueue.value = []

		queueRender(() => {
			updateVisibleRange()
		})

		// 设置滚动结束检测
		setTimeout(() => {
			isScrolling.value = false
		}, 150) // 150ms 后认为滚动结束
	})
}

// 搜索变化时的处理（使用防抖）
const handleSearchChange = debounce(() => {
	console.log('虚拟滚动 - 搜索变化，重新初始化')
	clearVisibleItemsCache()
	initializeVisibleRange()
}, 300)

// 保存滚动位置
const saveScrollPosition = () => {
	savedScrollPosition.value = scrollTop.value
	console.log('虚拟滚动 - 保存滚动位置:', savedScrollPosition.value)
}

// 恢复滚动位置
const restoreScrollPosition = () => {
	if (savedScrollPosition.value > 0 && scrollContainer.value) {
		scrollContainer.value.scrollTop = savedScrollPosition.value
		scrollTop.value = savedScrollPosition.value
		updateVisibleRange()
		console.log('虚拟滚动 - 恢复滚动位置:', savedScrollPosition.value)
	}
}

const onClose = () => {
	// 关闭前保存滚动位置
	saveScrollPosition()
	mask.value = false
	emits('update:modelValue', null)
}

const onClear = () => {
	// 确保colIndex是有效的
	if (props.colIndex === -1 || props.colIndex === undefined || props.colIndex === null) {
		console.error('AirSheetFilter - onClear: invalid colIndex', props.colIndex)
		ElMessage.error('列索引无效，无法执行清空操作')
		return
	}

	// 清空当前列的选中项
	checked.value = []

	// 保留其他列的现有筛选条件，移除当前列的筛选条件
	const otherColumnsFilters = (props.currentFiltered || []).filter(
		(filter) => filter && typeof filter.c === 'number' && filter.c !== props.colIndex
	)

	console.log('AirSheetFilter - 清空当前列筛选:', {
		列索引: props.colIndex,
		清空前选中项: checked.value,
		其他列筛选条件: otherColumnsFilters,
		最终筛选条件: otherColumnsFilters,
	})

	// 发送更新后的筛选条件（不包含当前列）
	emits('confirm', otherColumnsFilters)
	onClose()
}

const onConfirm = () => {
	// 确保colIndex是有效的
	if (props.colIndex === -1 || props.colIndex === undefined || props.colIndex === null) {
		console.error('AirSheetFilter - onConfirm: invalid colIndex', props.colIndex)
		ElMessage.error('列索引无效，无法执行筛选操作')
		return
	}

	// 过滤掉无效的选中项
	const validChecked = checked.value.filter(
		(item) => item !== undefined && item !== null && item !== ''
	)

	// 构建当前列的筛选条件
	const currentColumnFilters = validChecked.map((item) => ({
		v: item,
		c: props.colIndex,
	}))

	// 保留其他列的现有筛选条件，移除当前列的旧条件
	const otherColumnsFilters = (props.currentFiltered || []).filter(
		(filter) => filter && typeof filter.c === 'number' && filter.c !== props.colIndex
	)

	// 合并当前列的新筛选条件与其他列的现有筛选条件
	const mergedFilters = [...otherColumnsFilters, ...currentColumnFilters]

	console.log('AirSheetFilter - 筛选确认:', {
		列索引: props.colIndex,
		原始选中项: checked.value,
		有效选中项: validChecked,
		当前列筛选条件: currentColumnFilters,
		其他列筛选条件: otherColumnsFilters,
		合并后筛选条件: mergedFilters,
	})

	emits('confirm', mergedFilters)
	onClose()
}

const onClickOnly = (value) => {
	// 确保colIndex是有效的
	if (props.colIndex === -1 || props.colIndex === undefined || props.colIndex === null) {
		console.error('AirSheetFilter - onClickOnly: invalid colIndex', props.colIndex)
		ElMessage.error('列索引无效，无法执行筛选操作')
		return
	}

	// 构建当前列的筛选条件（仅筛选此项）
	const currentColumnFilter = [{v: value, c: props.colIndex}]

	// 保留其他列的现有筛选条件，移除当前列的旧条件
	const otherColumnsFilters = (props.currentFiltered || []).filter(
		(filter) => filter && typeof filter.c === 'number' && filter.c !== props.colIndex
	)

	// 合并当前列的新筛选条件与其他列的现有筛选条件
	const mergedFilters = [...otherColumnsFilters, ...currentColumnFilter]

	console.log('AirSheetFilter - 仅筛选此项:', {
		列索引: props.colIndex,
		筛选值: value,
		当前列筛选条件: currentColumnFilter,
		其他列筛选条件: otherColumnsFilters,
		合并后筛选条件: mergedFilters,
	})

	emits('confirm', mergedFilters)
	onClose()
}

watch(
	() => props.modelValue,
	(newVal) => {
		if (!newVal) return
		const rect = newVal.getBoundingClientRect()
		const containerRect = newVal.closest('.air-sheet-component').getBoundingClientRect()
		let top = 5
		let left = rect.left - (containerRect.right - containerRect.width)

		if (rect.left + 330 >= containerRect.left + containerRect.width) {
			left = containerRect.left + containerRect.width - 332
		}

		position.value = {
			top,
			left,
		}
		mask.value = true

		// 面板打开后恢复滚动位置
		nextTick(() => {
			restoreScrollPosition()
		})
	}
)

watch(
	() => props.filterCol,
	(newVal) => {
		// 调试信息：筛选数据更新
		if (newVal?.length > 0) {
			// console.log('AirSheetFilter - 筛选数据更新:', {
			// 	列索引: props.colIndex,
			// 	数据数量: newVal.length,
			// 	数据样本: newVal.slice(0, 3),
			// })
		}
		filterList.value = newVal
	}
)

// 监听当前筛选状态的变化，同步更新选中项
watch(
	[() => props.colIndex, () => props.currentFiltered],
	([newColIndex, newCurrentFiltered]) => {
		// console.log('AirSheetFilter - 列索引同步:', {
		// 	列索引: newColIndex,
		// 	当前筛选条件数量: newCurrentFiltered?.length || 0,
		// 	筛选数据数量: props.filterCol.length,
		// })

		// 确保colIndex是有效的数字
		if (newColIndex === -1 || newColIndex === undefined || newColIndex === null) {
			// console.log('AirSheetFilter - 列索引无效，清空选中项')
			checked.value = []
			return
		}

		// 根据当前列的筛选条件更新选中项
		const currentColFilters = (newCurrentFiltered || []).filter((filter) => {
			// 确保filter对象有效且列索引匹配
			return filter && typeof filter.c === 'number' && filter.c === newColIndex
		})

		// console.log('AirSheetFilter - 当前列筛选条件:', {
		// 	列索引: newColIndex,
		// 	匹配的筛选条件: currentColFilters,
		// })

		// 只更新当前列的选中项
		if (currentColFilters.length > 0) {
			checked.value = currentColFilters
				.map((filter) => filter.v)
				.filter((v) => v !== undefined && v !== null)
		} else {
			// 如果当前列没有筛选条件，清空当前列的选中项
			checked.value = []
		}

		// console.log('AirSheetFilter - 选中项已更新:', checked.value)
	},
	{immediate: true, deep: true}
)

// 监听搜索值变化
watch(searchValue, handleSearchChange)

// 监听筛选数据变化，重新初始化虚拟滚动
watch(
	filterList,
	() => {
		// console.log('虚拟滚动 - 筛选数据变化，重新初始化')
		clearVisibleItemsCache()
		initializeVisibleRange()
	},
	{immediate: true}
)

watch(
	() => props.show,
	(newVal) => {
		if (!newVal) {
			onClose()
		}
	}
)

// 组件挂载后初始化
onMounted(() => {
	// console.log('虚拟滚动 - 组件挂载，初始化虚拟滚动')
	initializeVisibleRange()
})
</script>
<template>
	<div v-show="mask" class="air-sheet-filter" @click="onClose">
		<div
			class="box shadow-12"
			:style="{left: position.left + 'px', top: position.top + 'px'}"
			@click.stop
		>
			<div class="search">
				<el-input v-model="searchValue" placeholder="搜包含任一关键字" />
			</div>
			<div class="scroll" ref="scrollContainer" @scroll="handleScroll">
				<div v-if="filterList.length" class="virtual-scroll-container">
					<!-- 上方占位空间 -->
					<div class="virtual-spacer" :style="{height: offsetTop + 'px'}"></div>

					<!-- 可视区域内的项目 -->
					<el-checkbox-group v-model="checked">
						<div
							v-for="item in visibleItems"
							:key="item.r"
							class="item virtual-item"
							:style="{height: itemHeight + 'px'}"
						>
							<el-checkbox :label="item.v" :value="item.v" />
							<span class="flx">{{ item.v }}</span>
							<el-button
								size="small"
								type="primary"
								class="only"
								@click="onClickOnly(item.v)"
							>
								仅筛选此项
							</el-button>
						</div>
					</el-checkbox-group>

					<!-- 下方占位空间 -->
					<div class="virtual-spacer" :style="{height: offsetBottom + 'px'}"></div>
				</div>
				<div v-else class="pd-20">
					<el-empty description="没有数据" :image-size="130"></el-empty>
				</div>
			</div>

			<div class="btns">
				<span @click="onClear" class="clear-filter">
					<Icons name="ClearFilter"></Icons>
					清空筛选条件
				</span>
				<span class="flx"></span>
				<el-button @click="onClose">取消</el-button>
				<el-button type="primary" @click="onConfirm">确定</el-button>
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-filter {
	height: calc(100% - 131px);
	left: 0;
	position: absolute;
	top: 131px;
	width: 100%;
	z-index: 10;

	.box {
		background-color: rgba(var(--z-theme-rgb), 0.5);
		backdrop-filter: blur(8px);
		border-radius: 5px;

		position: absolute;
		// transform: translateX(-67.5%);
		transition: box-shadow 0.2s ease;
		max-height: 450px;
		width: 300px;

		&:hover {
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		}
	}

	.search {
		margin: 10px 10px 0 10px;
	}

	.scroll {
		border-radius: 5px;
		border: 1px solid var(--z-line);
		margin: 10px;
		max-height: 300px;
		overflow: hidden;
		overflow-y: scroll;
		padding: 0 0 0 10px;
	}

	.virtual-scroll-container {
		position: relative;
	}

	.virtual-spacer {
		width: 100%;
	}

	.item {
		align-items: center;
		display: flex;

		.only {
			display: none;
		}

		&:hover {
			.only {
				display: block;
			}
			:deep(.el-checkbox__label) {
				font-weight: 500;
				width: 150px;
			}
		}

		:deep(.el-checkbox__label) {
			overflow: hidden;
			text-overflow: ellipsis;
			width: 240px;
		}
	}

	.virtual-item {
		box-sizing: border-box;
		display: flex;
		align-items: center;

		:deep(.el-checkbox) {
			align-items: center;
			display: flex;
		}
		:deep(.el-checkbox__label) {
			line-height: 1.5;
		}
	}

	.btns {
		border-top: 1px solid var(--z-line);
		padding: 8px;
		display: flex;
		justify-content: flex-end;

		.clear-filter {
			align-items: center;
			cursor: pointer;
			color: var(--z-font-color);
			display: flex;
		}
	}
}
</style>
