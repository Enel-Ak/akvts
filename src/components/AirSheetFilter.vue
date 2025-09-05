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

// 计算属性：过滤后的数据列表
const filteredList = computed(() => {
	if (!searchValue.value) {
		return filterList.value.filter((item) => item.v)
	}
	return filterList.value.filter((item) => item.v && item.v.includes(searchValue.value))
})

// 计算属性：可视区域内的数据
const visibleItems = computed(() => {
	const start = Math.max(0, startIndex.value - bufferCount.value)
	const end = Math.min(filteredList.value.length, endIndex.value + bufferCount.value)
	return filteredList.value.slice(start, end).map((item, index) => ({
		...item,
		virtualIndex: start + index, // 虚拟索引，用于定位
	}))
})

// 计算属性：上方占位空间高度
const offsetTop = computed(() => {
	const start = Math.max(0, startIndex.value - bufferCount.value)
	return start * itemHeight.value
})

// 计算属性：下方占位空间高度
const offsetBottom = computed(() => {
	const end = Math.min(filteredList.value.length, endIndex.value + bufferCount.value)
	return (filteredList.value.length - end) * itemHeight.value
})

// 计算可视区域索引的函数
const updateVisibleRange = () => {
	const scrollPosition = scrollTop.value
	const containerH = containerHeight.value
	const itemH = itemHeight.value

	// 计算可视区域的起始和结束索引
	const start = Math.floor(scrollPosition / itemH)
	const visibleItemCount = Math.ceil(containerH / itemH)
	const end = start + visibleItemCount

	// 更新可视区域索引
	startIndex.value = Math.max(0, start)
	endIndex.value = Math.min(filteredList.value.length, end)

	console.log('虚拟滚动 - 可视区域更新:', {
		scrollPosition,
		startIndex: startIndex.value,
		endIndex: endIndex.value,
		totalItems: filteredList.value.length,
		visibleItems: endIndex.value - startIndex.value,
	})
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

	console.log('虚拟滚动 - 初始化:', {
		containerHeight: containerH,
		itemHeight: itemH,
		initialVisibleCount,
		endIndex: endIndex.value,
	})
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

// 节流函数
const throttle = (func, limit) => {
	let inThrottle
	return function executedFunction(...args) {
		if (!inThrottle) {
			func.apply(this, args)
			inThrottle = true
			setTimeout(() => (inThrottle = false), limit)
		}
	}
}

// 优化的滚动事件处理
const handleScroll = throttle((event) => {
	const target = event.target
	scrollTop.value = target.scrollTop

	// 使用 requestAnimationFrame 优化性能
	requestAnimationFrame(() => {
		updateVisibleRange()
	})
}, 16) // 约60fps

// 搜索变化时的处理（使用防抖）
const handleSearchChange = debounce(() => {
	console.log('虚拟滚动 - 搜索变化，重新初始化')
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
		const container = newVal.closest('.air-sheet-component').getBoundingClientRect()
		let top = rect.top - 190
		let left = rect.left + 2

		if (rect.left + 330 >= container.left + container.width) {
			left = container.left + container.width - 332
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
			console.log('AirSheetFilter - 筛选数据更新:', {
				列索引: props.colIndex,
				数据数量: newVal.length,
				数据样本: newVal.slice(0, 3),
			})
		}
		filterList.value = newVal
	}
)

// 监听当前筛选状态的变化，同步更新选中项
watch(
	[() => props.colIndex, () => props.currentFiltered],
	([newColIndex, newCurrentFiltered]) => {
		console.log('AirSheetFilter - 列索引同步:', {
			列索引: newColIndex,
			当前筛选条件数量: newCurrentFiltered?.length || 0,
			筛选数据数量: props.filterCol.length,
		})

		// 确保colIndex是有效的数字
		if (newColIndex === -1 || newColIndex === undefined || newColIndex === null) {
			console.log('AirSheetFilter - 列索引无效，清空选中项')
			checked.value = []
			return
		}

		// 根据当前列的筛选条件更新选中项
		const currentColFilters = (newCurrentFiltered || []).filter((filter) => {
			// 确保filter对象有效且列索引匹配
			return filter && typeof filter.c === 'number' && filter.c === newColIndex
		})

		console.log('AirSheetFilter - 当前列筛选条件:', {
			列索引: newColIndex,
			匹配的筛选条件: currentColFilters,
		})

		// 只更新当前列的选中项
		if (currentColFilters.length > 0) {
			checked.value = currentColFilters
				.map((filter) => filter.v)
				.filter((v) => v !== undefined && v !== null)
		} else {
			// 如果当前列没有筛选条件，清空当前列的选中项
			checked.value = []
		}

		console.log('AirSheetFilter - 选中项已更新:', checked.value)
	},
	{immediate: true, deep: true}
)

// 监听搜索值变化
watch(searchValue, handleSearchChange)

// 监听筛选数据变化，重新初始化虚拟滚动
watch(
	filterList,
	() => {
		console.log('虚拟滚动 - 筛选数据变化，重新初始化')
		initializeVisibleRange()
	},
	{immediate: true}
)

// 组件挂载后初始化
onMounted(() => {
	console.log('虚拟滚动 - 组件挂载，初始化虚拟滚动')
	initializeVisibleRange()
})
</script>
<template>
	<div v-show="mask" class="filter-layout" @click="onClose">
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
					<LoadingTransition text="数据加载中" />
				</div>
			</div>

			<div class="btns">
				<el-button @click="onClose">取消</el-button>
				<el-button type="primary" @click="onConfirm">确定</el-button>
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.filter-layout {
	height: calc(100% - 105px);
	left: 0;
	position: absolute;
	top: 105px;
	width: 100%;
	z-index: 10;

	.box {
		background-color: var(--z-theme);
		border-radius: 5px;

		position: absolute;
		// transform: translateX(-67.5%);
		max-height: 450px;
		width: 300px;
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
		}
	}

	.virtual-item {
		box-sizing: border-box;
		display: flex;
		align-items: center;
	}

	.btns {
		border-top: 1px solid var(--z-line);
		padding: 8px;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
