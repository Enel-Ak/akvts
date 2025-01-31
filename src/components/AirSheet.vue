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

// 核心配置参数
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 100}, // 最大 671087
	// 总列数
	colCount: {type: Number, default: 13},
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

const maxRowCount = computed(() => {
	if (props.modelValue?.celldata.length) {
		return props.modelValue.celldata.length > props.rowCount
			? props.modelValue.celldata.length
			: props.rowCount
	} else {
		return props.rowCount > 671087 ? 671087 : props.rowCount
	}
})

const maxColCount = computed(() => {
	if (props.modelValue?.celldata.length) {
		return props.modelValue.celldata
			.map((d) => d.length)
			.reduce((a, b) => Math.max(a, b), props.colCount)
	} else {
		return props.colCount > 240 ? 240 : props.colCount
	}
})

// 保存数据
const sheet = reactive({
	config: {
		rowCount: maxRowCount.value,
		colCount: maxColCount.value,
	},
	celldata: props.modelValue.celldata,
	fns: props.modelValue.fns,
})

// 容器
const id = `air-sheet-${Math.random().toString(16).slice(2)}`
const initialized = ref(false)
const containerRef = ref()
const alphabetRef = ref()
const numberRef = ref()
const fnRef = ref()

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
	renderRange: () => updateVisibleRange(),
	useMergedCellsHook: () => useMergedCellsHook,
	useSelectionRangeHook: () => useSelectionRangeHook,
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
	for (let i = 0; i < sheet.config.rowCount; i++) {
		height += useResizeHook.getRowHeight(i)
	}
	return height
})

// 计算总宽度
const totalWidth = computed(() => {
	let width = 0
	for (let i = 0; i < sheet.config.colCount; i++) {
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
			rowCount: sheet.config.rowCount,
			colCount: sheet.config.colCount,
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
	const end = Math.min(sheet.config.rowCount - 1, endRow)

	for (let i = start; i <= end; i++) {
		rows.push({
			rowIndex: i,
			rowHeight: useResizeHook.getRowHeight(i),
			config: {},
		})
	}
	return rows
})

// 生成可见列数据
const visibleCells = (row) => {
	const cells = []
	const {startCol, endCol, buffer} = visibleRangeRef.value
	const start = Math.max(0, startCol)
	const end = Math.min(sheet.config.colCount - 1, endCol)

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

		cells.push({
			rowIndex: row.rowIndex,
			colIndex: i,
			rowHeight: useResizeHook.getRowHeight(row.rowIndex),
			colWidth: useResizeHook.getColWidth(i),
			value,
			config: {},
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

// 生成列标题（A-Z, AA-AZ等）, 字母缓存
const titleCache = new Map()
const getTitle = (index) => {
	if (titleCache.has(index)) {
		return titleCache.get(index)
	}

	let title = ''
	let num = index
	while (num >= 0) {
		title = String.fromCharCode(65 + (num % 26)) + title
		num = Math.floor(num / 26) - 1
		if (num === -1) break
	}
	titleCache.set(index, title)
	return title
}

// 计算当前可见的列标题
const visibleTitles = computed(() => {
	const titles = []
	const {startCol, endCol} = visibleRangeRef.value
	for (let col = startCol; col <= endCol; col++) {
		const colWidth = useResizeHook.getColWidth(col)
		titles.push({
			colIndex: col,
			title: getTitle(col),
			colWidth,
		})
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
const lastScroll = ref(true)
const onScroll = useThrottleFn((e) => {
	if (lastScroll.value) {
		lastScroll.value = false
		return
	}

	clearTimeout(scrollTimer)
	const container = e.target
	const newScrollTop = container.scrollTop
	const newScrollLeft = container.scrollLeft

	const alphabet = alphabetRef.value
	const number = numberRef.value
	const fn = fnRef.value

	if (newScrollTop !== scrollTop.value || newScrollLeft !== scrollLeft.value) {
		scrollTop.value = newScrollTop
		scrollLeft.value = newScrollLeft

		if (alphabet) {
			alphabet.scrollLeft = newScrollLeft
		}

		if (number) {
			number.scrollTop = newScrollTop
		}

		if (fn) {
			fn.scrollTop = newScrollTop
		}

		// 修正最后一次位置并对齐到行
		scrollTimer = setTimeout(() => {
			lastScroll.value = true
			const nt = containerRef.value.scrollTop
			const nl = containerRef.value.scrollLeft
			scrollTop.value = nt
			scrollLeft.value = nl

			if (alphabet) {
				alphabet.scrollLeft = nl
			}

			if (number) {
				number.scrollTop = nt
			}

			if (fn) {
				fn.scrollTop = nt
			}

			savedScrollPosition.value = {top: nt, left: nl}
		}, 150)
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

		<!-- Sheet -->
		<div class="sheet">
			<!-- 字母 -->
			<div
				v-if="enableNumber"
				class="alphabet-placeholder brn bbn"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
					width: numberWidth + 'px',
				}"
			></div>
			<div
				ref="alphabetRef"
				class="virtual-sheet custom alphabet"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
					width: `calc(100% - ${enableFn && sheet.fns?.length ? fnWidth : 0}px - ${
						enableNumber ? numberWidth : 0
					}px)`,
				}"
			>
				<div class="virtual-phantom" :style="{width: totalWidth + 'px'}"></div>
				<div
					class="virtual-content alphabet-cells"
					:style="{
						transform: `translate(${offsetLeft}px, 0)`,
					}"
				>
					<div class="row">
						<template v-for="alphabet of visibleTitles">
							<div class="cell" :style="{width: alphabet.colWidth + 'px'}">
								<span>{{ alphabet.title }}</span>
								<div
									class="resize-handle"
									:class="{
										resizing:
											useResizeHook.isResizing &&
											useResizeHook.resizingCol.value?.colIndex ===
												alphabet.colIndex,
									}"
									@mousedown.stop="
										useResizeHook.startResize(alphabet, $event, 'horizontal')
									"
								></div>
							</div>
						</template>
					</div>
				</div>
			</div>

			<div
				v-if="enableFn && sheet.fns?.length"
				class="alphabet-placeholder bln bbn"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
					width: fnWidth + 'px',
				}"
			></div>

			<!-- 序号 -->
			<div
				ref="numberRef"
				class="virtual-sheet custom brn"
				v-if="enableNumber"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
					width: numberWidth + 'px',
				}"
			>
				<div class="virtual-phantom" :style="{height: totalHeight + 'px'}"></div>
				<div
					class="virtual-content"
					:style="{
						transform: `translate(0, ${offsetTop}px)`,
						width: `${numberWidth}px`,
					}"
				>
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<div class="number" :style="{height: `${row.rowHeight}px`}">
							<span>{{ row.rowIndex + 1 }}</span>

							<div
								class="resize-handle"
								:class="{
									resizing:
										useResizeHook.isResizing &&
										useResizeHook.resizingRow.value?.rowIndex === row.rowIndex,
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
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<div class="row" :style="{height: `${row.height}px`}">
							<template v-for="cell of visibleCells(row)" :key="cell.colIndex">
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
			<div
				ref="fnRef"
				class="virtual-sheet custom bln"
				v-if="enableFn && sheet.fns?.length"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
					width: fnWidth + 'px',
				}"
			>
				<div class="virtual-phantom" :style="{height: totalHeight + 'px'}"></div>
				<div
					class="virtual-content"
					:style="{
						transform: `translate(0, ${offsetTop}px)`,
						width: `${fnWidth}px`,
					}"
				>
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<slot name="fn" :row="row">
							<div class="fns" :style="{height: `${rowHeight}px`}">
								<span
									v-for="fn in sheet.fns"
									@click="() => fn.click(row, sheet.celldata[row.rowIndex])"
								>
									{{ fn.label }}
								</span>
							</div>
						</slot>
					</template>
				</div>
			</div>

			<!-- 行辅助线 -->
			<div
				v-if="useResizeHook.isResizing.value && useResizeHook.resizingRow.value"
				class="grid-lines-row"
				:style="{
					width: totalWidth + 'px',
				}"
			></div>

			<!-- 列辅助线 -->
			<div
				v-if="useResizeHook.isResizing.value && useResizeHook.resizingCol.value"
				class="grid-lines-col"
				:style="{
					height: totalHeight + 'px',
				}"
			></div>
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
	flex-wrap: wrap;
	height: 100%;
	overflow: hidden;
	position: relative;
	width: 100%;

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
		flex: 1;
		position: relative;
		overflow: auto;
		height: calc(100% - 18px);
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
		padding-bottom: 1px;
		padding-right: 1px;
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

	.custom {
		background-color: var(--z-bg-secondary);
		flex: none;
		overflow: hidden;
		transition: opacity 0.15s linear;

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

			span {
				cursor: pointer;
				color: var(--z-font-color);
				text-decoration: none;
			}
		}

		.virtual-content {
			padding-bottom: 120px;
		}

		&.alphabet {
			border-bottom: none;
			height: 18px;
			width: 100%;

			.alphabet-cells {
				padding-bottom: 0;
			}

			.cell {
				border-right: 1px solid var(--z-line);
				border-bottom: 0;
				line-height: 16px;
				overflow: visible;
				position: relative;
				text-align: center;

				span {
					font-size: 12px;
					flex: 1;
				}

				.resize-handle {
					bottom: 0;
					cursor: col-resize;
					height: 100%;
					right: -3px;
					width: 6px;
				}
			}
		}
	}

	.alphabet-placeholder {
		border: 1px solid var(--z-line);
		background-color: var(--z-bg-secondary);
		transition: opacity 0.15s linear;
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

.btn {
	border-top: none !important;
}

.bbn {
	border-bottom: none !important;
}

.brn {
	border-right: none !important;
}

.bln {
	border-left: none !important;
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
		opacity: 1;
	}
}

.grid-lines-row {
	position: absolute;
	top: 0;
	left: 1px;
	height: 1px;
	background-color: var(--z-main);
	pointer-events: none;
	z-index: -1;
}

.grid-lines-col {
	position: absolute;
	top: 0;
	left: 0;
	width: 1px;
	background-color: var(--z-main);
	height: 100%;
	pointer-events: none;
	z-index: -1;
}
</style>
