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

// 核心配置参数
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 1000},
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

// 配置参数
const celldata = reactive(props.modelValue.celldata)
const fns = reactive(props.modelValue.fns)

// 保存数据
const sheet = reactive({
	config: {
		rowCount: props.rowCount,
		colCount: props.colCount,
	},
	celldata: [],
})

// 数据缓存处理
const cellCache = new Map()
const rowCache = new Map()
// 使用 RAF 优化渲染
let rafId = null

// 容器
const id = `air-sheet-${Math.random().toString(16).slice(2)}`
const initialized = ref(false)
const containerRef = ref()

// 滚动位置
const scrollTop = ref(0)
const scrollLeft = ref(0)

// 保存滚动位置
const savedScrollPosition = ref({top: 0, left: 0})

// 计算可视区域大小
const viewportHeight = ref(0)
const viewportWidth = ref(0)

// hooks 模块
const useResizeHook = reactive(
	useResize({
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
	})
)
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

const scheduleUpdate = (callback) => {
	cancelAnimationFrame(rafId)
	rafId = requestAnimationFrame(callback)
}

// 添加行高缓存
const rowHeightCache = new Map()
const defaultRowHeight = props.rowHeight
const defaultColWidth = props.colWidth

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

// 计算最佳缓存行数
const calculateOptimalBuffer = (startRow, visibleRows) => {
	// 计算可见区域的平均行高
	let totalVisibleHeight = 0
	let visibleRowCount = 0

	for (let i = startRow; i < Math.min(startRow + visibleRows, props.rowCount); i++) {
		totalVisibleHeight += useResizeHook.getRowHeight(i)
		visibleRowCount++
	}

	const averageRowHeight = totalVisibleHeight / visibleRowCount || defaultRowHeight

	// 根据可视区域高度和平均行高计算理想的缓存行数
	const optimalBuffer = Math.ceil(viewportHeight.value / averageRowHeight)

	// 确保缓存行数不会太小或太大
	return Math.max(5, Math.min(optimalBuffer, 15))
}

// 计算最佳缓存列数
const calculateOptimalColBuffer = (startCol, visibleCols) => {
	// 计算可见区域的平均列宽
	let totalVisibleWidth = 0
	let visibleColCount = 0

	for (let i = startCol; i < Math.min(startCol + visibleCols, props.colCount); i++) {
		totalVisibleWidth += useResizeHook.getColWidth(i)
		visibleColCount++
	}

	const averageColWidth = totalVisibleWidth / visibleColCount || defaultColWidth

	// 根据可视区域宽度和平均列宽计算理想的缓存列数
	const optimalBuffer = Math.ceil(viewportWidth.value / averageColWidth)

	// 确保缓存列数不会太小或太大
	return Math.max(3, Math.min(optimalBuffer, 10))
}

// 计算可见行列范围
const visibleRange = computed(() => {
	// 行范围计算保持不变
	const calculateRowRange = () => {
		let startRow = 0
		let accHeight = 0

		// 向下累加直到找到起始行
		while (startRow < props.rowCount) {
			const rowHeight = useResizeHook.getRowHeight(startRow)
			if (accHeight + rowHeight > scrollTop.value) {
				break
			}
			accHeight += rowHeight
			startRow++
		}

		// 计算可见行数
		let visibleRows = 0
		let visibleHeight = 0
		let tempRow = startRow

		while (tempRow < props.rowCount && visibleHeight < viewportHeight.value) {
			visibleHeight += useResizeHook.getRowHeight(tempRow)
			visibleRows++
			tempRow++
		}

		// 计算最佳缓存行数
		const optimalBuffer = calculateOptimalBuffer(startRow, visibleRows)

		// 确保不会越界并留出上方缓冲空间
		const finalStartRow = Math.max(0, startRow - optimalBuffer)

		// 计算可见区域加缓冲区
		let endRow = startRow
		visibleHeight = 0
		const targetHeight =
			viewportHeight.value + useResizeHook.getRowHeight(startRow) * optimalBuffer * 2

		// 累加高度直到超过目标高度
		while (endRow < props.rowCount && visibleHeight < targetHeight) {
			visibleHeight += useResizeHook.getRowHeight(endRow)
			endRow++
		}

		// 确保至少有一个屏幕的内容加上缓冲区
		const minRows = Math.ceil(viewportHeight.value / defaultRowHeight)

		if (endRow - finalStartRow < minRows + optimalBuffer * 2) {
			endRow = Math.min(props.rowCount - 1, finalStartRow + minRows + optimalBuffer * 2)
		}

		// 如果接近底部，确保显示所有剩余行并调整起始行
		if (endRow >= props.rowCount - 1 - optimalBuffer) {
			endRow = props.rowCount - 1
			// 向上调整起始行以保持缓冲区大小一致
			const totalVisibleRows = endRow - finalStartRow + 1
			const newStartRow = Math.max(0, endRow - totalVisibleRows + 1)
			return {startRow: newStartRow, endRow}
		}

		return {startRow: finalStartRow, endRow}
	}

	const {startRow, endRow} = calculateRowRange()

	// 优化列范围计算
	const calculateColRange = () => {
		let startCol = 0
		let accWidth = 0

		// 向右累加直到找到起始列
		while (startCol < props.colCount) {
			const colWidth = useResizeHook.getColWidth(startCol)
			if (accWidth + colWidth > scrollLeft.value) {
				break
			}
			accWidth += colWidth
			startCol++
		}

		// 计算可见列数
		let visibleCols = 0
		let visibleWidth = 0
		let tempCol = startCol

		while (tempCol < props.colCount && visibleWidth < viewportWidth.value) {
			visibleWidth += useResizeHook.getColWidth(tempCol)
			visibleCols++
			tempCol++
		}

		// 计算最佳缓存列数
		const optimalBuffer = calculateOptimalColBuffer(startCol, visibleCols)

		// 确保不会越界并留出左侧缓冲空间
		const finalStartCol = Math.max(0, startCol - optimalBuffer)

		// 计算可见区域加缓冲区
		let endCol = startCol
		visibleWidth = 0
		const targetWidth =
			viewportWidth.value + useResizeHook.getColWidth(startCol) * optimalBuffer * 2

		// 累加宽度直到超过目标宽度
		while (endCol < props.colCount && visibleWidth < targetWidth) {
			visibleWidth += useResizeHook.getColWidth(endCol)
			endCol++
		}

		// 确保至少有一个屏幕的内容加上缓冲区
		const minCols = Math.ceil(viewportWidth.value / defaultColWidth)

		if (endCol - finalStartCol < minCols + optimalBuffer * 2) {
			endCol = Math.min(props.colCount - 1, finalStartCol + minCols + optimalBuffer * 2)
		}

		// 如果接近右边界，确保显示所有剩余列并调整起始列
		if (endCol >= props.colCount - 1 - optimalBuffer) {
			endCol = props.colCount - 1
			// 向左调整起始列以保持缓冲区大小一致
			const totalVisibleCols = endCol - finalStartCol + 1
			const newStartCol = Math.max(0, endCol - totalVisibleCols + 1)
			return {startCol: newStartCol, endCol}
		}

		return {startCol: finalStartCol, endCol}
	}

	const {startCol, endCol} = calculateColRange()

	return {startRow, endRow, startCol, endCol}
})

// 生成可见行数据
const visibleRows = computed(() => {
	const rows = []
	const {startRow, endRow} = visibleRange.value
	const start = Math.max(0, startRow - props.buffer)
	const end = Math.min(props.rowCount - 1, endRow + props.buffer)

	for (let i = start; i <= end; i++) {
		rows.push({
			id: i,
			index: i,
			height: useResizeHook.getRowHeight(i),
		})
	}
	return rows
})

// 计算可见单元格
const visibleCellsMap = computed(() => {
	const cells = {}
	visibleRows.value.forEach((row) => {
		const {startCol, endCol} = visibleRange.value
		const start = Math.max(0, startCol - props.buffer)
		const end = Math.min(props.colCount - 1, endCol + props.buffer)

		cells[row.index] = Array.from({length: end - start + 1}, (_, index) => {
			const currentRow = row.index
			const currentCol = start + index

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

			if (!sheet.celldata[currentRow]) {
				sheet.celldata[currentRow] = []
			}
			sheet.celldata[currentRow][currentCol] = value

			return {
				id: `${row.id}-${start + index}`,
				rowIndex: currentRow,
				colIndex: currentCol,
				value: value || `${row.index + 1}-${start + index + 1}`,
				colWidth: useResizeHook.getColWidth(currentCol),
				rowHeight: useResizeHook.getRowHeight(currentRow),
			}
		})
	})
	return cells
})

// 获取指定行的可见单元格
const visibleCells = (row) => {
	return visibleCellsMap.value[row.index] || []
}

// 计算偏移量
const offsetTop = computed(() => {
	let offset = 0
	for (let i = 0; i < visibleRange.value.startRow; i++) {
		offset += useResizeHook.getRowHeight(i)
	}
	return offset
})

const offsetLeft = computed(() => {
	let offset = 0
	for (let i = 0; i < visibleRange.value.startCol; i++) {
		offset += useResizeHook.getColWidth(i)
	}
	return offset
})

// 计算自定义偏移量
const customOffsetTop = computed(() => {
	if (scrollTop.value <= 0) {
		return 0
	}

	// 计算实际的偏移量
	let totalHeight = 0
	let currentRow = 0

	while (currentRow < visibleRange.value.startRow && totalHeight <= scrollTop.value) {
		totalHeight += useResizeHook.getRowHeight(currentRow)
		currentRow++
	}

	// 返回精确的偏移量
	return -(scrollTop.value - totalHeight)
})

const customOffsetLeft = computed(() => {
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
})

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
		rowHeight: cell.rowHeight,
		colWidth: cell.colWidth,
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

// 优化的滚动处理
const onScroll = useThrottleFn((e) => {
	const container = e.target
	const newScrollTop = container.scrollTop
	const newScrollLeft = container.scrollLeft

	if (newScrollTop !== scrollTop.value || newScrollLeft !== scrollLeft.value) {
		scrollTop.value = newScrollTop
		scrollLeft.value = newScrollLeft
		cleanCache()
	}
}, 16)

// 优化的缓存清理
const cleanCache = () => {
	const {startRow, endRow} = visibleRange.value
	const bufferSize = props.buffer

	// 更新可见区域的行缓存
	for (let row = startRow - bufferSize; row <= endRow + bufferSize; row++) {
		if (!rowCache.has(row) && row >= 0 && row < props.rowCount) {
			const rowData = celldata?.filter((cell) => cell.r === row) || []
			rowCache.set(row, rowData)
		}
	}

	// 清理不可见区域的缓存
	for (const [rowIndex] of rowCache) {
		if (rowIndex < startRow - bufferSize || rowIndex > endRow + bufferSize) {
			rowCache.delete(rowIndex)
			// 清理相关的单元格缓存
			for (const [key] of cellCache) {
				if (key.startsWith(`${rowIndex}-`)) {
					cellCache.delete(key)
				}
			}
		}
	}
}

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
		scheduleUpdate(() => {
			cleanCache()
		})
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

// 定期清理缓存
watch(visibleRange, cleanCache)

defineExpose({
	mergeCells: useMergedCellsHook.addMergedCell,
})
</script>
<template>
	<div class="air-sheet-component">
		<!-- 工具栏 -->
		<div class="toolbar">工具栏</div>

		<!-- 字母 -->
		<div class="alphabet">
			<div class="alphabet-placeholder" :style="{width: numberWidth + 1 + 'px'}"></div>
			<div class="alphabet-content">
				<div class="virtual-phantom" :style="{width: totalWidth + 'px'}"></div>
				<div class="cells" :style="{transform: `translateX(${customOffsetLeft}px)`}">
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
		</div>

		<!-- Sheet -->
		<div class="sheet">
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
					<template v-for="row of visibleRows" :key="row.id">
						<div class="number" :style="{height: `${row.height}px`}">
							{{ row.id + 1 }}
							<div
								class="resize-handle"
								:class="{resizing: useResizeHook.resizingRow?.index === row.index}"
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
						<div class="row" :style="{height: `${row.rowHeight}px`}">
							<template v-for="cell of visibleCells(row)" :key="cell.id">
								<div
									v-if="isMergedCellStart(cell)"
									class="cell merged-cell-placeholder"
									:style="{
										width: `${cell.colWidth}px`,
										height: `${cell.rowHeight}px`,
									}"
								></div>
								<div class="cell" :style="getOffsetStyle(cell)">
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
			<div class="custom-column" v-if="enableFn && fns.length">
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
						<div class="fns" :style="{height: `${rowHeight}px`}">
							<el-link
								v-for="fn in fns"
								:type="fn.type"
								size="small"
								@click="() => fn.click(row, sheet.celldata[row.index])"
							>
								{{ fn.label }}
							</el-link>
						</div>
					</template>
				</div>
			</div>
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
