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
	onBeforeMount,
	markRaw,
	toRaw,
} from 'vue'

import {ElMessage} from 'element-plus'
import {fonts, fontSize, formatMap, formulaMap} from '@/hooks/sheet/define'
import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSleep} from '@/hooks/useSleep'
import {useDebounce} from '@/hooks/useDebounce'
import AirSheetFilter from './AirSheetFilter.vue'

const stateType = {
	normal: 0,
	loading: 1,
	error: 2,
}

const emits = defineEmits([
	'update:modelValue',
	'cellClick',
	'cellBlur',
	'cellDragOver',
	'cellDrop',
])

// 核心配置参数
const props = defineProps({
	modelValue: {type: Object, default: () => {}},

	// 总行数
	rowCount: {type: Number, default: 40}, // 最大 671087
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
	// fns: {type: Array, default: () => []},

	height: {type: [Number, String], default: 0},

	// 设置状态遮罩完全就由父组件控制
	state: {type: Number, default: 0}, // 0: normal, 1: loading, 2: error
	stateText: {type: String, default: '数据加载中...'},

	limit: {type: Number, default: 30000},
})

// 容器
const id = `air-sheet-${Math.random().toString(16).slice(2)}`
const sheetStore = useAirSheetStore()
const sheet = reactive({})
const isLoading = computed(() => {
	return (
		sheet?.state.loading ||
		sheet?.state.exporting ||
		sheet?.state.importing ||
		sheet?.state.scrolling ||
		props.state === stateType.loading
	)
})

const fns = ref(props.modelValue?.fns || [])

const filterEl = ref(null)
const filterCol = ref([])
const filterColIndex = ref(-1)

// 筛选状态管理
const isFiltered = computed(() => {
	return sheet.config?.filtered && sheet.config.filtered.length > 0
})

const hasFilteredData = computed(() => {
	return sheet.filterCellData && sheet.filterCellData.size > 0
})

// 当前数据源管理
const currentDataSource = computed(() => {
	// 边界情况处理：确保sheet对象存在
	if (!sheet || !sheet.celldata) {
		return new Map()
	}

	// 如果有筛选条件且有筛选数据，使用筛选数据
	if (isFiltered.value && hasFilteredData.value) {
		return sheet.filterCellData
	}
	// 否则使用原始数据
	return sheet.celldata
})

// 当前数据行数
const currentRowCount = computed(() => {
	// 边界情况处理：确保sheet对象存在
	if (!sheet || !sheet.config) {
		return 0
	}

	if (isFiltered.value && hasFilteredData.value) {
		return sheet.filterCellData ? sheet.filterCellData.size : 0
	}
	return sheet.config.rowCount || 0
})

// 行号映射机制
const rowMapping = computed(() => {
	const mapping = {
		filteredToOriginal: new Map(), // 筛选后行号 -> 原始行号
		originalToFiltered: new Map(), // 原始行号 -> 筛选后行号
	}

	if (isFiltered.value && hasFilteredData.value && sheet.rowMapping) {
		// 使用从filterByChecked方法中生成的行号映射数据
		sheet.rowMapping.forEach((item) => {
			mapping.filteredToOriginal.set(item.filteredIndex, item.originalIndex)
			mapping.originalToFiltered.set(item.originalIndex, item.filteredIndex)
		})
	}

	return mapping
})

// 获取原始行号的辅助函数
const getOriginalRowIndex = (filteredRowIndex) => {
	// 边界情况处理：确保参数有效
	if (typeof filteredRowIndex !== 'number' || filteredRowIndex < 0) {
		return 0
	}

	if (!isFiltered.value) return filteredRowIndex
	return rowMapping.value.filteredToOriginal.get(filteredRowIndex) ?? filteredRowIndex
}

// 获取筛选后行号的辅助函数
const getFilteredRowIndex = (originalRowIndex) => {
	if (!isFiltered.value) return originalRowIndex
	return rowMapping.value.originalToFiltered.get(originalRowIndex) ?? -1
}

// 获取行数据的辅助函数，确保在筛选状态下获取正确的数据
const getRowData = (row) => {
	const dataSource = currentDataSource.value
	const dataRowIndex = row.filteredR !== undefined ? row.filteredR : row.r
	return dataSource.get(dataRowIndex)
}

// 检查行是否在当前筛选结果中可见
const isRowVisible = (originalRowIndex) => {
	if (!isFiltered.value) return true
	return getFilteredRowIndex(originalRowIndex) !== -1
}

// 样式操作辅助函数：确保在筛选状态下操作正确的行号
const applyStyleToRow = (displayRow, styleFunction) => {
	// displayRow 是当前显示的行对象，包含 r（原始行号）和 filteredR（筛选行号）
	const originalRowIndex = displayRow.r // 这已经是原始行号了

	// 调用样式函数，传入原始行号
	return styleFunction(originalRowIndex)
}

// 获取单元格操作的正确行号
const getCellOperationRowIndex = (displayRow) => {
	// 返回原始行号，确保样式等操作应用到正确的位置
	return displayRow.r
}

// 移动端设置宽高/框选范围
const selectionSize = ref({w: 0, h: 0})
const selectionRange = ref({
	r: 0,
	c: 0,
	rr: 0,
	cc: 0,
})

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
const loadingProgress = ref(-1)
const containerRef = ref()
const alphabetRef = ref()
const numberRef = ref()
const fnRef = ref()

const full = ref(false)

// 滚动位置
const scrollTop = ref(0)
const scrollLeft = ref(0)

// 计算可视区域大小
const viewportHeight = ref(0)
const viewportWidth = ref(0)

// 保存滚动位置
const savedScrollPosition = ref({top: 0, left: 0})

// 初始数据处理
const initialData = () => {
	if (!props.modelValue?.celldata) return

	if (props.modelValue?.celldata) {
		sheet.config.rowCount = Math.max(props.modelValue.celldata.length, props.rowCount)
		sheet.config.colCount = props.modelValue.celldata
			.map((d) => d.length)
			.reduce((a, b) => Math.max(a, b), props.colCount)
	} else {
		sheet.config.rowCount = Math.min(props.rowCount, 671087)
		sheet.config.colCount = Math.min(props.colCount, 240)
	}

	const celldata = props.modelValue.celldata
	const total = celldata.length

	let processed = 0
	const batchSize = 3000

	sheet.state.loading = true
	sheet.state.msg = '正在加载数据'

	const cellMap = new Map()

	function processBatch() {
		const start = performance.now()
		let count = 0

		while (processed < total && count < batchSize && performance.now() - start < 16) {
			const row = celldata[processed]
			if (row) {
				cellMap.set(processed, toRaw(row))
			}
			processed++
			count++
		}
		sheet.state.progress = Math.floor((processed / total) * 100)

		if (processed < total) {
			requestAnimationFrame(processBatch)
		} else {
			sheet.state.progress = 100
			sheetStore.$patch((state) => {
				state.sheets.get(id).celldata = markRaw(cellMap)
				// sheet.hooks.historyHook.save(cellMap)
			})
			useSleep(250).then(() => {
				sheet.state.loading = false
			})
		}
	}
	requestAnimationFrame(processBatch)
}

// 单元格选中后激活该单元格已有样式
const setActiveTool = computed(() => {
	return (styleKey) => {
		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()

		const data = {
			value: null,
			active: false,
			lock: false,
			fx: false,
			fxVal: '',
		}

		if (!r) {
			return data
		}

		const cellstyle = sheet.config.styled[`${r}-${c}`]
		const isLock = sheet.config.locked[`${r}-${c}`]
		const isFx = sheet.config.formulaed[`${r}-${c}`]

		data.lock = isLock
		data.fx = !!isFx
		data.fxVal = isFx

		if ((r !== rr && c !== cc) || !styleKey || !cellstyle) {
			return data
		}

		data.value = cellstyle[styleKey]
		data.active = Object.keys(cellstyle).includes(styleKey)

		return data
	}
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
let updateVisibleRangeTimeout = null
let updateTimer = null
const updateVisibleRange = async () => {
	try {
		// 修复：统一使用 sheet.config.zoom
		const currentZoom = sheet.config.zoom || 1

		const rowHeights = {}
		const colWidths = {}

		for (const [index, height] of Object.entries(sheet.config.rResize)) {
			rowHeights[index] = height * currentZoom
		}

		for (const [index, width] of Object.entries(sheet.config.cResize)) {
			colWidths[index] = width * currentZoom
		}

		// 确保滚动位置与缩放比例匹配
		const renderData = {
			scrollTop: scrollTop.value,
			scrollLeft: scrollLeft.value,
			viewportHeight: viewportHeight.value,
			viewportWidth: viewportWidth.value,
			// 在筛选状态下使用筛选后的行数，否则使用原始行数
			rowCount: currentRowCount.value,
			colCount: sheet.config.colCount,
			buffer: props.buffer,
			defaultRowHeight: props.rowHeight * currentZoom,
			defaultColWidth: props.colWidth * currentZoom,
			rowHeights,
			colWidths,
			mergedCells: JSON.parse(JSON.stringify(sheet.config.merged)),
			zoom: currentZoom,
		}

		const result = await sheet.hooks.renderHook.getRenderResult(renderData)

		if (result) {
			visibleRangeRef.value = result
			updateVisibleRangeTimeout = setTimeout(() => {
				updateTimer = Date.now()
			}, 100)
		}
	} catch (error) {
		console.error('计算可见范围失败:', error)
	}
}

// 生成可视行数据
const visibleRows = computed(() => {
	const rows = []

	if (!visibleRangeRef.value || !visibleRangeRef.value.visible) return rows
	const {startRow, endRow} = visibleRangeRef.value.visible

	const start = Math.max(0, startRow)

	// 根据是否筛选使用不同的行数限制
	const totalRowCount =
		isFiltered.value && hasFilteredData.value ? currentRowCount.value : sheet.config.rowCount
	const end = Math.min(totalRowCount, endRow)

	for (let i = start; i < end; i++) {
		// 在筛选状态下，i是筛选后的行索引
		// 需要获取对应的原始行号来获取正确的行高
		const originalRowIndex =
			isFiltered.value && hasFilteredData.value ? getOriginalRowIndex(i) : i

		let row = {
			r: originalRowIndex, // 显示原始行号，不是筛选后的行号
			filteredR: i, // 筛选后的行索引，用于数据获取
			originalR: originalRowIndex, // 原始行号，保持兼容性
			h: sheet.hooks.resizeHook.getRowHeight(originalRowIndex),
			config: {},
		}
		rows.push(row)
	}
	return rows
})

// 生成可视列数据
const visibleCells = (row) => {
	const cells = []
	if (!visibleRangeRef.value || !visibleRangeRef.value.visible) return cells
	const {startCol, endCol} = visibleRangeRef.value.visible

	const start = Math.max(0, startCol)
	const end = Math.min(sheet.config.colCount, endCol)

	// 确定要使用的数据源和行索引
	const dataSource = currentDataSource.value
	// 在筛选状态下，使用filteredR来获取数据，否则使用r
	const dataRowIndex =
		isFiltered.value && hasFilteredData.value && row.filteredR !== undefined
			? row.filteredR
			: isFiltered.value && hasFilteredData.value
			? 0
			: row.r

	// 获取行数据
	const rowData = dataSource.get(dataRowIndex)
	if (!rowData) {
		return cells
	}

	for (let i = start; i < end; i++) {
		// 在筛选状态下，需要使用原始行号来检查合并单元格
		const checkRowIndex = row.originalR !== undefined ? row.originalR : row.r
		const mergedCell = sheet.hooks.mergeHook.findMergedCell(checkRowIndex, i)

		let value = null
		let inMerged = false

		if (mergedCell) {
			// 由于后端筛选逻辑已确保合并单元格完整性，这里可以简化处理
			if (mergedCell.r === checkRowIndex && mergedCell.c === i) {
				// 合并单元格起始位置，显示数据
				value = rowData[i] || ''
			} else {
				// 合并单元格内部，不显示数据但保持合并状态
				value = ''
				inMerged = true
			}
		} else {
			// 普通单元格，从行数据中取值
			value = rowData[i] || ''
		}

		cells.push({
			r: row.r, // 始终使用原始行号，确保样式系统正常工作
			filteredR: row.filteredR, // 筛选后的行索引，用于数据获取
			originalR: row.originalR, // 原始行号，保持兼容性
			h: row.h,
			c: i,
			w: sheet.hooks.resizeHook.getColWidth(i),
			v: value,
			config: {
				key: sheet.config.keys?.[i],
			},
			inMerged,
		})
	}

	return cells
}

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

// 计算偏移量
const offsetTop = ref(0)
const offsetLeft = ref(0)

// 滚动条宽度补偿
const scrollbarWidth = ref(0)
const updateOffset = async (type, value) => {
	if (!visibleRangeRef.value || !visibleRangeRef.value.visible || !visibleRangeRef.value.metrics)
		return

	if (type === 'offsetTop') {
		let height = 0
		const startRow = Math.min(visibleRangeRef.value.visible.startRow, sheet.config.rowCount)
		for (let i = 0; i < startRow; i++) {
			height += sheet.hooks.resizeHook.getRowHeight(i)
		}
		offsetTop.value = height
	} else {
		let width = 0
		const startCol = Math.min(visibleRangeRef.value.visible.startCol, sheet.config.colCount)
		for (let i = 0; i < startCol; i++) {
			width += sheet.hooks.resizeHook.getColWidth(i)
		}
		offsetLeft.value = width
	}
}

watch(
	() => visibleRangeRef.value?.visible?.startRow,
	() => updateOffset('offsetTop', 'startRow')
)

watch(
	() => visibleRangeRef.value?.visible?.startCol,
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
	if (!visibleRangeRef.value || !visibleRangeRef.value.visible) return titles

	const {startCol, endCol} = visibleRangeRef.value.visible
	const start = Math.max(0, startCol)
	const end = Math.min(sheet.config.colCount, endCol)

	for (let i = start; i < end; i++) {
		titles.push({
			c: i,
			w: sheet.hooks.resizeHook.getColWidth(i),
			t: getTitle(i),
		})
	}
	return titles
})

const getCellStyle = computed(() => {
	return (cell) => {
		const cellstyle = sheet.config.styled[`${cell.r}-${cell.c}`]
		if (cellstyle) {
			const visibleDom = containerRef.value?.querySelector(
				`[data-cell="${cell.r}-${cell.c}"]`
			)
			if (visibleDom) {
				const {r, c} = sheet.hooks.selectionRangeHook.getRanged()
				const style = sheet.hooks.styleHook.getStyle(cellstyle)
				return style
			}
		}
		return {}
	}
})

// 计算自定义列偏移量（与内容完全对齐）
const getOffsetStyle = (cell) => {
	const style = sheetStore.sheets.get(id)?.hooks?.mergeHook?.getCellStyle(cell, {
		offsetLeft: offsetLeft.value,
		offsetTop: offsetTop.value,
	})

	return style
}

const getCellClass = (cell) => {
	const isLocked = sheet.config.locked[`${cell.r}-${cell.c}`]
	const style = sheet.config.styled[`${cell.r}-${cell.c}`]
	const formula = sheet.config.formulaed[`${cell.r}-${cell.c}`]

	let fmtClass = ''
	switch (style?.fmt) {
		case formatMap.ShortDate:
			fmtClass = 'short-date'
			break
		case formatMap.LongDate:
			fmtClass = 'long-date'
			break
		case formatMap.Time:
			fmtClass = 'time'
			break
		case formatMap.RMB:
			fmtClass = 'rmb'
			break
		default:
			fmtClass = ''
			break
	}
	return {
		lock: isLocked,
		fmt: style?.fmt,
		formula: !!formula,
		[fmtClass]: !!fmtClass,
		merged: isMergedCellStart(cell),
	}
}

const isMergedCellStart = (cell) => {
	const mergedCells = sheet.config.merged
	if (Object.keys(mergedCells).length === 0) {
		return false
	}
	// 在筛选状态下，使用原始行号来检查合并单元格
	const checkRowIndex = cell.originalR !== undefined ? cell.originalR : cell.r
	const key = `${checkRowIndex}-${cell.c}`

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
			if (sheet.config.locked[`${row}-${col}`]) {
				lockedTimer = setTimeout(() => ElMessage.warning(`单元格已锁定`), 300)
				return true
			}
		}
	}

	return false
}

// 滚动处理 - 更新记录的可见行列
let scrollTimer = null
let rafId = null
const lastScroll = ref(false)
const onScroll = async (e) => {
	// 清除之前的定时器和动画帧
	clearTimeout(scrollTimer)
	if (rafId) {
		cancelAnimationFrame(rafId)
	}

	if (sheet.config.rowCount >= props.limit) {
		sheet.state.scrolling = true
		sheet.state.progress = -1
		sheet.state.msg = '数据量较大, 请稍后...'
	}

	const newScrollTop = containerRef.value.scrollTop
	const newScrollLeft = containerRef.value.scrollLeft

	// 在滚动时重置记录的行列位置，这样下次缩放会基于新的位置
	originalFirstVisibleRow = -1
	originalFirstVisibleCol = -1

	const alphabet = alphabetRef.value
	const number = numberRef.value
	const fn = fnRef.value

	lastScroll.value = false

	// 使用 requestAnimationFrame 进行滚动同步
	rafId = requestAnimationFrame(() => {
		scrollTop.value = newScrollTop
		scrollLeft.value = newScrollLeft

		if (number) {
			number.scrollTop = newScrollTop
		}

		if (alphabet) {
			alphabet.scrollLeft = newScrollLeft
		}

		if (fn) {
			fn.scrollTop = newScrollTop
		}

		// 在RAF中立即更新可见范围，提高响应速度
		updateVisibleRange()
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

			if (sheet.config.rowCount >= props.limit) {
				sheet.state.scrolling = false
			}

			// 确保最后一次滚动后也更新可见范围
			updateVisibleRange()
		})
	}, 150)
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
	// 在筛选状态下，我们需要选择原始行号
	// 这样样式操作会应用到正确的原始行上
	// 当清除筛选后，样式会保持在正确的位置
	const rowIndex = row.r // 使用原始行号

	sheet.hooks.selectionRangeHook.setRange(rowIndex, 0, rowIndex, sheet.config.colCount - 1, true)
}

// 点击字母
const onClickAlphabet = async (e, col) => {
	const target = e.target.closest('.alphabet-cell')
	const colIndex = Number(target.getAttribute('data-col'))
	sheet.hooks.selectionRangeHook.setRange(0, colIndex, sheet.config.rowCount - 1, colIndex, true)
}

// 单元格点击
let clickTimer = null
let lastClickTime = 0
const onClickCell = (e, cell) => {
	const now = Date.now()

	// 清除之前的定时器
	clearTimeout(clickTimer)

	// 检查是否是双击（两次点击间隔小于300ms且点击同一个单元格）
	if (now - lastClickTime < 300) {
		// 双击时不触发点击事件，并重置状态
		lastClickTime = 0
		return
	}

	// 记录本次点击
	lastClickTime = now

	// 使用定时器延迟触发点击事件
	clickTimer = setTimeout(() => {
		emits('cellClick', cell)
		// 确保在事件触发后重置状态
		if (now === lastClickTime) {
			lastClickTime = 0
		}
	}, 300)
}

// 单元格编辑失去焦点后
const onCellBlur = (event, cell) => {
	const oldVal = cell.v

	useSleep(16).then(() => {
		const val = sheet.celldata.get(cell.r)?.[cell.c]
		if (val !== oldVal) {
			sheet.hooks.historyHook.save(cell)
		}
	})
}

// 改变缩放比例时
let zoomTimer = null
let originalFirstVisibleRow = -1
let originalFirstVisibleCol = -1
let lastZoom = 1

const onZoomInput = async () => {
	const currentZoom = sheet.config.zoom || 1

	// 如果是第一次缩放，记录当前可视区域的第一行和第一列
	if (originalFirstVisibleRow === -1) {
		// 获取当前可视区域的第一行
		if (visibleRangeRef.value?.visible) {
			originalFirstVisibleRow = visibleRangeRef.value.visible.startRow
			originalFirstVisibleCol = visibleRangeRef.value.visible.startCol
		} else {
			// 如果没有可视区域信息，通过滚动位置计算
			const currentScrollTop = containerRef.value.scrollTop
			const currentScrollLeft = containerRef.value.scrollLeft
			const oldZoom = lastZoom || 1

			// 计算在原始缩放下的滚动位置
			const originalScrollTop = currentScrollTop / oldZoom
			const originalScrollLeft = currentScrollLeft / oldZoom

			// 根据滚动位置计算行列号
			let accumulatedHeight = 0
			let accumulatedWidth = 0

			// 计算第一个可见行
			for (let i = 0; i < sheet.config.rowCount; i++) {
				const rowHeight = sheet.hooks.resizeHook.getRowHeight(i) || props.rowHeight
				if (accumulatedHeight + rowHeight > originalScrollTop) {
					originalFirstVisibleRow = i
					break
				}
				accumulatedHeight += rowHeight
			}

			// 计算第一个可见列
			for (let i = 0; i < sheet.config.colCount; i++) {
				const colWidth = sheet.hooks.resizeHook.getColWidth(i) || props.colWidth
				if (accumulatedWidth + colWidth > originalScrollLeft) {
					originalFirstVisibleCol = i
					break
				}
				accumulatedWidth += colWidth
			}
		}
	}

	// 根据目标行列号计算新的滚动位置
	let newScrollTop = 0
	let newScrollLeft = 0

	// 计算到目标行的累积高度
	for (let i = 0; i < originalFirstVisibleRow && i < sheet.config.rowCount; i++) {
		const rowHeight = (sheet.hooks.resizeHook.getRowHeight(i) || props.rowHeight) * currentZoom
		newScrollTop += rowHeight
	}

	// 计算到目标列的累积宽度
	for (let i = 0; i < originalFirstVisibleCol && i < sheet.config.colCount; i++) {
		const colWidth = (sheet.hooks.resizeHook.getColWidth(i) || props.colWidth) * currentZoom
		newScrollLeft += colWidth
	}

	lastScroll.value = false

	// 等待DOM更新后再设置滚动位置
	await nextTick()

	// 计算最大滚动位置，防止超出边界
	const maxScrollTop = Math.max(
		0,
		containerRef.value.scrollHeight - containerRef.value.clientHeight
	)
	const maxScrollLeft = Math.max(
		0,
		containerRef.value.scrollWidth - containerRef.value.clientWidth
	)

	newScrollTop = Math.min(newScrollTop, maxScrollTop)
	newScrollLeft = Math.min(newScrollLeft, maxScrollLeft)

	requestAnimationFrame(async () => {
		// 同步设置所有滚动容器的位置
		if (containerRef.value) {
			containerRef.value.scrollTop = newScrollTop
			containerRef.value.scrollLeft = newScrollLeft
		}

		if (numberRef.value) {
			numberRef.value.scrollTop = newScrollTop
		}

		if (alphabetRef.value) {
			alphabetRef.value.scrollLeft = newScrollLeft
		}

		if (fnRef.value) {
			fnRef.value.scrollTop = newScrollTop
		}

		// 更新内部滚动状态
		scrollTop.value = newScrollTop
		scrollLeft.value = newScrollLeft

		// 更新偏移量
		await updateOffset('offsetTop', 'startRow')
		await updateOffset('offsetLeft', 'startCol')

		// 更新可视区域
		await updateVisibleRange()

		// 更新最后的缩放比例
		lastZoom = currentZoom
		lastScroll.value = true
	})
}

const onZoomChange = () => {
	// 缩放结束后重置记录的行列位置，为下次缩放做准备
	setTimeout(() => {
		originalFirstVisibleRow = -1
		originalFirstVisibleCol = -1
	}, 100)
}

const onZoomSize = (size) => {
	const currentZoom = sheet.config.zoom || 1

	// 在改变缩放前记录当前的第一个可见行列
	if (originalFirstVisibleRow === -1) {
		if (visibleRangeRef.value?.visible) {
			originalFirstVisibleRow = visibleRangeRef.value.visible.startRow
			originalFirstVisibleCol = visibleRangeRef.value.visible.startCol
		}
	}

	let newZoom = currentZoom + size

	// 限制缩放比例在 0.5~3 之间
	if (newZoom < 0.5) {
		newZoom = 0.5
	} else if (newZoom > 3) {
		newZoom = 3
	}

	sheet.config.zoom = newZoom
	onZoomInput()
}

const onZoomReset = async () => {
	const currentZoom = sheet.config.zoom || 1

	// 在重置前记录当前的第一个可见行列
	if (originalFirstVisibleRow === -1) {
		if (visibleRangeRef.value?.visible) {
			originalFirstVisibleRow = visibleRangeRef.value.visible.startRow
			originalFirstVisibleCol = visibleRangeRef.value.visible.startCol
		}
	}

	sheet.config.zoom = 1
	await onZoomInput()

	// 重置完成后清除记录的位置
	setTimeout(() => {
		originalFirstVisibleRow = -1
		originalFirstVisibleCol = -1
		lastZoom = 1
	}, 200)
}

// 文本框输入
const inputCache = new Map()
const inputCacheCell = []
const onInput = (e) => {
	const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
	for (let i = r; i <= rr; i++) {
		for (let j = c; j <= cc; j++) {
			if (!inputCache.has(`${i}-${j}`)) {
				const v = sheet.celldata.get(i)[j]
				inputCache.set(`${i}-${j}`, v)
				inputCacheCell.push({
					c: j,
					r: i,
					v,
				})
			}
			sheet.hooks.editHook.setCellValue(i, j, e.target.value)
		}
	}
	useDebounce(
		() => {
			sheet.hooks.editHook.setFormulaValue()
			sheet.hooks.editHook.setRowHeight(null, null)
		},
		250,
		'onInputTextarea'
	)()
}

const onInputBlur = () => {
	sheet.hooks.historyHook.save(inputCacheCell.filter(Boolean))
	inputCache.clear()
	inputCacheCell.length = 0
}

// 拖拽到单元格时
let dropCell = null
const onCellcellDragOver = (event) => {
	event.preventDefault()
	dropCell = useSelectionRangeHook.getRangeByMouse(event)
	emits('cellDragOver', dropCell)
}

const onCellDrop = (event) => {
	event.preventDefault()
	emits('cellDrop', dropCell)
	dropCell = null
}

const init = () => {
	initialData()
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

		// 加入拖拽到单元格的监听
		containerRef.value.addEventListener('cellDragOver', onCellcellDragOver)
		containerRef.value.addEventListener('drop', onCellDrop)
	})
}

const destroy = () => {
	window.removeEventListener('resize', updateViewportSize)
}

// 判断是否为移动设备
const isMobile = () => {
	// 检查是否支持触摸事件
	const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0

	// 检查屏幕宽度是否小于768px（平板/手机）
	const isSmallScreen = window.innerWidth < 768

	// 检查userAgent是否包含移动设备标识
	const ua = navigator.userAgent.toLowerCase()
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(ua)

	return hasTouchSupport && (isSmallScreen || isMobileUA)
}

// 移动端设置框选
const mobileRCReadOnly = computed(() => {
	const {r, c, rr, cc} = selectionRange.value
	return !(r === rr && c === cc)
})

const setSelectionRange = () => {
	const {r, rr, c, cc} = selectionRange.value
	if (r > rr) {
		ElMessage.error('开始行不能大于结束行')
		return
	}

	if (rr < r) {
		ElMessage.error('结束行不能小于开始行')
		return
	}

	if (c > cc) {
		ElMessage.error('开始列不能大于结束列')
		return
	}

	if (cc < c) {
		ElMessage.error('结束列不能小于开始列')
		return
	}

	if (r < 1) {
		ElMessage.error('开始行不能小于1')
		return
	}

	if (rr > sheet.config.rowCount) {
		ElMessage.error('结束行不能大于总行数')
		return
	}

	if (c < 1) {
		ElMessage.error('开始列不能小于1')
		return
	}

	if (cc > sheet.config.colCount) {
		ElMessage.error('结束列不能大于总列数')
		return
	}

	if (!r || !rr || !c || !cc) {
		return
	}

	sheet.hooks.selectionRangeHook.setRange(r - 1, c - 1, rr - 1, cc - 1, true)
}

const mobileSetRowHeight = (e) => {
	const {r, c} = selectionRange.value
	sheet.hooks.resizeHook.setRowHeight(r, e.target.value)

	// useSelectionRangeHook.setRange(r - 1, c - 1, r - 1, c - 1, true)
}

const mobileSetColWidth = (e) => {
	const {r, c} = selectionRange.value
	sheet.hooks.resizeHook.setColWidth(c, e.target.value)
	// useSelectionRangeHook.setRange(r - 1, c - 1, r - 1, c - 1, true)
}

// 判断移动端是否横向
const isLandscape = () => {
	if (isMobile()) {
		return window.innerWidth > window.innerHeight
	}
	return false
}

let originalParent = null
let originalSheet = null
const onFull = async () => {
	// 在全屏切换前保存当前滚动位置
	if (containerRef.value) {
		savedScrollPosition.value = {
			top: containerRef.value.scrollTop,
			left: containerRef.value.scrollLeft,
		}
		console.log('AirSheet - 全屏切换前保存滚动位置:', savedScrollPosition.value)
	}

	full.value = !full.value

	if (full.value) {
		// 进入全屏模式
		const sheetComponentEl = containerRef.value.closest('.air-sheet-component')
		if (sheetComponentEl) {
			originalSheet = sheetComponentEl
			originalParent = sheetComponentEl.parentNode
			document.body.appendChild(sheetComponentEl)
		}
	} else if (originalParent && originalSheet) {
		// 退出全屏模式
		originalParent.appendChild(originalSheet)
		originalParent = null
		originalSheet = null
	}

	// 等待DOM更新完成后恢复滚动位置
	await nextTick()

	// 恢复滚动位置到所有相关容器
	restoreScrollPosition()

	console.log('AirSheet - 全屏切换完成，滚动位置已恢复')
}

const onFilter = async (e, alphabet) => {
	// console.log('AirSheet - 筛选面板打开:', {
	// 	列信息: alphabet,
	// 	列索引: alphabet.c,
	// 	当前筛选状态: sheet?.config?.filtered || [],
	// })

	filterEl.value = e.target.closest('.touch-filter')
	filterCol.value.length = 0
	filterCol.value = await sheet.hooks.toolsHook.filterCol(alphabet)
	filterColIndex.value = alphabet.c

	// console.log('AirSheet - 筛选数据获取完成:', {
	// 	列索引: filterColIndex.value,
	// 	筛选数据数量: filterCol.value?.length || 0,
	// })
}

watch(
	() => sheetStore.getSheet(id),
	(newVal) => {
		if (sheet.hooks?.resizeHook?.isResizing) return

		Object.assign(sheet, newVal)
		useDebounce(
			() => {
				console.log('updated AirSheet', newVal)
				updateVisibleRange()
			},
			150,
			'airSheetLogs'
		)()
	},
	{deep: true}
)

// 配置变化处理
watch(
	() => props.modelValue?.config,
	(newVal) => {
		sheet.config = Object.assign(sheet.config, newVal)
		const mc = newVal.merged
		if (Object.keys(mc).length > 0) {
			Object.entries(mc).forEach(([key, value]) => {
				const [r, c] = key.split('-').map(Number)
				const {rs, cs} = value
				sheet.hooks.mergeHook.setMerge(r, c, rs, cs, false)
			})
		}
	}
)

// 数据变化处理
watch(
	() => props.modelValue?.celldata,
	(newVal) => {
		// sheet.celldata = new Map(newVal)
		// initialData()
	}
)

// watch(
// 	() => sheet.hooks.selectionRangeHook?.ranged,
// 	(newVal) => {
// 		if (newVal) {
// 			const {start, end} = newVal
// 			selectionSize.value = {
// 				w: sheet.hooks.resizeHook.getColWidth(start.col),
// 				h: sheet.hooks.resizeHook.getRowHeight(start.row),
// 			}
// 			selectionRange.value = {
// 				r: start.row + 1,
// 				rr: end.row + 1,
// 				c: start.col + 1,
// 				cc: end.col + 1,
// 			}
// 		}
// 	},
// 	{deep: true}
// )

onBeforeMount(() => {})

// 初始化
onMounted(() => {
	sheetStore.init(id, props, () => init())
})

onActivated(() => {})

onDeactivated(() => {
	if (containerRef.value) {
		savedScrollPosition.value = {
			top: containerRef.value.scrollTop,
			left: containerRef.value.scrollLeft,
		}
	}
	destroy()
})

onUnmounted(() => {
	destroy()
})

defineExpose({
	destroy,
	setRange: (...arg) => sheet.hooks.selectionRangeHook.setRange(...arg),
	setMerge: (...arg) => sheet.hooks.mergeHook.setMerge(...arg),
	setCellValue: (...arg) => sheet.hooks.editHook.setCellValue(...arg),
	setLocked: (...arg) => sheet.hooks.toolsHook.setLocked(...arg),
	setUnlocked: (...arg) => sheet.hooks.toolsHook.setUnlocked(...arg),
	importExcel: (...arg) => sheet.hooks.toolsHook.readExcelFile(...arg),
	exportExcel: (...arg) => sheet.hooks.toolsHook.exportExcel(...arg),

	setCellBackground: (row, col, rowspan, colspan, color) => {
		sheet.hooks.toolsHook.setCellStyle({
			type: 'bg',
			value: color,
			row,
			col,
			rowspan,
			colspan,
		})
	},

	getSheet: () => sheet,
	getSheetData: () => JSON.parse(JSON.stringify([...sheet.celldata])),

	luckyToAir: async (config, data) => await sheet.hooks?.toolsHook?.luckyToAir(config, data),
	airToLucky: async () => await sheet.hooks?.toolsHook?.airToLucky(sheet),
})
</script>
<template>
	<div
		class="air-sheet-component"
		:style="{height: containerHeight}"
		:class="{mobile: isMobile(), full: full, btn: !sheetStore.getSheet(id)?.config.showToolBar}"
	>
		<template v-if="sheet?.state?.completed">
			<!-- 工具栏 -->
			<div
				v-if="
					sheet.config.showToolBar &&
					((isMobile() && isLandscape()) ||
						!isMobile() ||
						!sheet.config.showHorizontalScreen)
				"
				class="toolbar"
				:class="{mobile: isMobile()}"
				:style="{}"
			>
				<div v-if="sheet.config.font" class="group font-layout h-full">
					<div class="item font">
						<div>
							<!-- 字体 -->
							<select
								:value="setActiveTool('ff').value || 'FZSSJW, sans-serif'"
								@change="sheet.hooks.toolsHook.setFont($event)"
							>
								<option
									v-for="[key, value] of Object.entries(fonts)"
									:key="value"
									:value="value"
								>
									{{ key }}
								</option>
							</select>
							<!-- 字号 -->
							<select
								:value="setActiveTool('fs').value || 13"
								@change="sheet.hooks.toolsHook.setFontSize($event, containerRef)"
							>
								<option v-for="size in fontSize" :key="size" :value="size">
									{{ size }}
								</option>
							</select>
						</div>
						<!-- 格式 -->
						<select
							:value="setActiveTool('fmt').value || formatMap.Normal"
							@change.stop="
								($event) => {
									sheet.hooks.toolsHook.setFormat($event, containerRef)
								}
							"
						>
							<option
								v-for="[key, value] of Object.entries(formatMap)"
								:key="key"
								:value="value"
							>
								{{ value }}
							</option>
						</select>
					</div>
				</div>

				<div v-if="sheet.config.color || sheet.config.fill" class="group">
					<div
						v-if="sheet.config.color"
						class="item color"
						:class="{active: setActiveTool('fc').active}"
					>
						<Icons name="Font"></Icons>
						<span>颜色</span>
						<input
							type="color"
							@input="sheet.hooks.toolsHook.setFontColor($event)"
							@change="sheet.hooks.toolsHook.fontColorChanged($event)"
						/>
					</div>
					<div
						v-if="sheet.config.fill"
						class="item color"
						:class="{active: setActiveTool('bg').active}"
					>
						<Icons name="FillColor"></Icons>
						<span class="fill-color">填充</span>
						<input
							type="color"
							@input="sheet.hooks.toolsHook.setFillColor($event)"
							@change="sheet.hooks.toolsHook.fillColorChanged($event)"
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
					<div
						v-if="sheet.config.bold"
						class="item"
						:class="{active: setActiveTool('bold').active}"
						@click="sheet.hooks.toolsHook.setBold"
					>
						<Icons name="Bold"></Icons>
						<span>加粗</span>
					</div>
					<div
						v-if="sheet.config.italic"
						class="item"
						:class="{active: setActiveTool('it').active}"
						@click="sheet.hooks.toolsHook.setItalic"
					>
						<Icons name="Italic"></Icons>
						<span>倾斜</span>
					</div>
					<div
						v-if="sheet.config.underline"
						class="item"
						:class="{active: setActiveTool('un').active}"
						@click="sheet.hooks.toolsHook.setUnderline"
					>
						<Icons name="Underline"></Icons>
						<span>下划线</span>
					</div>
					<div
						v-if="sheet.config.strikethrough"
						class="item"
						:class="{active: setActiveTool('st').active}"
						@click="sheet.hooks.toolsHook.setStrikethrough"
					>
						<Icons name="Strikethrough"></Icons>
						<span>删除线</span>
					</div>
				</div>

				<div class="group" v-if="sheet.config.align">
					<div
						class="item"
						:class="{active: setActiveTool('align').value === 'left'}"
						@click="sheet.hooks.toolsHook.setAlign('left')"
					>
						<Icons name="AlignLeft"></Icons>
						<span>左对齐</span>
					</div>
					<div
						class="item"
						:class="{active: setActiveTool('align').value === 'center'}"
						@click="sheet.hooks.toolsHook.setAlign('center')"
					>
						<Icons name="AlignCenter"></Icons>
						<span>居中</span>
					</div>
					<div
						class="item"
						:class="{active: setActiveTool('align').value === 'right'}"
						@click="sheet.hooks.toolsHook.setAlign('right')"
					>
						<Icons name="AlignRight"></Icons>
						<span>右对齐</span>
					</div>
				</div>

				<div class="group" v-if="sheet.config.merged">
					<div class="item" @click="sheet.hooks.toolsHook.setMerge()">
						<Icons name="Merge"></Icons>
						<span>合并</span>
					</div>
				</div>

				<!-- 边框 -->
				<template v-if="!isMobile()">
					<div class="group group-merge" v-if="sheet.config.border">
						<div
							class="item"
							:class="{
								active:
									setActiveTool('bl').active ||
									setActiveTool('bt').active ||
									setActiveTool('br').active ||
									setActiveTool('bb').active,
							}"
							@click="sheet.hooks.toolsHook.setBorder()"
						>
							<Icons name="Border"></Icons>
							<span>边框</span>
						</div>
						<div class="merge border-merge shadow-12">
							<div class="item" @click="sheet.hooks.toolsHook.setBorder(false)">
								<Icons name="UnBorder"></Icons>
								<span>无边框</span>
							</div>
							<div
								class="item"
								:class="{
									active: setActiveTool('bt').active,
								}"
								@click="sheet.hooks.toolsHook.setBorder(null, 'top')"
							>
								<Icons name="BorderTop"></Icons>
								<span>上边框</span>
							</div>
							<div
								class="item"
								:class="{
									active: setActiveTool('bb').active,
								}"
								@click="sheet.hooks.toolsHook.setBorder(null, 'bottom')"
							>
								<Icons name="BorderBottom"></Icons>
								<span>下边框</span>
							</div>
							<div
								class="item"
								:class="{
									active: setActiveTool('bl').active,
								}"
								@click="sheet.hooks.toolsHook.setBorder(null, 'left')"
							>
								<Icons name="BorderLeft"></Icons>
								<span>左边框</span>
							</div>
							<div
								class="item"
								:class="{
									active: setActiveTool('br').active,
								}"
								@click="sheet.hooks.toolsHook.setBorder(null, 'right')"
							>
								<Icons name="BorderRight"></Icons>
								<span>右边框</span>
							</div>
							<div
								class="item border-color"
								@click="sheet.hooks.toolsHook.setBorderColor"
							>
								<Icons name="BorderColor"></Icons>
								<span>颜色</span>
								<input
									type="color"
									@input="sheet.hooks.toolsHook.setBorderColor($event)"
									@change="sheet.hooks.toolsHook.borderColorChanged"
								/>
							</div>
						</div>
					</div>
				</template>
				<template v-else>
					<div class="group" v-if="sheet.config.border">
						<div class="item" @click="sheet.hooks.toolsHook.setBorder()">
							<Icons name="Border"></Icons>
							<span>边框</span>
						</div>

						<div class="item" @click="sheet.hooks.toolsHook.setBorder(false)">
							<Icons name="UnBorder"></Icons>
							<span>无边框</span>
						</div>
						<div class="item" @click="sheet.hooks.toolsHook.setBorder(null, 'top')">
							<Icons name="BorderTop"></Icons>
							<span>上边框</span>
						</div>
						<div class="item" @click="sheet.hooks.toolsHook.setBorder(null, 'bottom')">
							<Icons name="BorderBottom"></Icons>
							<span>下边框</span>
						</div>
						<div class="item" @click="sheet.hooks.toolsHook.setBorder(null, 'left')">
							<Icons name="BorderLeft"></Icons>
							<span>左边框</span>
						</div>
						<div class="item" @click="sheet.hooks.toolsHook.setBorder(null, 'right')">
							<Icons name="BorderRight"></Icons>
							<span>右边框</span>
						</div>
						<div
							class="item border-color"
							@click="sheet.hooks.toolsHook.setBorderColor"
						>
							<Icons name="BorderColor"></Icons>
							<span>颜色</span>
							<input
								type="color"
								@input="sheet.hooks.toolsHook.setBorderColor($event)"
								@change="sheet.hooks.toolsHook.borderColorChanged"
							/>
						</div>
					</div>
				</template>

				<div v-if="sheet.config.addRow" class="group" :class="{'group-merge': !isMobile()}">
					<div class="item" @click="sheet.hooks.toolsHook.addRow($event, false)">
						<Icons name="AddRow"></Icons>
						<span>添加行</span>
					</div>

					<div v-if="!isMobile()" class="merge add-row-merge shadow-12">
						<input
							v-model.number="sheet.hooks.toolsHook.addRowCount"
							type="number"
							min="1"
							value="1"
						/>
					</div>
				</div>

				<div
					v-if="sheet.config.addColumn"
					class="group"
					:class="{'group-merge': !isMobile()}"
				>
					<div
						v-if="sheet.config.addColumn"
						class="item"
						@click="sheet.hooks.toolsHook.addColumn($event, false)"
					>
						<Icons name="AddColumn"></Icons>
						<span>添加列</span>
					</div>
					<div v-if="!isMobile()" class="merge add-column-merge shadow-12">
						<input
							v-model.number="sheet.hooks.toolsHook.addColumnCount"
							type="number"
							min="1"
							value="1"
						/>
					</div>
				</div>

				<div class="group" v-if="sheet.config.removeRow || sheet.config.removeColumn">
					<div
						v-if="sheet.config.removeRow"
						class="item"
						@click="sheet.hooks.toolsHook.removeRow"
					>
						<Icons name="RemoveRow"></Icons>
						<span>删除行</span>
					</div>
					<div
						v-if="sheet.config.removeColumn"
						class="item"
						@click="sheet.hooks.toolsHook.removeColumn"
					>
						<Icons name="RemoveColumn"></Icons>
						<span>删除列</span>
					</div>
				</div>

				<div class="group" v-if="sheet.config.import || sheet.config.export">
					<div v-if="sheet.config.import" class="item import">
						<Icons name="Import"></Icons>
						<span>导入</span>
						<input type="file" @change="sheet.hooks.toolsHook.importExcel" />
					</div>
					<div
						v-if="sheet.config.export"
						class="item"
						@click="sheet.hooks.toolsHook.exportExcel"
					>
						<Icons name="Export"></Icons>
						<span>导出</span>
					</div>
				</div>

				<!-- 锁定解锁 -->
				<div class="group" v-if="sheet.config.locked || sheet.config.unlock">
					<div
						v-if="sheet.config.locked"
						class="item"
						:class="{active: setActiveTool('lock').lock}"
						@click="sheet.hooks.toolsHook.setLocked"
					>
						<Icons name="lock"></Icons>
						<span>锁定</span>
					</div>
					<div
						v-if="sheet.config.unlock"
						class="item"
						@click="sheet.hooks.toolsHook.setUnlocked"
					>
						<Icons name="CellUnlock"></Icons>
						<span>解锁</span>
					</div>
				</div>

				<!-- 公式 -->
				<div
					class="group"
					v-if="sheet.config.formulaed"
					:class="{'group-merge': !isMobile()}"
				>
					<div class="item" :class="{active: setActiveTool('formula').fx}">
						<Icons name="Sum"></Icons>
						<span>公式</span>
					</div>
					<div v-if="!isMobile()" class="merge formula-merge shadow-12">
						<div
							class="item"
							:class="{active: setActiveTool('formula').fxVal?.includes('SUM')}"
							@click="sheet.hooks.editHook.setCellFormula('SUM')"
						>
							<Icons name="Fx"></Icons>
							<span>求和</span>
						</div>
						<div
							class="item"
							:class="{
								active: setActiveTool('formula').fxVal?.includes('AVERAGE'),
							}"
							@click="sheet.hooks.editHook.setCellFormula('AVERAGE')"
						>
							<Icons name="Fx"></Icons>
							<span>平均值</span>
						</div>
						<div
							class="item"
							:class="{active: setActiveTool('formula').fxVal?.includes('MAX')}"
							@click="sheet.hooks.editHook.setCellFormula('MAX')"
						>
							<Icons name="Fx"></Icons>
							<span>最大值</span>
						</div>
						<div
							class="item"
							:class="{active: setActiveTool('formula').fxVal?.includes('MIN')}"
							@click="sheet.hooks.editHook.setCellFormula('MIN')"
						>
							<Icons name="Fx"></Icons>
							<span>最小值</span>
						</div>
					</div>
				</div>

				<!-- 筛选、查找 -->
				<div class="group" v-if="sheet.config.filter || sheet.config.find">
					<div class="item">
						<Icons name="Filter"></Icons>
						<span>筛选</span>
					</div>
					<div class="item">
						<Icons name="Search"></Icons>
						<span>查找</span>
					</div>
				</div>

				<!-- 全屏 -->
				<div v-if="sheet.config.full" class="group" :class="{'group-merge': !isMobile()}">
					<div class="item" @click="onFull">
						<Icons :name="full ? 'FullExit' : 'Full'"></Icons>
						<span>{{ full ? '退出' : '全屏' }}</span>
					</div>
				</div>

				<!-- 冻结 -->
				<div v-if="sheet.config.freeze" class="group" :class="{'group-merge': !isMobile()}">
					<div class="item" @click="sheet.hooks.toolsHook.setFreeze">
						<Icons name="Freeze"></Icons>
						<span>冻结</span>
					</div>
					<div v-if="!isMobile()" class="merge freeze-merge shadow-12">
						<span>行</span>
						<input
							type="number"
							v-model.number="sheet.hooks.toolsHook.freezeRow.value"
						/>
						&nbsp;
						<span>列</span>
						<input
							type="number"
							v-model.number="sheet.hooks.toolsHook.freezeCol.value"
						/>
					</div>
				</div>

				<div class="group">
					<div class="item" @click="sheet.hooks.toolsHook.clearAll">
						<Icons name="Clear3"></Icons>
						<span>清除</span>
					</div>
				</div>

				<div class="group">
					<div
						class="item"
						@click="
							() => {
								sheet.hooks.historyHook.undo(() => {
									sheet.hooks.editHook.setFormulaValue()
								})
							}
						"
						:style="{
							opacity: !sheet.hooks.historyHook.canUndo() ? 0.3 : 1,
							cursor: !sheet.hooks.historyHook.canUndo() ? 'not-allowed' : 'pointer',
						}"
					>
						<Icons name="Undo"></Icons>
						<span>撤销</span>
					</div>
				</div>

				<div class="group flx brn"></div>
			</div>

			<div v-if="sheet.config.edit" class="inputbar">
				<textarea
					v-model="sheet.hooks.editHook.inputValue"
					:disabled="setActiveTool('lock').lock"
					@input="onInput"
					@blur="onInputBlur"
					@keydown.stop
					@keyup.stop
					@paste.stop
				/>
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
					<div
						class="virtual-phantom"
						:style="{width: visibleRangeRef?.metrics?.totalWidth + 'px'}"
					></div>

					<!-- 主体字母 -->
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
									:data-col="alphabet.c"
									:style="{width: alphabet.w + 'px'}"
									:class="{
										selection: sheet.hooks.selectionRangeHook.setSelectionClass(
											null,
											alphabet
										),
									}"
								>
									<span>{{ alphabet.t }}</span>

									<div
										v-if="!isMobile()"
										class="resize-handle"
										:class="{
											resizing:
												sheet.hooks.resizeHook.isResizing &&
												sheet.hooks.resizeHook.resizingCol?.c ===
													alphabet.c,
										}"
										@mousedown.stop="
											sheet.hooks.resizeHook.startResize(
												alphabet,
												$event,
												'horizontal'
											)
										"
										@click.stop
									></div>

									<!-- 筛选 -->
									<div
										class="touch-filter"
										@click.stop="onFilter($event, alphabet)"
									>
										<Icons name="ArrowRight" />
									</div>
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
					<div
						class="virtual-phantom"
						:style="{height: visibleRangeRef?.metrics?.totalHeight + 'px'}"
					></div>

					<!-- 主体序号 -->
					<div
						class="virtual-content number-cells"
						:style="{
							fontSize: `${sheet.config.zoom < 1 ? 13 * sheet.config.zoom : 13}px`,
							transform: `translate(0, ${offsetTop}px)`,
							width: `${numberWidth}px`,
						}"
					>
						<template v-for="row of visibleRows" :key="row.r">
							<div
								class="number-cell"
								:style="{height: `${row.h}px`, width: `${numberWidth}px`}"
								:class="{
									selection:
										sheet.hooks.selectionRangeHook.setSelectionClass(row),
								}"
								@click="onClickNumber($event, row)"
							>
								<span>{{ row.r + 1 }}</span>

								<div
									v-if="!isMobile()"
									class="resize-handle"
									:class="{
										resizing:
											sheet.hooks.resizeHook.isResizing &&
											sheet.hooks.resizeHook.resizingRow?.r === row.r,
									}"
									@mousedown.stop="
										sheet.hooks.resizeHook.startResize(row, $event, 'vertical')
									"
									@click.stop
								></div>
							</div>
						</template>
						<div :style="{height: scrollbarWidth + 'px'}"></div>
					</div>
				</div>

				<!-- 主体 -->
				<div
					ref="containerRef"
					:id="id"
					data-air-sheet-cell
					class="virtual-sheet sheet-main brn"
					@scroll="onScroll"
					:style="{
						fontSize: `${13 * sheet.config.zoom}px`,
					}"
				>
					<!-- 虚拟滚动占位 -->
					<div
						class="virtual-phantom"
						:style="{
							height: visibleRangeRef?.metrics?.totalHeight + 'px',
							width: visibleRangeRef?.metrics?.totalWidth + 'px',
						}"
					></div>

					<!-- 单元格 -->
					<div
						class="virtual-content"
						:style="{
							transform: `translate(${offsetLeft}px, ${offsetTop}px)`,
						}"
					>
						<!-- 只渲染可视区域的单元格 -->
						<template v-for="row of visibleRows" :key="row.r">
							<div
								v-if="
									row.config.hasOwnProperty('filter') ? row.config.filter : true
								"
								class="row"
								:data-row="row.r"
								:style="{height: `${row.h}px`}"
							>
								<template v-for="cell of visibleCells(row)" :key="cell.c">
									<div
										v-if="isMergedCellStart(cell)"
										class="cell merged-cell-placeholder"
										:style="{
											height: `${cell.h}px`,
											width: `${cell.w}px`,
										}"
									>
										<div
											v-html="
												sheet.hooks.editHook.formattedValue(cell.v, cell)
											"
											:data-cell="`${cell.r}-${cell.c}`"
											:class="getCellClass(cell)"
											:style="{
												...getOffsetStyle(cell),
												...getCellStyle(cell),
											}"
											class="cell"
											@dblclick.stop="
												sheet.hooks.editHook.startEdit($event, cell)
											"
											@blur="onCellBlur($event, cell)"
										></div>
									</div>
									<div
										v-else
										v-html="sheet.hooks.editHook.formattedValue(cell.v, cell)"
										:data-cell="`${cell.r}-${cell.c}`"
										:class="[
											getCellClass(cell),
											cell.inMerged ? 'in-merged' : '',
										]"
										:style="{
											...getOffsetStyle(cell),
											...getCellStyle(cell),
										}"
										@click="onClickCell($event, cell)"
										@dblclick.stop="
											sheet.hooks.editHook.startEdit($event, cell)
										"
										@blur="onCellBlur($event, cell)"
										class="cell"
									></div>
								</template>
							</div>
						</template>
					</div>

					<!-- 选区框、选区背景 -->
					<div
						v-if="
							sheet.hooks?.selectionRangeHook?.selecting ||
							sheet.hooks?.selectionRangeHook?.ranged
						"
						class="selection-box"
						:class="sheet.hooks?.selectionRangeHook?.rangeClass"
						:style="sheet.hooks?.selectionRangeHook?.rangeStyle"
					>
						<div
							v-if="sheet.hooks?.selectionRangeHook?.ranged"
							class="selection-handle"
							@mousedown.stop="sheet.hooks?.selectionRangeHook?.drag"
						></div>
					</div>
					<div
						v-if="
							sheet.hooks?.selectionRangeHook?.selecting ||
							sheet.hooks?.selectionRangeHook?.ranged
						"
						class="selection-bg-box"
						:class="sheet.hooks?.selectionRangeHook?.rangeClass"
						:style="sheet.hooks?.selectionRangeHook?.rangeStyle"
					></div>

					<!-- 高亮在线 -->
					<div
						:key="`${updateTimer + index}`"
						v-for="(item, index) of sheet.config?.onlineCell"
						class="highlight"
						:style="sheet.hooks?.selectionRangeHook?.setHighlightRange(item)"
					>
						<div class="label">{{ item.name }}</div>
					</div>

					<!-- 右键菜单 -->
					<div
						v-show="sheet.hooks.contextMenuHook.contextMenuVisible"
						class="context-menu shadow-12"
						:style="sheet.hooks.contextMenuHook.contextMenuStyle"
					>
						<div
							v-if="sheet.config.addRow"
							class="menu-item"
							@click="sheet.hooks.toolsHook.addRow($event, false)"
						>
							<Icons name="AddRow"></Icons>
							<span>添加行</span>
						</div>
						<div
							v-if="sheet.config.addColumn"
							class="menu-item"
							@click="sheet.hooks.toolsHook.addColumn($event, false)"
						>
							<Icons name="AddColumn"></Icons>
							<span>添加列</span>
						</div>
						<div
							v-if="sheet.config.removeRow"
							class="menu-item"
							@click="sheet.hooks.toolsHook.removeRow"
						>
							<Icons name="RemoveRow"></Icons>
							<span>删除行</span>
						</div>
						<div
							v-if="sheet.config.removeColumn"
							class="menu-item"
							@click="sheet.hooks.toolsHook.removeColumn"
						>
							<Icons name="RemoveColumn"></Icons>
							<span>删除列</span>
						</div>
						<div
							v-if="sheet.config.paste"
							class="menu-item"
							@click="sheet.hooks.copyHook.cutSelectedCells"
						>
							<Icons name="Cut"></Icons>
							<span>剪切</span>
						</div>

						<div
							v-if="sheet.config.paste"
							class="menu-item"
							@click="sheet.hooks.copyHook.copySelectedCells"
						>
							<Icons name="Copy"></Icons>
							<span>复制</span>
						</div>
						<div
							v-if="sheet.config.copy"
							class="menu-item"
							@click="sheet.hooks.copyHook.paste"
						>
							<Icons name="Paste"></Icons>
							<span>粘贴</span>
						</div>
					</div>

					<!-- 公式菜单 -->
					<div
						v-if="sheet.hooks.editHook.isFormula && sheet.config.edit"
						class="context-menu shadow-12"
						:style="{...sheet.hooks.editHook.formulaStyle, width: '145px'}"
					>
						<div
							class="menu-item"
							v-for="(value, key) of formulaMap"
							:key="key"
							@click="sheet.hooks.editHook.setCellFormula(key, value)"
						>
							<Icons name="Fx" />
							<span>{{ value }}</span>
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
					<div
						class="virtual-phantom"
						:style="{height: visibleRangeRef?.metrics?.totalHeight + 'px'}"
					></div>
					<div
						class="virtual-content"
						:style="{
							transform: `translate(0, ${offsetTop}px)`,
							width: `${fnWidth}px`,
						}"
					>
						<template v-for="row of visibleRows" :key="row.r">
							<slot name="fn" :row="row">
								<div
									class="fns"
									:class="{
										selection:
											sheet.hooks.selectionRangeHook.setSelectionClass(row),
									}"
									:style="{height: `${row.h}px`}"
								>
									<span
										v-for="fn in fns"
										@click="
											() =>
												fn.click(
													row,
													currentDataSource.get(
														row.filteredR !== undefined
															? row.filteredR
															: row.r
													)
												)
										"
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
					v-if="sheet.hooks.resizeHook.isResizing && sheet.hooks.resizeHook.resizingRow"
					class="grid-lines-row"
					:style="{
						width: visibleRangeRef?.metrics?.totalWidth + 'px',
					}"
				></div>

				<!-- 列辅助线 -->
				<div
					v-if="sheet.hooks.resizeHook.isResizing && sheet.hooks.resizeHook.resizingCol"
					class="grid-lines-col"
					:style="{
						height: visibleRangeRef?.metrics?.totalHeight + 'px',
					}"
				></div>
				<!-- 滚动渲染提示, 数据小于限制时显示 -->
				<div class="scroll-tip" v-if="!lastScroll && sheet.config.rowCount < limit">
					<Icons name="Loading" class="loading-animation" />
				</div>
			</div>

			<!-- 移动端设置框选 -->
			<div
				v-if="isMobile() && sheet.config.edit"
				class="mobile-selection"
				@keydown.stop
				@click.stop
			>
				<div>
					行高
					<input
						:disabled="mobileRCReadOnly"
						type="number"
						v-model="selectionSize.h"
						@change="mobileSetRowHeight"
					/>
				</div>
				<div style="border-right: 1px solid var(--z-line)">
					列宽
					<input
						:disabled="mobileRCReadOnly"
						type="number"
						v-model="selectionSize.w"
						@change="mobileSetColWidth"
					/>
				</div>

				<div>
					开始行<input
						type="number"
						v-model="selectionRange.r"
						@change="setSelectionRange"
					/>
				</div>
				<div>
					结束行<input
						type="number"
						v-model="selectionRange.rr"
						@change="setSelectionRange"
					/>
				</div>
				<div>
					开始列<input
						type="number"
						v-model="selectionRange.c"
						@change="setSelectionRange"
					/>
				</div>
				<div>
					结束列<input
						type="number"
						v-model="selectionRange.cc"
						@change="setSelectionRange"
					/>
				</div>
			</div>

			<!-- 状态栏 -->
			<div
				v-if="
					sheet.config.showstateBar &&
					((isMobile() && isLandscape()) ||
						!isMobile() ||
						!sheet.config.showHorizontalScreen)
				"
				class="statebar"
				:class="{mobile: isMobile()}"
				:style="{}"
			>
				<div class="zoom">
					<span>
						<small>{{ Math.round(sheet.config.zoom * 100) }}%</small>
					</span>
					<Icons name="Remove" @click="onZoomSize(-0.1)"></Icons>
					<input
						v-model.number="sheet.config.zoom"
						type="range"
						min="0.5"
						max="3"
						step="0.1"
						@input="onZoomInput"
						@change="onZoomChange"
					/>
					<Icons name="Add" @click="onZoomSize(0.1)"></Icons>
					<Icons name="Restore" @click="onZoomReset"></Icons>
				</div>
				<div class="flx"></div>
				<div class="statistics">
					<span>行 = </span>
					{{ sheet.config.rowCount }}
				</div>
				<div class="statistics">
					<span>列 = </span>
					{{ sheet.config.colCount }}
				</div>
				<div class="statistics">
					<span>最小值 = </span>
					{{ sheet.hooks.selectionRangeHook.statistics.min }}
				</div>
				<div class="statistics">
					<span>最大值 = </span>
					{{ sheet.hooks.selectionRangeHook.statistics.max }}
				</div>
				<div class="statistics">
					<span>求和 = </span>{{ sheet.hooks.selectionRangeHook.statistics.sum }}
				</div>
				<div class="statistics">
					<span>平均值 = </span>
					{{ sheet.hooks.selectionRangeHook.statistics.average }}
				</div>
				<div class="statistics">
					<span>计数 = </span>
					{{ sheet.hooks.selectionRangeHook.statistics.count }}
				</div>
			</div>

			<!-- 遮罩 -->
			<div
				class="mask"
				:class="{
					active: isLoading,
				}"
			>
				<div>
					<Icons name="Loading" class="loading-animation"></Icons>
					<span>
						{{ isLoading ? sheet.state.msg : stateText }}
					</span>
					<span v-if="sheet.state.progress !== -1 && isLoading">
						{{ sheet.state.progress }}%
					</span>
				</div>
			</div>

			<!-- 移动端不是横向提醒 -->
			<div
				class="mobile-landscape-notice"
				v-if="sheet.config.showHorizontalScreen && isMobile() && !isLandscape()"
			>
				<Icons name="Rotate" size="58px" color="#fff"></Icons>
				<span>此操作需要横向屏幕</span>
			</div>
		</template>

		<AirSheetFilter
			v-model="filterEl"
			:colIndex="filterColIndex"
			:filterCol="filterCol"
			:currentFiltered="Array.isArray(sheet?.config?.filtered) ? sheet.config.filtered : []"
			@confirm="sheet?.hooks?.toolsHook?.filterByChecked"
			@confirmOnly="sheet?.hooks?.toolsHook?.filterByChecked"
		/>
	</div>
</template>
<style scoped lang="scss">
@use '@/styles/components/air-sheet.scss';
</style>
