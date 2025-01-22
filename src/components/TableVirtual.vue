<script setup>
import {
	ref,
	computed,
	onMounted,
	onUnmounted,
	watch,
	nextTick,
	onActivated,
	reactive,
	onDeactivated,
} from 'vue'
import {useThrottleFn} from '@vueuse/core'
import {useMergedCells} from '@/hooks/useMergedCells'
import {useSelectionRange} from '@/hooks/useSelectionRange'

// 核心配置参数
/**
 * modelValue: {
 * 	celldata: []
 * }
 *
 */
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 100},
	// 总列数
	colCount: {type: Number, default: 26},
	// 单元格高度
	rowHeight: {type: Number, default: 25},
	// 单元格宽度
	colWidth: {type: Number, default: 100},
	// 缓冲区大小(额外渲染的行数)
	buffer: {type: Number, default: 5},

	// 序号
	enableNumber: {type: Boolean, default: true},
	// 序号宽度
	numberWidth: {type: Number, default: 35},

	// 操作列
	enableFn: {type: Boolean, default: true},
	// 操作列宽度
	fnWidth: {type: Number, default: 120},
})

// 配置参数
const celldata = reactive(props.modelValue.celldata)
const fns = reactive(props.modelValue.fns)

// 数据保存
const data = reactive({
	config: {},
	celldata: [],
})

// 容器
const id = `table-virtual-${Math.random().toString(16).slice(2)}`
const initialized = ref(false)
const containerRef = ref()

// hooks 模块
const useMergedCellsHook = useMergedCells()
const useSelectionRangeHook = reactive(
	useSelectionRange(id, {
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
		useMergedCellsHook,
	})
)

// 滚动位置
const scrollTop = ref(0)
const scrollLeft = ref(0)

// 保存滚动位置
const savedScrollPosition = ref({top: 0, left: 0})

// 计算可视区域大小
const viewportHeight = ref(0)
const viewportWidth = ref(0)

// 计算总内容大小
const totalHeight = computed(() => props.rowCount * props.rowHeight)
const totalWidth = computed(() => props.colCount * props.colWidth)

// 计算可见行列范围
const visibleRange = computed(() => {
	const mergedBuffer = getMergedBuffer()
	const bufferRows = Math.max(props.buffer, mergedBuffer.rows)
	const bufferCols = Math.max(props.buffer, mergedBuffer.cols)

	const startRow = Math.max(0, Math.floor(scrollTop.value / props.rowHeight) - bufferRows)
	const startCol = Math.max(0, Math.floor(scrollLeft.value / props.colWidth) - bufferCols)

	const endRow = Math.min(
		props.rowCount,
		Math.ceil((scrollTop.value + viewportHeight.value) / props.rowHeight) + bufferRows
	)

	const endCol = Math.min(
		props.colCount,
		Math.ceil((scrollLeft.value + viewportWidth.value) / props.colWidth) + bufferCols
	)

	return {startRow, endRow, startCol, endCol}
})

// 计算可见行
const visibleRows = computed(() => {
	const {startRow, endRow} = visibleRange.value

	return Array.from({length: endRow - startRow}, (_, index) => ({
		id: startRow + index,
		index: startRow + index,
	}))
})

// 计算每行可见单元格
const visibleCells = (row) => {
	const {startCol, endCol} = visibleRange.value

	return Array.from({length: endCol - startCol}, (_, index) => {
		const currentRow = row.index
		const currentCol = startCol + index

		// 检查当前单元格是否是合并单元格的从属单元格
		const mergedCell = useMergedCellsHook.findMergedCell(currentRow, currentCol)
		const isMergedStart =
			mergedCell && mergedCell.row === currentRow && mergedCell.col === currentCol
		const originalValue = celldata[currentRow]?.[currentCol] || null

		// 如果不是合并单元格，或者是合并单元格的起始位置，则显示值
		let value = null
		if (mergedCell) {
			if (isMergedStart) {
				value = originalValue
			}
		} else {
			value = originalValue
		}

		if (!data.celldata[currentRow]) {
			data.celldata[currentRow] = []
		}

		data.celldata[currentRow][currentCol] = value

		return {
			id: `${row.id}-${startCol + index}`,
			rowIndex: currentRow,
			colIndex: currentCol,
			value,
		}
	})
}

// 计算偏移量
const offsetTop = computed(() => {
	return visibleRange.value.startRow * props.rowHeight
})

const offsetLeft = computed(() => {
	return visibleRange.value.startCol * props.colWidth
})

// 计算序号列可见行（添加缓冲行避免空白）
const visibleNumberRows = computed(() => {
	// 确保起始行不会小于0
	const startRow = Math.max(0, Math.floor(scrollTop.value / props.rowHeight))
	const visibleRows = Math.ceil(viewportHeight.value / props.rowHeight)
	// 多渲染一行避免空白
	const endRow = Math.min(props.rowCount, startRow + visibleRows + 1)

	return Array.from({length: endRow - startRow}, (_, index) => ({
		id: startRow + index,
		index: startRow + index,
	}))
})

// 计算自定义列偏移量（与内容完全对齐）
const customOffsetTop = computed(() => {
	// 确保起始行不会小于0
	const startRow = Math.max(0, Math.floor(scrollTop.value / props.rowHeight))
	// 处理顶部边界情况
	if (scrollTop.value <= 0) {
		return 0
	}
	return -(scrollTop.value - startRow * props.rowHeight)
})

const getOffsetStyle = (cell) => {
	return useMergedCellsHook.getCellStyle(cell, {
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
		offsetTop: offsetTop.value,
		offsetLeft: offsetLeft.value,
	})
}

const getMergedBuffer = () => {
	const buffer = {rows: 0, cols: 0}
	for (const [key, value] of Object.entries(useMergedCellsHook.getMergedCells())) {
		buffer.rows = Math.max(buffer.rows, value.rowSpan)
		buffer.cols = Math.max(buffer.cols, value.colSpan)
	}
	return buffer
}

const isMergedCellStart = (cell) => {
	const mergedCells = useMergedCellsHook.getMergedCells()
	if (Object.keys(mergedCells).length === 0) {
		return false
	}
	const key = `${cell.rowIndex}-${cell.colIndex}`
	return mergedCells.hasOwnProperty(key)
}

// 滚动处理(使用节流优化)
const onScroll = useThrottleFn((e) => {
	const container = e.target
	scrollTop.value = container.scrollTop
	scrollLeft.value = container.scrollLeft
	// 保存滚动位置
	savedScrollPosition.value = {
		top: container.scrollTop,
		left: container.scrollLeft,
	}
	// 修正快速滚动序号列错位
	setTimeout(() => {
		if (container.scrollTop === 0) {
			scrollTop.value = 0
			savedScrollPosition.value.top = 0
		}

		const maxScrollTop = container.scrollHeight - container.clientHeight
		if (Math.abs(container.scrollTop - maxScrollTop) < 1) {
			scrollTop.value = maxScrollTop
			savedScrollPosition.value.top = maxScrollTop
		}
	}, 32)
}, 16) // 约60fps

// 恢复滚动位置
const restoreScrollPosition = () => {
	if (!containerRef.value) return
	const {top, left} = savedScrollPosition.value
	containerRef.value.scrollTop = top
	containerRef.value.scrollLeft = left
}

// 监听容器大小变化
const updateViewportSize = () => {
	if (!containerRef.value) {
		return
	}

	// 确保获取到真实的容器尺寸
	const rect = containerRef.value.getBoundingClientRect()
	viewportHeight.value = rect.height
	viewportWidth.value = rect.width
}

// 数据缓存处理
const cellCache = new Map()

// 清理不可见区域的缓存
const cleanCache = () => {
	const {startRow, endRow, startCol, endCol} = visibleRange.value
	const buffer = props.buffer * 2

	for (const key of cellCache.keys()) {
		const [row, col] = key.split('-').map(Number)
		if (
			row < startRow - buffer ||
			row > endRow + buffer ||
			col < startCol - buffer ||
			col > endCol + buffer
		) {
			cellCache.delete(key)
		}
	}
}

// 获取单元格数据(支持异步)
const getCellData = async (rowIndex, colIndex) => {
	const key = `${rowIndex}-${colIndex}`
	if (cellCache.has(key)) {
		return cellCache.get(key)
	}

	// 模拟异步获取数据
	const data = await fetchCellData(rowIndex, colIndex)
	cellCache.set(key, data)
	return data
}

const init = () => {
	updateViewportSize()
	window.addEventListener('resize', updateViewportSize)
	initialized.value = true
	nextTick(() => {
		restoreScrollPosition()
	})
}

const distroy = () => {
	window.removeEventListener('resize', updateViewportSize)
}

// 初始化
onMounted(() => {
	if (!initialized.value) {
		init()
	}
})

onActivated(() => {
	if (initialized.value) {
		return
	}
	init()
})

onDeactivated(() => {
	initialized.value = false
	if (containerRef.value) {
		savedScrollPosition.value = {
			top: containerRef.value.scrollTop,
			left: containerRef.value.scrollLeft,
		}
	}
	window.removeEventListener('resize', updateViewportSize)
})

onUnmounted(() => distroy())

// 定期清理缓存
watch(visibleRange, cleanCache)

defineExpose({
	mergeCells: useMergedCellsHook.addMergedCell,
})
</script>
<template>
	<div class="table-virtual-component">
		<!-- 序号 -->
		<div class="custom-column" v-if="enableNumber">
			<div
				class="virtual-phantom"
				:style="{width: numberWidth + 'px', height: totalHeight + 'px'}"
			></div>
			<div
				class="custom-column-content"
				:style="{
					transform: `translateY(${customOffsetTop}px)`,

					width: `${numberWidth}px`,
				}"
			>
				<template v-for="row of visibleNumberRows" :key="row.id">
					<div class="number" :style="{height: `${rowHeight}px`}">
						{{ row.id + 1 }}
					</div>
				</template>
			</div>
		</div>

		<div :id="id" ref="containerRef" class="virtual-sheet" @scroll="onScroll">
			<!-- 虚拟滚动占位 -->
			<div
				class="virtual-phantom"
				:style="{height: totalHeight + 'px', width: totalWidth + 'px'}"
			></div>

			<div
				class="virtual-content"
				:style="{
					transform: `translate(${offsetLeft}px, ${offsetTop}px)`,
				}"
			>
				<!-- 只渲染可视区域的单元格 -->
				<template v-for="row of visibleRows" :key="row.id">
					<div class="row">
						<template v-for="cell of visibleCells(row)" :key="cell.id">
							<div
								v-if="isMergedCellStart(cell)"
								class="cell merged-cell-placeholder"
								:style="{
									width: `${colWidth}px`,
									height: `${rowHeight}px`,
								}"
							></div>
							<div class="cell" :style="getOffsetStyle(cell)">
								{{ cell.value }}
							</div>
						</template>
					</div>
				</template>
			</div>

			<!-- 添加选区框 -->

			<div
				v-if="useSelectionRangeHook.selecting || useSelectionRangeHook.ranged"
				class="selection-box"
				:class="useSelectionRangeHook.rangeClass"
				:style="useSelectionRangeHook.rangeStyle"
			>
				<div
					v-if="useSelectionRangeHook.ranged"
					class="selection-handle"
					@mousedown.stop="useSelectionRangeHook.drag"
				></div>
			</div>
			<div
				v-if="useSelectionRangeHook.selecting || useSelectionRangeHook.ranged"
				class="selection-bg-box"
				:class="useSelectionRangeHook.rangeClass"
				:style="useSelectionRangeHook.rangeStyle"
			></div>
		</div>

		<!-- 操作 -->
		<div class="custom-column" v-if="enableFn">
			<div
				class="virtual-phantom"
				:style="{width: fnWidth + 'px', height: totalHeight + 'px'}"
			></div>
			<div
				class="custom-column-content"
				:style="{
					transform: `translateY(${customOffsetTop}px)`,

					width: `${fnWidth}px`,
				}"
			>
				<template v-for="row of visibleRows" :key="row.id">
					<div class="fns">
						<el-link
							v-for="fn in fns"
							:type="fn.type"
							size="small"
							@click="() => fn.click(row, data.celldata[row.index])"
						>
							{{ fn.label }}
						</el-link>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.table-virtual-component {
	display: flex;
	height: 100%;
	overflow: hidden;
	position: relative;
	width: 100%;
}

.custom-column {
	border: 1px solid var(--z-line);
	border-right: none;
	background-color: var(--z-bg-secondary);
	color: rgba(var(--z-font-color-rgb), 1);

	.number {
		align-items: center;
		border-bottom: 1px solid var(--z-line);
		display: flex;
		justify-content: center;
	}

	.custom-column-content {
	}
}

.main-content {
	flex: 1;
	position: relative;
	overflow: visible;
	min-width: 0;
}

.virtual-sheet {
	border: 1px solid var(--z-line);
	background-color: var(--z-theme);
	display: flex;
	position: relative;
	overflow: auto;
	height: 100%;
	width: 100%;
}

.virtual-phantom {
	position: absolute;
	left: 0;
	top: 0;
	z-index: -1;
}

.virtual-content {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 2;
}

.row {
	display: flex;
	position: relative;
}

.cell {
	align-items: center;
	border-right: 1px solid var(--z-line);
	border-bottom: 1px solid var(--z-line);
	box-sizing: border-box;
	color: var(--z-font-color);
	display: flex;
	padding: 0 4px;

	overflow: hidden;
	user-select: none;
}

.merged-cell-placeholder {
	box-sizing: border-box;
	border: 1px solid var(--z-border);
	background: transparent;
	pointer-events: none;
	position: relative;
	visibility: hidden;
}

.selection-box,
.selection-bg-box {
	position: absolute;
	pointer-events: none;
	z-index: 3;
	transition: background-color 0.1s;

	&.selection-single {
		border: 2px solid var(--z-main);
	}

	&.selection-range {
		border: 2px solid var(--z-main);
	}

	.selection-handle {
		position: absolute;
		right: -4px;
		bottom: -4px;
		width: 8px;
		height: 8px;
		background-color: var(--z-main);
		border: 1px solid #fff;
		cursor: se-resize;
		pointer-events: auto;
	}
}

.selection-bg-box {
	border: none !important;
	background-color: rgba(var(--z-bg-secondary-rgb), 0.7);
	z-index: 1;
}
</style>
