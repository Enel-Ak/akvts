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
	rowCount: {type: Number, default: 100}, // 最大 671087
	// 总列数
	colCount: {type: Number, default: 26},
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
		showHorizontalScreen: true, // 移动端不是横向提醒
		showToolBar: true, // 工具栏
		showStatusBar: true, // 状态栏
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
		zoom: 1, //缩放
		freeze: true, // 冻结

		freezeCount: {
			row: 0,
			col: 0,
		},

		mergedCells: {},
		lockCells: {},
		cellStyle: {},
		cellKeys: [],

		...props.modelValue?.config,

		rowCount: 0,
		colCount: 0,
	},
	celldata: new Map(),
})

watch(
	() => props.modelValue,
	(newVal) => {
		updateModeValue(newVal)
	},
	{deep: true}
)

const fns = ref(props.modelValue?.fns || [])
const limit = 30000
const selectionRange = ref({
	r: 0,
	c: 0,
	rr: 0,
	cc: 0,
})

// 初始数据处理
const initialData = () => {
	if (!props.modelValue?.celldata) return

	const celldata = props.modelValue.celldata
	const total = celldata.length

	if (total >= limit) {
		loading.value = true
		loadingProgress.value = 0
		loadingText.value = '数据量较大, 请稍后...'
	}

	let processed = 0
	const batchSize = 3000

	function processBatch() {
		const start = performance.now()
		let count = 0

		while (processed < total && count < batchSize && performance.now() - start < 16) {
			const row = celldata[processed]
			if (row) {
				sheet.celldata.set(processed, row)
			}
			processed++
			count++
		}

		loadingText.value = `正在加载数据...`
		loadingProgress.value = Math.floor((processed / total) * 100)

		if (processed < total) {
			requestAnimationFrame(processBatch)
		} else {
			loadingText.value = '加载完成'
			loadingProgress.value = 100
			setTimeout(() => {
				loading.value = false
				useHistoryHook.saveHistory()
			}, 500)
		}
	}
	requestAnimationFrame(processBatch)
}

// sheet 配置变更时
const updateModeValue = (newVal) => {
	Object.assign(sheet.config, newVal?.config)
	// 合并单元格处理
	if (newVal?.config?.mergedCells) {
		const mergeCells = new Map(Object.entries(newVal.config.mergedCells))
		useMergedCellsHook.setMergeCells(mergeCells, false)
	}
	initialData()
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
const useSheetRenderHook = useSheetRender({
	sheet,
	loading,
	loadingText,
	loadingProgress,
})
const useResizeHook = useResize({
	sheet,
	rowHeight: props.rowHeight,
	colWidth: props.colWidth,
	renderRange: async () => await updateVisibleRange(),
	useMergedCellsHook: () => useMergedCellsHook,
	useSelectionRangeHook: () => useSelectionRangeHook,
})
const useMergedCellsHook = useMergedCells({
	sheet,
	rowHeight: props.rowHeight,
	colWidth: props.colWidth,
	useResizeHook,
	renderRange: async () => await updateVisibleRange(),
})
const useSelectionRangeHook = reactive(
	useSelectionRange(id, {
		sheet,
		rowHeight: props.rowHeight,
		colWidth: props.colWidth,
		useResizeHook,
		useMergedCellsHook,
		render: {
			update: async () => await updateVisibleRange(),
			range: () => visibleRangeRef.value,
		},
	})
)
const useEditHook = useEdit(id, {
	sheet,
	useResizeHook,
	useMergedCellsHook,
	useSelectionRangeHook,
	renderRange: async () => await updateVisibleRange(),
})
const useHistoryHook = useHistory({
	loading,
	loadingText,
	loadingProgress,
	sheet,
	useMergedCellsHook,
	useSelectionRangeHook,
	renderRange: async () => await updateVisibleRange(),
	processMapInBatches: (map, callback, batchSize = 5000) =>
		processMapInBatches(map, callback, batchSize),
})
const useExcelHook = useExcel({
	sheet,
	loading,
	loadingText,
	loadingProgress,
	useEditHook,
	useResizeHook,
	useMergedCellsHook,
	useSelectionRangeHook,
})
const useToolsHook = useTools({
	sheet,
	limit,
	loading,
	loadingText,
	loadingProgress,
	containerRef,
	useExcelHook,
	useResizeHook,
	useHistoryHook,
	useMergedCellsHook,
	useSelectionRangeHook,
	isLocked: () => isLockedCell(),
	renderRange: async () => await updateVisibleRange(),
	processMapInBatches: (map, callback, batchSize) =>
		processMapInBatches(map, callback, batchSize),
})
const useCopyHook = useCopy({
	sheet,
	useResizeHook,
	useMergedCellsHook,
	useSelectionRangeHook,
	useHistoryHook,
	useToolsHook,
	renderRange: async () => await updateVisibleRange(),
})
const useMouseRightHook = useMouseRight(id)

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
			defaultRowHeight: props.rowHeight * sheet.config.zoom,
			defaultColWidth: props.colWidth * sheet.config.zoom,
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

// 生成可视行数据
const visibleRows = computed(() => {
	const rows = []

	// 使用worker计算的结果
	if (!visibleRangeRef.value || !visibleRangeRef.value.visible) return rows

	const {startRow, endRow} = visibleRangeRef.value.visible
	const start = Math.max(0, startRow)
	const end = Math.min(sheet.config.rowCount, endRow)

	for (let i = start; i < end; i++) {
		const row = {
			rowIndex: i,
			rowHeight: useResizeHook.getRowHeight(i),
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

	for (let i = start; i < end; i++) {
		// 检查当前单元格是否是合并单元格的从属单元格
		const mergedCell = useMergedCellsHook.findMergedCell(row.rowIndex, i)
		let value = null

		if (mergedCell) {
			if (mergedCell.row === row.rowIndex && mergedCell.col === i) {
				// 如果是合并单元格的起始位置，设置值
				value = sheet.celldata.get(row.rowIndex)?.[i] || ''
			} else {
				// 如果在合并单元格内部，不设置值
				value = ''
			}
		} else {
			// 普通单元格，正常取值
			value = sheet.celldata.get(row.rowIndex)?.[i] || ''
		}

		if (!sheet.celldata.get(row.rowIndex)) {
			sheet.celldata.set(row.rowIndex, [])
		}

		cells.push({
			rowIndex: row.rowIndex,
			rowHeight: useResizeHook.getRowHeight(row.rowIndex),
			colIndex: i,
			colWidth: useResizeHook.getColWidth(i),
			value,
			config: {
				key: sheet.config.cellKeys[i],
			},
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
			height += useResizeHook.getRowHeight(i)
		}
		offsetTop.value = height
	} else {
		let width = 0
		const startCol = Math.min(visibleRangeRef.value.visible.startCol, sheet.config.colCount)
		for (let i = 0; i < startCol; i++) {
			width += useResizeHook.getColWidth(i)
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
			colIndex: i,
			colWidth: useResizeHook.getColWidth(i),
			title: getTitle(i),
		})
	}
	return titles
})

// 计算自定义列偏移量（与内容完全对齐）
const getOffsetStyle = (cell) => {
	const style = useMergedCellsHook.getCellStyle(cell, {
		offsetLeft: offsetLeft.value,
		offsetTop: offsetTop.value,
	})
	return style
}

const isMergedCellStart = (cell) => {
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

	const newScrollTop = containerRef.value.scrollTop
	const newScrollLeft = containerRef.value.scrollLeft

	// 在滚动时更新原始滚动位置
	originalScrollTop = newScrollTop / (sheet.config.zoom || 1)

	const alphabet = alphabetRef.value
	const number = numberRef.value
	const fn = fnRef.value

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
	}, 150)
}

// 监听滚动位置变化
watch([scrollTop, scrollLeft], () => updateVisibleRange(), {immediate: true})

// 恢复滚动位置

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
		console.log('单元格点击', cell)
		emits('cellClick', cell)
		// 确保在事件触发后重置状态
		if (now === lastClickTime) {
			lastClickTime = 0
		}
	}, 300)
}

// 单元格编辑失去焦点后
const onCellBlur = (event, cell) => {
	useHistoryHook.saveHistory(cell)
	setTimeout(() => {
		const val = sheet.celldata.get(cell.rowIndex)?.[cell.colIndex]
		emits('cellBlur', val, cell) // 新值，旧值
		console.log('单元格编辑', val, cell)
	}, 0)
}

// 改变缩放比例时
let zoomTimer = null
let originalScrollTop = -1
let lastZoom = 1
const onZoomInput = async () => {
	const currentZoom = sheet.config.zoom || 1
	// 记录当前第一个可见行的位置
	if (originalScrollTop === -1) {
		// 如果是第一次缩放，直接记录当前位置除以当前缩放比例
		originalScrollTop = containerRef.value.scrollTop / currentZoom
	} else if (lastZoom !== currentZoom) {
		// 如果缩放比例发生变化，更新原始位置
		originalScrollTop = containerRef.value.scrollTop / lastZoom
	}
	clearTimeout(zoomTimer)
	zoomTimer = setTimeout(async () => {
		let top = originalScrollTop * currentZoom
		lastScroll.value = false

		// 计算最大滚动位置
		const maxScroll = containerRef.value.scrollHeight - containerRef.value.clientHeight
		// 确保不超过最大滚动位置
		top = Math.min(top, maxScroll)

		requestAnimationFrame(async () => {
			if (fnRef.value) {
				fnRef.value.scrollTop = top
			}
			if (numberRef.value) {
				numberRef.value.scrollTo = top
			}

			if (containerRef.value) {
				containerRef.value.scrollTop = top
			}

			await updateOffset('offsetTop', 'startRow')
			await updateOffset('offsetLeft', 'startCol')

			lastZoom = currentZoom
			onScroll()
			if (lastZoom < 1) {
				updateVisibleRange()
			}
		})
	}, 16)
}

const onZoomChange = () => {
	originalScrollTop = -1
}

const onZoomSize = (size) => {
	const currentZoom = sheet.config.zoom
	// 在改变缩放前记录当前的原始位置
	if (originalScrollTop === -1) {
		originalScrollTop = containerRef.value.scrollTop / currentZoom
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
	const currentZoom = sheet.config.zoom
	// 在重置前记录当前的原始位置
	if (originalScrollTop === -1) {
		originalScrollTop = containerRef.value.scrollTop / currentZoom
	}

	sheet.config.zoom = 1
	onZoomInput()

	// 重置完成后清除原始位置
	setTimeout(() => {
		originalScrollTop = -1
		lastZoom = 1
	}, 200)
}

// 拖拽到单元格时
let dropCell = null
const onCellcellDragOver = (event) => {
	event.preventDefault()
	dropCell = useSelectionRangeHook.getRange(event)
	emits('cellDragOver', dropCell)
}

const onCellDrop = (event) => {
	event.preventDefault()
	emits('cellDrop', dropCell)
	dropCell = null
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

		// 加入拖拽到单元格的监听
		containerRef.value.addEventListener('cellDragOver', onCellcellDragOver)
		containerRef.value.addEventListener('drop', onCellDrop)
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

	useSelectionRangeHook.setRange(r - 1, c - 1, rr - 1, cc - 1, true)
}

watch(
	() => useSelectionRangeHook?.ranged,
	(newVal) => {
		if (newVal) {
			const {start, end} = newVal
			selectionRange.value = {
				r: start.row + 1,
				rr: end.row + 1,
				c: start.col + 1,
				cc: end.col + 1,
			}
		}
	},
	{deep: true}
)

// 判断移动端是否横向
const isLandscape = () => {
	if (isMobile()) {
		return window.innerWidth > window.innerHeight
	}
	return false
}

// 初始化
onMounted(() => {
	setTimeout(() => {
		useSelectionRangeHook.setRange(0, 0, 0, 0)
		const {start, end} = useSelectionRangeHook.ranged
		selectionRange.value = {
			r: start.row + 1,
			c: start.col + 1,
			rr: end.row + 1,
			cc: end.col + 1,
		}
	}, 0)
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
	setCellBackground: (row, col, rowspan, colspan, color) => {
		useToolsHook.setCellStyle({
			type: 'bg',
			value: color,
			row,
			col,
			rowspan,
			colspan,
		})
	},
	getSheet: () => JSON.parse(JSON.stringify({...sheet, celldata: [...sheet.celldata]})),
	getSheetData: () => JSON.parse(JSON.stringify([...sheet.celldata])),
	luckyToAir: async (config, data) => await useToolsHook.luckyToAir(config, data),
	airToLucky: async () => await useToolsHook.airToLucky(sheet),
})
</script>
<template>
	<div
		class="air-sheet-component"
		:style="{height: containerHeight}"
		:class="{mobile: isMobile(), btn: !sheet.config.showToolBar}"
	>
		<!-- 工具栏 -->
		<div
			v-if="
				sheet.config.showToolBar &&
				((isMobile() && isLandscape()) || !isMobile() || !sheet.config.showHorizontalScreen)
			"
			class="toolbar"
			:class="{mobile: isMobile()}"
			:style="{}"
		>
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

			<!-- 边框 -->
			<template v-if="!isMobile()">
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
						<div class="item border-color" @click="useToolsHook.setBorderColor">
							<Icons icon-name="BorderColor"></Icons>
							<span>颜色</span>
							<input
								type="color"
								@input="useToolsHook.setBorderColor($event)"
								@change="useToolsHook.borderColorChanged"
							/>
						</div>
					</div>
				</div>
			</template>
			<template v-else>
				<div class="group" v-if="sheet.config.border">
					<div class="item" @click="useToolsHook.setBorder()">
						<Icons icon-name="Border"></Icons>
						<span>边框</span>
					</div>

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
					<div class="item border-color" @click="useToolsHook.setBorderColor">
						<Icons icon-name="BorderColor"></Icons>
						<span>颜色</span>
						<input
							type="color"
							@input="useToolsHook.setBorderColor($event)"
							@change="useToolsHook.borderColorChanged"
						/>
					</div>
				</div>
			</template>

			<div v-if="sheet.config.addRow" class="group" :class="{'group-merge': !isMobile()}">
				<div class="item" @click="useToolsHook.addRow($event, false)">
					<Icons icon-name="AddRow"></Icons>
					<span>添加行</span>
				</div>

				<div v-if="!isMobile()" class="merge add-row-merge shadow-12">
					<input
						v-model.number="useToolsHook.addRowCount.value"
						type="number"
						min="1"
						value="1"
					/>
				</div>
			</div>

			<div v-if="sheet.config.addColumn" class="group" :class="{'group-merge': !isMobile()}">
				<div
					v-if="sheet.config.addColumn"
					class="item"
					@click="useToolsHook.addColumn($event, false)"
				>
					<Icons icon-name="AddColumn"></Icons>
					<span>添加列</span>
				</div>
				<div v-if="!isMobile()" class="merge add-column-merge shadow-12">
					<input
						v-model.number="useToolsHook.addColumnCount.value"
						type="number"
						min="1"
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
					<span>导入</span>
					<input type="file" @change="useToolsHook.importExcel" />
				</div>
				<div v-if="sheet.config.export" class="item" @click="useToolsHook.exportExcel">
					<Icons icon-name="Export"></Icons>
					<span>导出</span>
				</div>
			</div>

			<!-- 锁定解锁 -->
			<div class="group" v-if="sheet.config.lock || sheet.config.unlock">
				<div v-if="sheet.config.lock" class="item" @click="useToolsHook.setLocked">
					<Icons icon-name="CellLock"></Icons>
					<span>锁定</span>
				</div>
				<div v-if="sheet.config.unlock" class="item" @click="useToolsHook.setUnlocked">
					<Icons icon-name="CellUnlock"></Icons>
					<span>解锁</span>
				</div>
			</div>

			<!-- 冻结 -->
			<div v-if="sheet.config.freeze" class="group" :class="{'group-merge': !isMobile()}">
				<div class="item" @click="useToolsHook.setFreeze">
					<Icons icon-name="Freeze"></Icons>
					<span>冻结</span>
				</div>
				<div v-if="!isMobile()" class="merge freeze-merge shadow-12">
					<span>行</span>
					<input type="number" v-model.number="useToolsHook.freezeRow.value" />
					&nbsp;
					<span>列</span>
					<input type="number" v-model.number="useToolsHook.freezeCol.value" />
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
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<div
							class="number-cell"
							:style="{height: `${row.rowHeight}px`, width: `${numberWidth}px`}"
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
					<template v-for="row of visibleRows" :key="row.rowIndex">
						<div
							class="row"
							:data-row="row.rowIndex"
							:style="{height: `${row.rowHeight}px`}"
						>
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
										v-html="useEditHook.formattedValue(cell.value, cell)"
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
										@blur="onCellBlur($event, cell)"
									></div>
								</div>
								<div
									v-else
									v-html="useEditHook.formattedValue(cell.value, cell)"
									:data-cell="`${cell.rowIndex}-${cell.colIndex}`"
									:class="{
										merged: isMergedCellStart(cell),
										lock: sheet.config.lockCells[
											`${cell.rowIndex}-${cell.colIndex}`
										],
									}"
									:style="getOffsetStyle(cell)"
									@click="onClickCell($event, cell)"
									@dblclick.stop="useEditHook.startEdit($event, cell)"
									@blur="onCellBlur($event, cell)"
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
					<div
						v-if="sheet.config.addRow"
						class="menu-item"
						@click="useToolsHook.addRow($event, false)"
					>
						<Icons icon-name="AddRow"></Icons>
						<span>添加行</span>
					</div>
					<div
						v-if="sheet.config.addColumn"
						class="menu-item"
						@click="useToolsHook.addColumn($event, false)"
					>
						<Icons icon-name="AddColumn"></Icons>
						<span>添加列</span>
					</div>
					<div
						v-if="sheet.config.removeRow"
						class="menu-item"
						@click="useToolsHook.removeRow"
					>
						<Icons icon-name="RemoveRow"></Icons>
						<span>删除行</span>
					</div>
					<div
						v-if="sheet.config.removeColumn"
						class="menu-item"
						@click="useToolsHook.removeColumn"
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
					width: visibleRangeRef?.metrics?.totalWidth + 'px',
				}"
			></div>

			<!-- 列辅助线 -->
			<div
				v-if="useResizeHook.isResizing.value && useResizeHook.resizingCol.value"
				class="grid-lines-col"
				:style="{
					height: visibleRangeRef?.metrics?.totalHeight + 'px',
				}"
			></div>

			<!-- 滚动渲染提示, 数据小于限制时显示 -->
			<div class="scroll-tip" v-if="!lastScroll && sheet.config.rowCount < limit">
				<Icons icon-name="Loading" class="loading-animation"></Icons>
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
				开始行<input type="number" v-model="selectionRange.r" @change="setSelectionRange" />
			</div>
			<div>
				结束行<input
					type="number"
					v-model="selectionRange.rr"
					@change="setSelectionRange"
				/>
			</div>
			<div>
				开始列<input type="number" v-model="selectionRange.c" @change="setSelectionRange" />
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
				sheet.config.showStatusBar &&
				((isMobile() && isLandscape()) || !isMobile() || !sheet.config.showHorizontalScreen)
			"
			class="statusbar"
			:class="{mobile: isMobile()}"
			:style="{}"
		>
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
				{{ useSelectionRangeHook.statistics.min }}
			</div>
			<div class="statistics">
				<span>最大值 = </span>
				{{ useSelectionRangeHook.statistics.max }}
			</div>
			<div class="statistics">
				<span>求和 = </span>{{ useSelectionRangeHook.statistics.sum }}
			</div>
			<div class="statistics">
				<span>平均值 = </span>
				{{ useSelectionRangeHook.statistics.average }}
			</div>
			<div class="statistics">
				<span>计数 = </span>
				{{ useSelectionRangeHook.statistics.count }}
			</div>

			<div class="flx"></div>
			<div class="zoom">
				<span>
					<small>{{ Math.round(sheet.config.zoom * 100) }}%</small>
				</span>
				<Icons icon-name="Remove" @click="onZoomSize(-0.1)"></Icons>
				<input
					v-model.number="sheet.config.zoom"
					type="range"
					min="0.5"
					max="3"
					step="0.01"
					@input="onZoomInput"
					@change="onZoomChange"
				/>
				<Icons icon-name="Add" @click="onZoomSize(0.1)"></Icons>
				<Icons icon-name="Restore" @click="onZoomReset"></Icons>
			</div>
		</div>

		<!-- 遮罩 -->
		<div class="mask" :class="{active: loading}">
			<div>
				<Icons icon-name="Loading" class="loading-animation"></Icons>
				<span>{{ loadingText }}</span>
				<span v-if="loadingProgress !== -1">{{ loadingProgress }}%</span>
			</div>
		</div>

		<!-- 移动端不是横向提醒 -->
		<div
			class="mobile-landscape-notice"
			v-if="sheet.config.showHorizontalScreen && isMobile() && !isLandscape()"
		>
			<Icons icon-name="Rotate" size="58px" color="#fff"></Icons>
			<span>此操作需要横向屏幕</span>
		</div>
	</div>
</template>
<style scoped lang="scss">
@use '@/styles/components/air-sheet.scss';
</style>
