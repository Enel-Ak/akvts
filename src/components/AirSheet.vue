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
import {useMergedCells} from '@/hooks/sheet/useMergedCells'
import {useSelectionRange} from '@/hooks/sheet/useSelectionRange'
import {useResize} from '@/hooks/sheet/useResize'
import {useSheetRender} from '@/hooks/sheet/useSheetRender.js'
import {startTimer, endTimer} from '@/hooks/useTools'

// 核心配置参数
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 671087}, // 最大 671087
	// 总列数
	colCount: {type: Number, default: 240},
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

// 保存数据
const sheet = reactive({
	config: {
		rowCount: props.rowCount > 671087 ? 671087 : props.rowCount,
		colCount: props.colCount,
	},
	celldata: props.modelValue.celldata,
	fns: props.modelValue.fns,
})

// 使用 RAF 优化渲染
let rafId = null

// 容器
const id = `air-sheet-${Math.random().toString(16).slice(2)}`
const initialized = ref(false)
const containerRef = ref()

// 滚动位置
const scrollTop = ref(0)
const scrollLeft = ref(0)

// 计算可视区域大小
const viewportHeight = ref(0)
const viewportWidth = ref(0)

// 保存滚动位置
const savedScrollPosition = ref({top: 0, left: 0})

// hooks 模块
const useSheetRenderHook = useSheetRender(sheet)
const useResizeHook = useResize({
	rowHeight: props.rowHeight,
	colWidth: props.colWidth,
})
const useMergedCellsHook = useMergedCells({
	useResizeHook,
})
const useSelectionRangeHook = reactive(
	useSelectionRange(id, {
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
		useMergedCellsHook,
		useResizeHook,
	})
)

// 计算总高度
const totalHeight = computed(() => {
	let height = 0
	for (let i = 0; i < props.rowCount; i++) {
		height += useResizeHook.getRowHeight(i)
	}
	return height
})

// 计算总宽度
const totalWidth = computed(() => {
	let width = 0
	for (let i = 0; i < props.colCount; i++) {
		width += useResizeHook.getColWidth(i)
	}
	return width
})

// 可见范围的响应式引用
const visibleRangeRef = ref({
	startRow: 0,
	endRow: 0,
	startCol: 0,
	endCol: 0,
	buffer: {
		startRow: 0,
		endRow: 0,
		startCol: 0,
		endCol: 0,
	},
})

// 更新可见范围
const updateVisibleRange = async () => {
	try {
		const renderData = {
			scrollTop: scrollTop.value,
			scrollLeft: scrollLeft.value,
			viewportHeight: viewportHeight.value,
			viewportWidth: viewportWidth.value,
			rowCount: props.rowCount,
			colCount: props.colCount,
			buffer: props.buffer,
			defaultRowHeight: props.rowHeight,
			defaultColWidth: props.colWidth,
			rowHeights: useResizeHook.rowHeights,
			colWidths: useResizeHook.colWidths,
			mergedCells: useMergedCellsHook.getMergedCells(),
		}

		const result = await useSheetRenderHook.getRenderResult(renderData)

		if (result) {
			visibleRangeRef.value = result
		}
	} catch (error) {
		console.error('计算可见范围失败:', error)
	}
}

// 监听滚动位置变化
watch([scrollTop, scrollLeft], () => updateVisibleRange(), {immediate: true})

// 监听视口大小变化
watch([viewportHeight, viewportWidth], () => updateVisibleRange())

// 生成可见行数据
const visibleRows = computed(() => {
	const rows = []
	const {startRow, endRow, buffer} = visibleRangeRef.value
	const start = Math.max(0, startRow)
	const end = Math.min(props.rowCount, endRow)

	for (let i = start; i <= end; i++) {
		rows.push({
			rowIndex: i,
			rowHeight: useResizeHook.getRowHeight(i),
		})
	}
	return rows
})

// 生成可见列数据
const visibleCells = (row) => {
	const cells = []
	const {startCol, endCol, buffer} = visibleRangeRef.value
	const start = Math.max(0, startCol)
	const end = Math.min(props.colCount - 1, endCol)

	for (let i = start; i <= end; i++) {
		// 检查当前单元格是否是合并单元格的从属单元格
		const mergedCell = useMergedCellsHook.findMergedCell(row.rowIndex, i)
		const isMergedStart = mergedCell && mergedCell.row === row.rowIndex && mergedCell.col === i
		const originalValue = sheet.celldata[row.rowIndex]?.[i] || null

		// 如果不是合并单元格，或者是合并单元格的起始位置，则显示值
		let value = null
		if (mergedCell) {
			if (isMergedStart) {
				value = originalValue
			}
		} else {
			value = originalValue
		}

		if (!sheet.celldata[row.rowIndex]) {
			sheet.celldata[row.rowIndex] = []
		}

		sheet.celldata[row.rowIndex][i] = value

		cells.push({
			rowIndex: row.rowIndex,
			colIndex: i,

			colWidth: useResizeHook.getColWidth(i),
			rowHeight: row.rowHeight,
			value: `R${row.rowIndex + 1}C${i + 1}`,
		})
	}
	return cells
}

// 计算偏移量
const offsetTop = ref(0)
const offsetLeft = ref(0)
const updateOffset = async (type, value) => {
	const result = await useResizeHook.getRenderResult({
		type,
		[value]: visibleRangeRef.value[value],
	})

	if (type === 'offsetTop') {
		offsetTop.value = result?.offset?.top || 0
	} else if (type === 'offsetLeft') {
		offsetLeft.value = result?.offset?.left || 0
	}
}
watch(
	() => visibleRangeRef.value.startRow,
	() => updateOffset('offsetTop', 'startRow')
)
watch(
	() => visibleRangeRef.value.startCol,
	() => updateOffset('offsetLeft', 'startCol')
)

const customOffsetLeft = () => {
	if (scrollLeft.value <= 0) {
		return 0
	}

	// 计算实际的偏移量
	let totalWidth = 0
	let currentCol = 0

	while (currentCol < visibleRange.value.startCol && totalWidth <= scrollLeft.value) {
		totalWidth += useResizeHook.getColWidth(currentCol)
		currentCol++
	}

	// 返回精确的偏移量
	return -(scrollLeft.value - totalWidth)
}

// 生成列标题（A-Z, AA-AZ等）, 字母和序号缓存
const columnTitleCache = new Map()
const rowNumberCache = new Map()

// 序号和标题标题生成
const getColumnTitle = (index) => {
	if (columnTitleCache.has(index)) {
		return columnTitleCache.get(index)
	}

	let title = ''
	let num = index
	while (num >= 0) {
		title = String.fromCharCode(65 + (num % 26)) + title
		num = Math.floor(num / 26) - 1
	}
	columnTitleCache.set(index, title)
	return title
}

// 计算当前可见的列标题
const visibleColumnTitles = computed(() => {
	const titles = []
	const {startCol, endCol} = visibleRange.value
	const start = Math.max(0, startCol - props.buffer)
	const end = Math.min(props.colCount - 1, endCol + props.buffer)

	let currentLeft = 0

	for (let col = start; col <= end; col++) {
		const width = useResizeHook.getColWidth(col)
		titles.push({
			id: col,
			index: col,
			title: getColumnTitle(col),
			width,
			left: currentLeft,
		})
		currentLeft += width
	}
	return titles
})

// 计算自定义列偏移量（与内容完全对齐）
const getOffsetStyle = (cell) => {
	return useMergedCellsHook.getCellStyle(cell, {
		offsetLeft: offsetLeft.value,
		offsetTop: offsetTop.value,
	})
}

const isMergedCellStart = (cell) => {
	const mergedCells = useMergedCellsHook.getMergedCells()
	if (Object.keys(mergedCells).length === 0) {
		return false
	}
	const key = `${cell.rowIndex}-${cell.colIndex}`

	return mergedCells.hasOwnProperty(key)
}

// 优化的滚动处理
let scrollTimer = null
let isAutoScrolling = false
const onScroll = useThrottleFn((e) => {
	// 如果是自动滚动，不处理
	if (isAutoScrolling) {
		return
	}

	clearTimeout(scrollTimer)
	const container = e.target
	const newScrollTop = container.scrollTop
	const newScrollLeft = container.scrollLeft

	if (newScrollTop !== scrollTop.value || newScrollLeft !== scrollLeft.value) {
		scrollTop.value = newScrollTop
		scrollLeft.value = newScrollLeft

		// 修正最后一次位置并对齐到行
		scrollTimer = setTimeout(() => {
			const nt = containerRef.value.scrollTop
			const nl = containerRef.value.scrollLeft

			// 计算最近的行位置
			let currentPos = 0
			let targetRow = 0

			// 找到当前滚动位置所在的行
			while (currentPos <= nt && targetRow < props.rowCount) {
				const rowHeight = useResizeHook.getRowHeight(targetRow)
				if (nt < currentPos + rowHeight) {
					// 始终对齐到当前行
					break
				}
				currentPos += rowHeight
				targetRow++
			}

			// 计算滚动距离
			const distance = Math.abs(currentPos - nt)
			// 根据距离动态计算动画时间，距离越远动画时间越长
			const duration = Math.min(800, Math.max(400, distance * 2))

			// 标记开始自动滚动
			isAutoScrolling = true

			// 平滑滚动到目标位置
			containerRef.value.scrollTo({
				top: currentPos,
				left: nl,
				behavior: 'smooth',
			})

			// 动画结束后更新状态
			setTimeout(() => {
				scrollTop.value = currentPos
				scrollLeft.value = nl
				savedScrollPosition.value = {top: currentPos, left: nl}
				isAutoScrolling = false
			}, duration)
		}, 150) // 增加延迟时间，确保滚动完全停止
	}
}, 16)

// 恢复滚动位置
const restoreScrollPosition = () => {
	if (!containerRef.value) return

	const container = containerRef.value
	const {top, left} = savedScrollPosition.value

	if (top !== undefined && left !== undefined) {
		container.scrollTop = top
		container.scrollLeft = left
		scrollTop.value = top
		scrollLeft.value = left
	}
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

// 优化的缓存清理
const init = () => {
	updateViewportSize()
	window.addEventListener('resize', updateViewportSize)
	initialized.value = true
	nextTick(() => {
		restoreScrollPosition()
	})
}

const destroy = () => {
	if (useSelectionRangeHook) {
		useSelectionRangeHook.destroy()
	}
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

onUnmounted(() => destroy())

defineExpose({
	mergeCells: useMergedCellsHook.addMergedCell,
})
</script>
<template>
	<div class="air-sheet-component">
		<!-- 工具栏 -->
		<div class="toolbar">工具栏</div>

		<!-- 字母 -->
		<!-- <div class="alphabet">
			<div class="alphabet-placeholder" :style="{width: numberWidth + 1 + 'px'}"></div>
			<div class="alphabet-content">
				<div class="virtual-phantom" :style="{width: totalWidth + 'px'}"></div>
				<div class="cells" :style="{transform: `translateX(${customOffsetLeft()}px)`}">
					<span
						v-for="col of visibleColumnTitles"
						:key="col.id"
						:style="{width: col.width + 'px'}"
					>
						{{ col.title }}
						<div
							class="resize-handle"
							:class="{resizing: useResizeHook.resizingCol?.index === col.index}"
							@mousedown.stop="useResizeHook.startResize(col, $event, 'horizontal')"
						></div>
					</span>
				</div>
			</div>
		</div> -->

		<!-- Sheet -->
		<div class="sheet">
			<!-- 序号 -->
			<div class="custom-column" v-if="enableNumber">
				<div
					class="virtual-phantom"
					:style="{width: numberWidth + 'px', height: totalHeight + 'px'}"
				></div>
				<div class="custom-column-content" :style="{width: `${numberWidth}px`}">
					<template v-for="row of visibleRows" :key="row.id">
						<div class="number" :style="{height: `${row.rowHeight}px`}">
							<span>{{ row.rowIndex + 1 }}</span>
							<div
								class="resize-handle"
								:class="{
									resizing: useResizeHook.resizingRow?.index === row.rowIndex,
								}"
								@mousedown.stop="useResizeHook.startResize(row, $event, 'vertical')"
							></div>
						</div>
					</template>
				</div>
			</div>

			<!-- 主体 -->
			<div ref="containerRef" :id="id" class="virtual-sheet" @scroll="onScroll">
				<!-- 虚拟滚动占位 -->
				<div
					class="virtual-phantom"
					:style="{height: totalHeight + 'px', width: totalWidth + 'px'}"
				></div>

				<!-- 单元格 -->
				<div
					class="virtual-content"
					:style="{
						transform: `translate(${offsetLeft}px, ${offsetTop}px)`,
					}"
				>
					<!-- 只渲染可视区域的单元格 -->
					<template v-for="row of visibleRows" :key="row.id">
						<div class="row" :style="{height: `${row.height}px`}">
							<template v-for="cell of visibleCells(row)" :key="cell.id">
								<div
									v-if="isMergedCellStart(cell)"
									class="cell merged-cell-placeholder"
									:style="{
										height: `${cell.rowHeight}px`,
										width: `${cell.colWidth}px`,
									}"
								>
									<div
										class="cell"
										:class="{
											merged: isMergedCellStart(cell),
										}"
										:style="getOffsetStyle(cell)"
									>
										{{ cell.value }}
									</div>
								</div>
								<div
									v-else
									class="cell"
									:class="{
										merged: isMergedCellStart(cell),
									}"
									:style="getOffsetStyle(cell)"
								>
									{{ cell.value }}
								</div>
							</template>
						</div>
					</template>
				</div>

				<!-- 选区框、选区背景 -->
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
			<!-- <div class="custom-column" v-if="enableFn && fns.length">
				<div
					class="virtual-phantom"
					:style="{width: fnWidth + 'px', height: totalHeight + 'px'}"
				></div>
				<div
					class="custom-column-content"
					:style="{
						transform: `translateY(${customOffsetTop()}px)`,
						width: `${fnWidth}px`,
					}"
				>
					<template v-for="row of visibleRows" :key="row.id">
						<div class="fns" :style="{height: `${rowHeight}px`}">
							<el-link
								v-for="fn in fns"
								:type="fn.type"
								size="small"
								@click="() => fn.click(row, sheet.celldata[row.rowIndex])"
							>
								{{ fn.label }}
							</el-link>
						</div>
					</template>
				</div>
			</div> -->
		</div>

		<!-- 状态栏 -->
		<div class="statusbar">
			<span>总行数: {{ sheet.config.rowCount }}</span>
			<span>总列数: {{ sheet.config.colCount }}</span>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-component {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
	position: relative;
	width: 100%;
}

.toolbar {
}

.alphabet {
	border: 1px solid var(--z-line);
	border-bottom: 0;
	background-color: var(--z-bg-secondary);
	display: flex;
	height: 20px;
	line-height: 18px;
	overflow: hidden;
	position: relative;
	user-select: none;

	.alphabet-placeholder {
		align-items: center;
		background-color: var(--z-bg-secondary);
		border-right: 1px solid var(--z-line);
		display: flex;
		flex: none;
		justify-content: start;
		position: relative;
		z-index: 2;
	}

	.alphabet-content {
		position: relative;
		z-index: 1;
	}

	.cells {
		display: flex;
		position: absolute;
		top: 0;
		left: 0;
		span {
			border-right: 1px solid var(--z-line);
			flex: none;
			text-align: center;
			position: relative;
		}
		.resize-handle {
			bottom: 0;
			cursor: col-resize;
			right: -3px;
			width: 6px;
			height: 100%;
		}
	}
}

.statusbar {
	border: 1px solid var(--z-line);
	border-top: none;
	background-color: var(--z-bg-secondary);
	display: flex;
	padding: 5px;
	> span {
		font-size: 12px;
		padding-right: 10px;
	}
}

.sheet {
	display: flex;
	height: 100%;
	overflow: hidden;
	position: relative;
	width: 100%;

	.custom-column {
		border: 1px solid var(--z-line);
		border-right: none;
		background-color: var(--z-bg-secondary);
		color: rgba(var(--z-font-color-rgb), 1);
		user-select: none;

		.number {
			align-items: center;
			border-bottom: 1px solid var(--z-line);
			display: flex;
			justify-content: center;
			position: relative;
			span {
				text-overflow: ellipsis;
				overflow: hidden;
				transform: scale(0.9);
			}
		}

		.fns {
			align-items: center;
			border-bottom: 1px solid var(--z-line);
			display: flex;
			justify-content: center;
			padding: 0 4px;

			a {
				text-decoration: none;
			}
		}
	}

	.custom-column-content {
		position: relative;
		top: 0;
		left: 0;
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
		position: relative;
		overflow: visible;
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
}

.resize-handle {
	position: absolute;
	right: 0;
	bottom: -3px;
	width: 100%;
	height: 6px;
	cursor: row-resize;
	z-index: 1;

	&.resizing,
	&:hover {
		background-color: var(--z-main);
		opacity: 0.8;
	}
}
</style>
