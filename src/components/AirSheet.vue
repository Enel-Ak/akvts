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
import {useMergedCells} from '@/hooks/sheet/useMergedCells'
import {useSelectionRange} from '@/hooks/sheet/useSelectionRange'
import {useResize} from '@/hooks/sheet/useResize'
import {useSheetRender} from '@/hooks/sheet/useSheetRender.js'
import {useEdit} from '@/hooks/sheet/useEdit.js'
import {useHistory} from '@/hooks/sheet/useHistory'
import {useCopy} from '@/hooks/sheet/useCopy'
import {useExcel} from '@/hooks/sheet/useExcel'
import {useTools} from '@/hooks/sheet/useTools'
import {useMouseRight} from '@/hooks/sheet/useMouseRight'
import {ElMessage} from 'element-plus'

const emits = defineEmits(['update:modelValue', 'cellInput'])

// 核心配置参数
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 100}, // 最大 671087
	// 总列数
	colCount: {type: Number, default: 15},
	// 单元格高度
	rowHeight: {type: Number, default: 25},
	// 单元格宽度
	colWidth: {type: Number, default: 100},
	// 缓冲区大小(额外渲染的行数)
	buffer: {type: Number, default: 10},

	// 序号
	enableNumber: {type: Boolean, default: true},
	// 序号宽度
	numberWidth: {type: Number, default: 35},

	// 操作列
	enableFn: {type: Boolean, default: true},
	// 操作列宽度
	fnWidth: {type: Number, default: 120},
	fns: {type: Array, default: () => []},

	height: {type: [Number, String], default: 0},
})

// 保存数据
const sheet = reactive({
	config: {
		font: true, // 字体
		color: true, // 颜色
		fill: true, // 填充
		bold: true, // 加粗
		strikethrough: true, // 删除线
		italic: true, // 斜体
		underline: true, // 下划线
		merge: true, // 合并单元格
		align: true, // 对齐方式
		border: true, // 边框
		addRow: true, // 添加行
		removeRow: true, // 删除行
		addColumn: true, // 添加列
		removeColumn: true, // 删除列
		export: true, // 导出
		import: true, // 导入
		edit: true, // 编辑
		lock: true, // 锁定
		unlock: true, // 解锁

		mergedCells: {},
		lockCells: {},
		cellStyle: {
			...props.modelValue?.config.cellStyle,
		},
		rowCount: 0,
		colCount: 0,
	},
	celldata: new Map(),
})

const fns = ref(props.modelValue?.fns || [])
const limit = 30000

// 初始数据处理
const initialData = () => {
	if (!props.modelValue?.celldata) return

	const celldata = props.modelValue.celldata
	const total = celldata.length

	if (total >= limit) {
		loading.value = true
		loadingProgress.value = -1
		loadingText.value = '数据量较大, 请稍后...'
	}

	const batchSize = 3000
	let processed = 0

	function processBatch() {
		const start = performance.now()

		while (processed < total && performance.now() - start < 16) {
			const row = celldata[processed]
			if (row) {
				sheet.celldata.set(processed, row)
			}
			processed++
		}

		if (processed < total) {
			if (processed % batchSize === 0) {
				loadingText.value = `正在加载数据...`
				loadingProgress.value = Math.floor((processed / total) * 100)
			}
			requestAnimationFrame(processBatch)
		} else {
			loading.value = false
			useHistoryHook.saveHistory()
		}
	}
	requestAnimationFrame(processBatch)
}

// 容器
const id = `air-sheet-${Math.random().toString(16).slice(2)}`
const containerHeight = computed(() => {
	if (typeof props.height === 'number') {
		if (props.height === 0) {
			return '100%'
		}
		return `${props.height}px`
	} else {
		if (!props.height.includes('px')) {
			return props.height + 'px'
		}
		return props.height.replace(/\D+/g, 'px')
	}
})
const initialized = ref(false)
const loading = ref(false)
const loadingText = ref('正在处理数据...')
const loadingProgress = ref(0)
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
const useSheetRenderHook = useSheetRender({sheet, loading, loadingText, loadingProgress})
const useResizeHook = useResize({
	rowHeight: props.rowHeight,
	colWidth: props.colWidth,
	renderRange: () => updateVisibleRange(),
	useMergedCellsHook: () => useMergedCellsHook,
	useSelectionRangeHook: () => useSelectionRangeHook,
})
const useMergedCellsHook = useMergedCells({
	sheet,
	rowHeight: props.rowHeight,
	colWidth: props.colWidth,
	useResizeHook,
	renderRange: () => updateVisibleRange(),
})
const useSelectionRangeHook = reactive(
	useSelectionRange(id, {
		sheet,
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
		useMergedCellsHook,
		useResizeHook,
		renderRange: () => updateVisibleRange(),
	})
)
const useEditHook = useEdit(id, {
	sheet,
	useResizeHook,
	useMergedCellsHook,
	useSelectionRangeHook,
	renderRange: () => updateVisibleRange(),
})
const useHistoryHook = useHistory({
	loading,
	loadingText,
	loadingProgress,
	sheet,
	useMergedCellsHook,
	useSelectionRangeHook,
	renderRange: () => updateVisibleRange(),
	processMapInBatches: (map, callback, batchSize = 5000) =>
		processMapInBatches(map, callback, batchSize),
})
const useCopyHook = useCopy({
	sheet,
	useMergedCellsHook,
	useSelectionRangeHook,
	useHistoryHook,
	renderRange: () => updateVisibleRange(),
})
const {importing, exportExcel, readExcelFile} = useExcel({
	sheet,
	loading,
	loadingText,
	loadingProgress,
	useEditHook,
	useMergedCellsHook,
	useSelectionRangeHook,
})
const useMouseRightHook = useMouseRight(id)
const useToolsHook = useTools({
	sheet,
	limit,
	loading,
	loadingText,
	containerRef,
	useResizeHook,
	useHistoryHook,
	useMergedCellsHook,
	useSelectionRangeHook,
	isLocked: () => isLockedCell(),
	renderRange: () => updateVisibleRange(),
	processMapInBatches: (map, callback, batchSize) =>
		processMapInBatches(map, callback, batchSize),
})

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

const processMapInBatches = (map, callback, batchSize = 5000) => {
	const entries = Array.from(map.entries())
	const total = entries.length
	let processed = 0

	return new Promise((resolve) => {
		function processBatch() {
			const start = performance.now()

			while (processed < total && performance.now() - start < 16) {
				callback(entries[processed][0], entries[processed][1])
				processed++
			}

			if (processed < total) {
				if (processed % batchSize !== 0) {
					loadingProgress.value = Math.floor((processed / total) * 100)
				}
				requestAnimationFrame(processBatch)
			} else {
				resolve()
			}
		}

		requestAnimationFrame(processBatch)
	})
}

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
			mergedCells: JSON.parse(JSON.stringify(sheet.config.mergedCells)),
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
let observer = null
let observerTimer = null
const observeView = () => {
	observer = new ResizeObserver((entries) => {
		if (observerTimer) {
			clearTimeout(observerTimer)
		}
		observerTimer = setTimeout(() => {
			entries.forEach((entry) => {
				viewportHeight.value = entry.contentRect.height
				viewportWidth.value = entry.contentRect.width
				lastScroll.value = true
				updateVisibleRange()
			})
		}, 16)
	})

	observer.observe(containerRef.value)
}

// 生成可见行数据
const visibleRows = computed(() => {
	const rows = []
	const {startRow, endRow, buffer} = visibleRangeRef.value
	const start = Math.max(0, startRow)
	const end = Math.min(sheet.config.rowCount, endRow)

	for (let i = start; i < end; i++) {
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
	const end = Math.min(sheet.config.colCount, endCol)

	for (let i = start; i < end; i++) {
		// 检查当前单元格是否是合并单元格的从属单元格
		const mergedCell = useMergedCellsHook.findMergedCell(row.rowIndex, i)
		const isMergedStart = mergedCell && mergedCell.row === row.rowIndex && mergedCell.col === i
		const originalValue = sheet.celldata.get(row.rowIndex)?.[i] || null

		// 如果不是合并单元格，或者是合并单元格的起始位置，则显示值
		let value = null
		if (mergedCell) {
			if (isMergedStart) {
				value = originalValue
			}
		} else {
			value = originalValue
		}

		if (!sheet.celldata.get(row.rowIndex)) {
			sheet.celldata.set(row.rowIndex, [])
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

// 滚动条宽度补偿
const scrollbarWidth = ref(0)
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
	const start = Math.max(0, startCol)
	const end = Math.min(sheet.config.colCount, endCol)

	for (let col = start; col < end; col++) {
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
	// const mergedCells = useMergedCellsHook.getMergedCells()
	const mergedCells = sheet.config.mergedCells
	if (Object.keys(mergedCells).length === 0) {
		return false
	}
	const key = `${cell.rowIndex}-${cell.colIndex}`

	return mergedCells.hasOwnProperty(key)
}

// 判断单元格是否锁定
let lockedTimer = null
const isLockedCell = () => {
	clearTimeout(lockedTimer)
	// 不允许编辑
	if (!sheet.config.edit) {
		lockedTimer = setTimeout(() => ElMessage.warning('当前表格不支持编辑'), 300)
		return true
	}

	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return true

	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const endCol = Math.max(ranged.start.col, ranged.end.col)

	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			if (sheet.config.lockCells[`${row}-${col}`]) {
				lockedTimer = setTimeout(() => ElMessage.warning(`单元格已锁定`), 300)
				return true
			}
		}
	}

	return false
}

// 滚动处理
let scrollTimer = null
let rafId = null
const lastScroll = ref(false)
const onScroll = async (e) => {
	if (lastScroll.value) {
		lastScroll.value = false
		return
	}

	// 清除之前的定时器和动画帧
	clearTimeout(scrollTimer)
	if (rafId) {
		cancelAnimationFrame(rafId)
	}

	if (sheet.config.rowCount >= limit) {
		loading.value = true
		loadingProgress.value = -1
		loadingText.value = '数据量较大, 请稍后...'
	}

	const container = e.target
	const newScrollTop = container.scrollTop
	const newScrollLeft = container.scrollLeft

	const alphabet = alphabetRef.value
	const number = numberRef.value
	const fn = fnRef.value

	// 使用 requestAnimationFrame 进行滚动同步
	rafId = requestAnimationFrame(() => {
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
	})

	// 使用防抖处理最后一次滚动位置
	scrollTimer = setTimeout(() => {
		lastScroll.value = true
		const nt = containerRef.value.scrollTop
		const nl = containerRef.value.scrollLeft

		rafId = requestAnimationFrame(() => {
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

			if (sheet.config.rowCount >= limit) {
				loading.value = false
			}
		})
	}, 150) // 减少延迟时间以提高响应速度
}

// 恢复滚动位置
const restoreScrollPosition = () => {
	if (!containerRef.value) return

	const container = containerRef.value
	const alphabet = alphabetRef.value
	const number = numberRef.value
	const fn = fnRef.value

	const {top, left} = savedScrollPosition.value

	if (top !== undefined && left !== undefined) {
		container.scrollTop = top
		container.scrollLeft = left

		if (alphabet) {
			alphabet.scrollLeft = left
		}

		if (number) {
			number.scrollTop = top
		}

		if (fn) {
			fn.scrollTop = top
		}

		scrollTop.value = top
		scrollLeft.value = left
	}
	lastScroll.value = true
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

// 点击序号
const onClickNumber = (e, row) => {
	useSelectionRangeHook.setRange(row.rowIndex, 0, row.rowIndex, sheet.config.colCount - 1, true)
}

// 点击字母
const onClickAlphabet = async (e, col) => {
	const target = e.target.closest('.alphabet-cell')
	const colIndex = Number(target.getAttribute('data-col'))
	useSelectionRangeHook.setRange(0, colIndex, sheet.config.rowCount - 1, colIndex, true)
}

// 设置单元格样式, 工具栏共用,
const setCellStyle = (type, val, fn, save = true) => {
	if (isLockedCell()) {
		return
	}

	if (save) {
		useHistoryHook.saveHistory()
	}

	const ranged = useSelectionRangeHook.ranged
	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const endCol = Math.max(ranged.start.col, ranged.end.col)

	for (let i = startRow; i <= endRow; i++) {
		for (let j = startCol; j <= endCol; j++) {
			if (fn && typeof fn === 'function') {
				fn(i, j, {startRow, startCol, endRow, endCol})
			} else {
				if (!sheet.config.cellStyle[`${i}-${j}`]) {
					sheet.config.cellStyle[`${i}-${j}`] = {}
				}

				if (
					sheet.config.cellStyle[`${i}-${j}`][type] &&
					sheet.config.cellStyle[`${i}-${j}`][type] === val
				) {
					delete sheet.config.cellStyle[`${i}-${j}`][type]
					continue
				}
				sheet.config.cellStyle[`${i}-${j}`][type] = val
			}
		}
	}
}

// 导入Excel
const onImportClick = async (event) => {
	if (!sheet.config.import) {
		ElMessage.warning('当前表格不支持导入')
		return
	}
	const file = event.target.files[0]
	if (!file) return
	const result = await readExcelFile(file)
	if (result.success) {
		console.log('Excel导入成功', sheet.celldata)
		event.target.value = null
		updateVisibleRange()
	}
}

// 导出Excel
const onExportClick = async () => {
	if (!sheet.config.export) {
		ElMessage.warning('当前表格不支持导出')
		return
	}

	const name = Date.now()
	const result = await exportExcel(`${name}.xlsx`)
	if (result.success) {
		console.log('Excel导出成功')
	}
}

// 单元格编辑失去焦点后
const onCellInput = (event, cell) => {
	useHistoryHook.saveHistory(cell)
	setTimeout(() => {
		const val = sheet.celldata.get(cell.rowIndex)?.[cell.colIndex]
		emits('cellInput', val, cell) // 新值，旧值
		console.log('单元格编辑', val, cell)
	}, 0)
}

// 锁定单元格
const onLockClick = () => {
	if (!sheet.config.lock) {
		ElMessage.warning('当前表格不支持锁定')
		return
	}
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const endCol = Math.max(ranged.start.col, ranged.end.col)

	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			sheet.config.lockCells[`${row}-${col}`] = true
		}
	}
	ElMessage.success(`已锁定`)
}

// 解锁单元格
const onUnlockClick = () => {
	if (!sheet.config.unlock) {
		ElMessage.warning('当前表格不支持解锁')
		return
	}
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const endCol = Math.max(ranged.start.col, ranged.end.col)

	for (let row = startRow; row <= endRow; row++) {
		for (let col = startCol; col <= endCol; col++) {
			delete sheet.config.lockCells[`${row}-${col}`]
		}
	}
	ElMessage.warning(`已解锁`)
}

const init = async () => {
	initialData()

	if (props.modelValue?.celldata) {
		sheet.config.rowCount = Math.max(props.modelValue.celldata.length, props.rowCount)
		sheet.config.colCount = props.modelValue.celldata
			.map((d) => d.length)
			.reduce((a, b) => Math.max(a, b), props.colCount)
	} else {
		sheet.config.rowCount = Math.min(props.rowCount, 671087)
		sheet.config.colCount = Math.min(props.colCount, 240)
	}

	useResizeHook.init()
	useMergedCellsHook.init()
	useSheetRenderHook.init()
	useSelectionRangeHook.init()
	useEditHook.init()
	useCopyHook.init()
	useHistoryHook.init()
	useMouseRightHook.init()

	nextTick(async () => {
		updateViewportSize()
		await nextTick()

		await updateVisibleRange()

		await updateOffset('offsetTop', 'startRow')
		await updateOffset('offsetLeft', 'startCol')

		restoreScrollPosition()
		window.addEventListener('resize', updateViewportSize)
		observeView()
		initialized.value = true

		// 计算滚动条宽度
		const outer = document.createElement('div')
		outer.style.visibility = 'hidden'
		outer.style.overflow = 'scroll'
		document.body.appendChild(outer)

		const inner = document.createElement('div')
		outer.appendChild(inner)

		scrollbarWidth.value = outer.offsetWidth - inner.offsetWidth
		outer.parentNode.removeChild(outer)
	})
}

const destroy = () => {
	if (useSheetRenderHook) {
		useSheetRenderHook.destroy()
	}

	if (useSelectionRangeHook) {
		useSelectionRangeHook.destroy()
	}

	if (useEditHook) {
		useEditHook.destroy()
	}

	if (useResizeHook) {
		useResizeHook.destroy()
	}

	if (useMouseRightHook) {
		useMouseRightHook.destroy()
	}

	window.removeEventListener('resize', updateViewportSize)
}

const clearData = () => {
	sheet.celldata.clear()
}

// 初始化
onMounted(() => {
	useSelectionRangeHook.setRange(0, 0, 0, 0)
})

onActivated(() => {
	init()
})

onDeactivated(() => {
	if (containerRef.value) {
		savedScrollPosition.value = {
			top: containerRef.value.scrollTop,
			left: containerRef.value.scrollLeft,
		}
	}
})

onUnmounted(() => {
	destroy()
	clearData()
})

defineExpose({
	destroy,
	clearData,
	setRange: useSelectionRangeHook.setRange,
	setMergeCell: useMergedCellsHook.setMergeCell,
	setCellValue: useEditHook.setCellValue,
	getSheet: () => {
		return JSON.parse(JSON.stringify({...sheet, celldata: [...sheet.celldata]}))
	},
	getSheetData: () => {
		return JSON.parse(JSON.stringify([...sheet.celldata]))
	},
})
</script>
<template>
	<div class="air-sheet-component" :style="{height: containerHeight}">
		<!-- 工具栏 -->
		<div class="toolbar" :style="{}">
			<div v-if="sheet.config.font" class="group font-layout h-full">
				<div class="item font">
					<!-- 字体 -->
					<select value="FZSSJW, sans-serif" @change="useToolsHook.setFont($event)">
						<option
							v-for="[key, value] of Object.entries(useToolsHook.fonts)"
							:key="value"
							:value="value"
						>
							{{ key }}
						</option>
					</select>
					<!-- 字号 -->
					<select value="13" @change="useToolsHook.setFontSize($event)">
						<option v-for="size in useToolsHook.fontSize" :key="size" :value="size">
							{{ size }}
						</option>
					</select>
				</div>
			</div>

			<div v-if="sheet.config.color || sheet.config.fill" class="group">
				<div v-if="sheet.config.color" class="item color">
					<Icons icon-name="Font"></Icons>
					<span>颜色</span>
					<input
						type="color"
						@input="useToolsHook.setFontColor($event)"
						@change="useToolsHook.fontColorChanged($event)"
					/>
				</div>
				<div v-if="sheet.config.fill" class="item color">
					<Icons icon-name="FillColor"></Icons>
					<span class="fill-color">填充</span>
					<input
						type="color"
						@input="useToolsHook.setFillColor($event)"
						@change="useToolsHook.fillColorChanged($event)"
					/>
				</div>
			</div>

			<div
				class="group"
				v-if="
					sheet.config.bold ||
					sheet.config.italic ||
					sheet.config.underline ||
					sheet.config.strikethrough
				"
			>
				<div v-if="sheet.config.bold" class="item" @click="useToolsHook.setBold">
					<Icons icon-name="Bold"></Icons>
					<span>加粗</span>
				</div>
				<div v-if="sheet.config.italic" class="item" @click="useToolsHook.setItalic">
					<Icons icon-name="Italic"></Icons>
					<span>倾斜</span>
				</div>
				<div v-if="sheet.config.underline" class="item" @click="useToolsHook.setUnderline">
					<Icons icon-name="Underline"></Icons>
					<span>下划线</span>
				</div>
				<div
					v-if="sheet.config.strikethrough"
					class="item"
					@click="useToolsHook.setStrikethrough"
				>
					<Icons icon-name="Strikethrough"></Icons>
					<span>删除线</span>
				</div>
			</div>

			<div class="group" v-if="sheet.config.align">
				<div class="item" @click="useToolsHook.setAlign('left')">
					<Icons icon-name="AlignLeft"></Icons>
					<span>左对齐</span>
				</div>
				<div class="item" @click="useToolsHook.setAlign('center')">
					<Icons icon-name="AlignCenter"></Icons>
					<span>居中</span>
				</div>
				<div class="item" @click="useToolsHook.setAlign('right')">
					<Icons icon-name="AlignRight"></Icons>
					<span>右对齐</span>
				</div>
			</div>

			<div class="group" v-if="sheet.config.merge">
				<div class="item" @click="useToolsHook.setMerge()">
					<Icons icon-name="Merge"></Icons>
					<span>合并</span>
				</div>
			</div>

			<div class="group group-merge" v-if="sheet.config.border">
				<div class="item" @click="useToolsHook.setBorder()">
					<Icons icon-name="Border"></Icons>
					<span>边框</span>
				</div>
				<div class="merge border-merge shadow-12">
					<div class="item" @click="useToolsHook.setBorder(false)">
						<Icons icon-name="UnBorder"></Icons>
						<span>无边框</span>
					</div>
					<div class="item" @click="useToolsHook.setBorder(null, 'top')">
						<Icons icon-name="BorderTop"></Icons>
						<span>上边框</span>
					</div>
					<div class="item" @click="useToolsHook.setBorder(null, 'bottom')">
						<Icons icon-name="BorderBottom"></Icons>
						<span>下边框</span>
					</div>
					<div class="item" @click="useToolsHook.setBorder(null, 'left')">
						<Icons icon-name="BorderLeft"></Icons>
						<span>左边框</span>
					</div>
					<div class="item" @click="useToolsHook.setBorder(null, 'right')">
						<Icons icon-name="BorderRight"></Icons>
						<span>右边框</span>
					</div>
				</div>
			</div>

			<div v-if="sheet.config.addRow" class="group group-merge">
				<div class="item" @click="useToolsHook.addRow">
					<Icons icon-name="AddRow"></Icons>
					<span>添加行</span>
				</div>

				<div class="merge add-row-merge shadow-12">
					<input v-model.number="useToolsHook.addRowCount.value" type="text" value="1" />
				</div>
			</div>

			<div v-if="sheet.config.addColumn" class="group group-merge">
				<div v-if="sheet.config.addColumn" class="item" @click="useToolsHook.addColumn">
					<Icons icon-name="AddColumn"></Icons>
					<span>添加列</span>
				</div>
				<div class="merge add-column-merge shadow-12">
					<input
						v-model.number="useToolsHook.addColumnCount.value"
						type="text"
						value="1"
					/>
				</div>
			</div>

			<div class="group" v-if="sheet.config.removeRow || sheet.config.removeColumn">
				<div v-if="sheet.config.removeRow" class="item" @click="useToolsHook.removeRow">
					<Icons icon-name="RemoveRow"></Icons>
					<span>删除行</span>
				</div>
				<div
					v-if="sheet.config.removeColumn"
					class="item"
					@click="useToolsHook.removeColumn"
				>
					<Icons icon-name="RemoveColumn"></Icons>
					<span>删除列</span>
				</div>
			</div>

			<div class="group" v-if="sheet.config.import || sheet.config.export">
				<div v-if="sheet.config.import" class="item import">
					<Icons icon-name="Import"></Icons>
					<span>导入Excel</span>
					<input type="file" @change="onImportClick" />
				</div>
				<div v-if="sheet.config.export" class="item" @click="onExportClick">
					<Icons icon-name="Export"></Icons>
					<span>导出Excel</span>
				</div>
			</div>

			<!-- 锁定解锁 -->
			<div class="group" v-if="sheet.config.lock || sheet.config.unlock">
				<div v-if="sheet.config.lock" class="item" @click="onLockClick">
					<Icons icon-name="CellLock"></Icons>
					<span>锁定</span>
				</div>
				<div v-if="sheet.config.unlock" class="item" @click="onUnlockClick">
					<Icons icon-name="CellUnlock"></Icons>
					<span>解锁</span>
				</div>
			</div>

			<div class="group">
				<div
					class="item"
					@click="useHistoryHook.undo"
					:style="{
						opacity: !useHistoryHook.canUndo() ? 0.3 : 1,
						cursor: !useHistoryHook.canUndo() ? 'not-allowed' : 'pointer',
					}"
				>
					<Icons icon-name="Undo"></Icons>
					<span>撤销</span>
				</div>
			</div>

			<div class="group flx brn"></div>
		</div>

		<!-- Sheet -->
		<div class="sheet" :style="{height: containerHeight}">
			<!-- 字母 -->
			<div
				v-if="enableNumber"
				class="alphabet-placeholder brn bbn"
				:style="{
					width: numberWidth + 'px',
				}"
			></div>
			<div
				ref="alphabetRef"
				class="virtual-sheet custom alphabet brn"
				:style="{
					width: `calc(100% - ${enableFn && fns?.length ? fnWidth : 0}px - ${
						enableNumber ? numberWidth : 0
					}px - ${scrollbarWidth}px)`,
				}"
			>
				<div class="virtual-phantom" :style="{width: totalWidth + 'px'}"></div>
				<div
					class="virtual-content alphabet-cells"
					:style="{
						transform: `translate(${offsetLeft}px, 0)`,
					}"
				>
					<div class="row alphabet-row" @click="onClickAlphabet($event)">
						<template v-for="alphabet of visibleTitles">
							<div
								class="cell alphabet-cell"
								:data-col="alphabet.colIndex"
								:style="{width: alphabet.colWidth + 'px'}"
								:class="{
									selection: useSelectionRangeHook.setSelectionClass(
										null,
										alphabet
									),
								}"
							>
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
									@click.stop
								></div>
							</div>
						</template>
					</div>
				</div>
			</div>
			<div
				class="alphabet-placeholder bln bbn"
				:style="{
					width:
						enableFn && fns?.length
							? fnWidth + scrollbarWidth + 'px'
							: scrollbarWidth + 'px',
				}"
			></div>

			<!-- 序号 -->
			<div
				ref="numberRef"
				class="virtual-sheet custom brn bln"
				v-if="enableNumber"
				:style="{
					width: numberWidth + 'px',
				}"
			>
				<div class="virtual-phantom" :style="{height: totalHeight + 'px'}"></div>
				<div
					class="virtual-content number-cells"
					:style="{
						transform: `translate(0, ${offsetTop}px)`,
						width: `${numberWidth}px`,
					}"
				>
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<div
							class="number-cell"
							:style="{height: `${row.rowHeight}px`}"
							:class="{
								selection: useSelectionRangeHook.setSelectionClass(row),
							}"
							@click="onClickNumber($event, row)"
						>
							<span>{{ row.rowIndex + 1 }}</span>

							<div
								class="resize-handle"
								:class="{
									resizing:
										useResizeHook.isResizing &&
										useResizeHook.resizingRow.value?.rowIndex === row.rowIndex,
								}"
								@mousedown.stop="useResizeHook.startResize(row, $event, 'vertical')"
								@click.stop
							></div>
						</div>
					</template>
				</div>
			</div>

			<!-- 主体 -->
			<div
				ref="containerRef"
				:id="id"
				data-air-sheet-cell
				class="virtual-sheet sheet-main brn"
				@scroll="onScroll"
			>
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
										v-html="useEditHook.formattedValue(cell.value)"
										:data-cell="`${cell.rowIndex}-${cell.colIndex}`"
										:class="{
											merged: isMergedCellStart(cell),
											lock: sheet.config.lockCells[
												`${cell.rowIndex}-${cell.colIndex}`
											],
										}"
										:style="getOffsetStyle(cell)"
										class="cell"
										@dblclick.stop="useEditHook.startEdit($event, cell)"
										@blur="onCellInput($event, cell)"
									></div>
								</div>
								<div
									v-else
									v-html="useEditHook.formattedValue(cell.value)"
									:data-cell="`${cell.rowIndex}-${cell.colIndex}`"
									:class="{
										merged: isMergedCellStart(cell),
										lock: sheet.config.lockCells[
											`${cell.rowIndex}-${cell.colIndex}`
										],
									}"
									:style="getOffsetStyle(cell)"
									@dblclick.stop="useEditHook.startEdit($event, cell)"
									@blur="onCellInput($event, cell)"
									class="cell"
								></div>
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

				<!-- 右键菜单 -->
				<div
					v-show="useMouseRightHook.contextMenuVisible.value"
					class="context-menu shadow-12"
					:style="useMouseRightHook.contextMenuStyle.value"
				>
					<div v-if="sheet.config.addRow" class="menu-item" @click="onAddRowClick">
						<Icons icon-name="AddRow"></Icons>
						<span>添加行</span>
					</div>
					<div v-if="sheet.config.addColumn" class="menu-item" @click="onAddColumnClick">
						<Icons icon-name="AddColumn"></Icons>
						<span>添加列</span>
					</div>
					<div v-if="sheet.config.removeRow" class="menu-item" @click="onRemoveRowClick">
						<Icons icon-name="RemoveRow"></Icons>
						<span>删除行</span>
					</div>
					<div
						v-if="sheet.config.removeColumn"
						class="menu-item"
						@click="onRemoveColumnClick"
					>
						<Icons icon-name="RemoveColumn"></Icons>
						<span>删除列</span>
					</div>
				</div>
			</div>

			<!-- 操作 -->
			<div
				ref="fnRef"
				class="virtual-sheet custom bln"
				v-if="enableFn && fns?.length"
				:style="{
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
							<div
								class="fns"
								:class="{
									selection: useSelectionRangeHook.setSelectionClass(row),
								}"
								:style="{height: `${row.rowHeight}px`}"
							>
								<span
									v-for="fn in fns"
									@click="() => fn.click(row, sheet.celldata.get(row.rowIndex))"
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
		<div class="statusbar" :style="{}">
			<span>总行数: {{ sheet.config.rowCount }}</span>
			<span>总列数: {{ sheet.config.colCount }}</span>
		</div>

		<!-- 遮罩 -->
		<div class="mask" :class="{active: loading}">
			<div>
				<Icons icon-name="Loading" class="loading-animation"></Icons>
				<span>{{ loadingText }}</span>
				<span v-if="loadingProgress !== -1">{{ loadingProgress }}%</span>
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
@use '@/styles/components/air-sheet.scss';
</style>
