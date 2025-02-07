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
import {useEdit} from '@/hooks/sheet/useEdit.js'
import {useHistory} from '@/hooks/sheet/useHistory'
import {useCopy} from '@/hooks/sheet/useCopy'

const emits = defineEmits(['update:modelValue', 'cellInput'])

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
		merge: true, // 合并单元格
		align: true, // 对齐方式
		border: true, // 边框

		mergedCells: {},
		cellStyle: {
			...props.modelValue?.config.cellStyle,
		},
		rowCount: 0,
		colCount: 0,
	},
	celldata: new Map(),
})

const fns = ref(props.modelValue.fns || [])

// 初始数据处理
const initialData = () => {
	if (!props.modelValue?.celldata) return

	const celldata = props.modelValue.celldata
	const total = celldata.length

	if (total >= 10000) {
		loading.value = true
		loadingText.value = '正在加载数据...'
	}

	const batchSize = 5000
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
				loadingText.value = `正在加载数据... ${Math.floor((processed / total) * 100)}%`
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
const loadingText = ref('数据量较大, 请稍等...')
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
	useSelectionRangeHook,
	renderRange: () => updateVisibleRange(),
})
const useHistoryHook = useHistory({
	loading,
	loadingText,
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
	renderRange: () => updateVisibleRange(),
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
					loadingText.value = `正在处理数据... ${Math.floor((processed / total) * 100)}%`
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

// 滚动处理
let scrollTimer = null
let historyRange = null
const lastScroll = ref(false)
const onScroll = useThrottleFn(
	(e) => {
		if (!historyRange) {
			historyRange = useSelectionRangeHook.ranged
			useSelectionRangeHook.clear()
		}

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

		//修正最后一次位置并对齐到行
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
			useSelectionRangeHook.setRange(
				historyRange.start.row,
				historyRange.start.col,
				historyRange.end.row,
				historyRange.end.col
			)
			historyRange = null
		}, 300)
	},
	{throttle: 16}
)

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
	const target = e.currentTarget

	useSelectionRangeHook.setRange(row.rowIndex, 0, row.rowIndex, sheet.config.colCount - 1, true)
	setTimeout(() => {
		target.parentNode.querySelectorAll('.selection').forEach((item) => {
			item.classList.remove('selection')
		})
		target.classList.add('selection')
		document
			.querySelector('.alphabet-cells')
			.querySelectorAll('.alphabet-cell')
			.forEach((item) => {
				item.classList.add('selection')
			})
	}, 0)
}

// 点击字母
const onClickAlphabet = (e, col) => {
	const target = e.target.closest('.alphabet-cell')
	const colIndex = target.getAttribute('data-col')
	useSelectionRangeHook.setRange(0, colIndex, sheet.config.rowCount - 1, colIndex, true)
	setTimeout(() => {
		target.parentNode.querySelectorAll('.selection').forEach((item) => {
			item.classList.remove('selection')
		})
		target.classList.add('selection')
		document
			.querySelector('.number-cells')
			.querySelectorAll('.number-cell')
			.forEach((item) => {
				item.classList.add('selection')
			})
	}, 0)
}

// 设置单元格样式, 工具栏共用,
const setCellStyle = (type, val, fn) => {
	useHistoryHook.saveHistory()

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

// 合并
const onMergeClick = () => {
	useHistoryHook.saveHistory()
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const endCol = Math.max(ranged.start.col, ranged.end.col)

	useMergedCellsHook.addMergedCell(
		startRow,
		startCol,
		endRow - startRow + 1,
		endCol - startCol + 1
	)
}

// 边框
const onBorderClick = (border = true, direction = null) => {
	setCellStyle('b', null, (r, c, {startRow, startCol, endRow, endCol}) => {
		// 删除边框样式
		if (!border && !direction) {
			// 无边框
			if (sheet.config.cellStyle[`${r}-${c}`]) {
				delete sheet.config.cellStyle[`${r}-${c}`].b
				delete sheet.config.cellStyle[`${r}-${c}`].bt
				delete sheet.config.cellStyle[`${r}-${c}`].bb
				delete sheet.config.cellStyle[`${r}-${c}`].bl
				delete sheet.config.cellStyle[`${r}-${c}`].br
				// 如果没有其他样式，删除整个样式对象
				if (Object.keys(sheet.config.cellStyle[`${r}-${c}`]).length === 0) {
					delete sheet.config.cellStyle[`${r}-${c}`]
				}
			}
			return
		}

		if (border && !direction) {
			// 点边框时删除其他边框
			try {
				delete sheet.config.cellStyle[`${r}-${c}`].bt
				delete sheet.config.cellStyle[`${r}-${c}`].bb
				delete sheet.config.cellStyle[`${r}-${c}`].bl
				delete sheet.config.cellStyle[`${r}-${c}`].br
			} catch {}
		}

		// 如果没有cellStyle对象，创建一个
		if (!sheet.config.cellStyle[`${r}-${c}`]) {
			sheet.config.cellStyle[`${r}-${c}`] = {}
		}

		if (border === null && direction) {
			if (direction === 'top') {
				sheet.config.cellStyle[`${r}-${c}`].bt = 'borderTop'
			} else if (direction === 'bottom') {
				sheet.config.cellStyle[`${r}-${c}`].bb = 'borderBottom'
			} else if (direction === 'left') {
				sheet.config.cellStyle[`${r}-${c}`].bl = 'borderLeft'
			} else if (direction === 'right') {
				sheet.config.cellStyle[`${r}-${c}`].br = 'borderRight'
			}
			return
		}

		// 第一行第一列的交叉单元格
		if (r === startRow && c === startCol) {
			sheet.config.cellStyle[`${r}-${c}`].b = 'cross'
			return
		}

		// 第一行
		if (r === startRow) {
			sheet.config.cellStyle[`${r}-${c}`].b = 'top'
			return
		}

		// 第一列
		if (c === startCol) {
			sheet.config.cellStyle[`${r}-${c}`].b = 'left'
			return
		}

		// 其他内部单元格
		if (r <= endRow && c <= endCol) {
			sheet.config.cellStyle[`${r}-${c}`].b = 'all'
		}
	})
}

// 对齐
const onAlignClick = (align) => {
	setCellStyle('a', align)
}

// 添加行
const onAddRowClick = async () => {
	const ranged = useSelectionRangeHook.ranged
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const insertRowIndex = endRow + 1

	if (sheet.celldata.size >= 10000) {
		loading.value = true
		loadingText.value = '正在处理数据...'
	}

	// 创建新的Map
	const newMap = new Map()

	try {
		await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
			if (rowIndex < insertRowIndex) {
				newMap.set(rowIndex, rowData)
			} else {
				newMap.set(rowIndex + 1, rowData)
			}
			newMap.set(insertRowIndex, reactive([]))
		})

		// 更新sheet.celldata
		sheet.celldata = newMap
		sheet.config.rowCount++

		useHistoryHook.saveHistory(
			{
				rowIndex: insertRowIndex,
				rowspan: 0,
			},
			'addRow'
		)
		updateVisibleRange()
	} catch (error) {
		console.error('处理数据时出错:', error)
	} finally {
		loading.value = false
		loadingText.value = '处理完成'
	}
}

// 添加列
const onAddColumnClick = async () => {
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	if (sheet.celldata.size >= 10000) {
		loading.value = true
		loadingText.value = '正在处理数据...'
	}

	const endCol = Math.max(ranged.start.col, ranged.end.col)
	const insertColIndex = endCol + 1
	const newMap = new Map()

	try {
		await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
			// 创建新的行数据数组
			const newRowData = Array.from(rowData)

			// 在指定位置插入空值
			newRowData.splice(insertColIndex, 0, '')

			// 更新到新Map
			newMap.set(rowIndex, reactive(newRowData))
		})

		// 更新sheet.celldata
		sheet.celldata = newMap
		sheet.config.colCount++

		// 更新合并单元格
		const mergedCells = sheet.config.mergedCells
		const newMergedCells = new Map()
		Object.keys(mergedCells).forEach((key) => {
			const [row, col] = key.split('-').map(Number)
			const {rowspan, colspan} = mergedCells[key]

			if (col < insertColIndex) {
				// 在插入列之前的合并单元格保持不变
				newMergedCells.set(key, mergedCells[key])
			} else {
				// 在插入列之后的合并单元格需要更新列号
				newMergedCells.set(`${row}-${col + 1}`, {
					rowspan,
					colspan,
				})
			}
		})
		useMergedCellsHook.setMergedCells(newMergedCells)

		// 保存历史记录
		useHistoryHook.saveHistory(
			{
				colIndex: insertColIndex,
				colspan: 0,
			},
			'addCol'
		)

		updateVisibleRange()
	} catch (error) {
		console.error('添加列失败', error)
	} finally {
		loading.value = false
		loadingText.value = '处理完成'
	}
}

// 删除行
const onRemoveRowClick = async () => {
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	if (sheet.celldata.size >= 10000) {
		loading.value = true
		loadingText.value = '正在处理数据...'
	}

	const startRow = Math.min(ranged.start.row, ranged.end.row)
	const endRow = Math.max(ranged.start.row, ranged.end.row)
	const deleteCount = endRow - startRow + 1
	const deletedRows = new Map()
	const newMap = new Map()

	try {
		await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
			if (rowIndex < startRow) {
				newMap.set(rowIndex, rowData)
			} else if (rowIndex > endRow) {
				newMap.set(rowIndex - deleteCount, rowData)
			} else {
				deletedRows.set(`${rowIndex}`, {
					rowIndex,
					value: rowData,
				})
			}
		})

		// 保存历史
		useHistoryHook.saveHistory(deletedRows, 'removeRow')

		// 更新合并单元格的位置
		const mergedCells = sheet.config.mergedCells
		const newMergedCells = new Map()
		Object.keys(mergedCells).forEach((key) => {
			const [row, col] = key.split('-').map(Number)
			const {rowspan, colspan} = mergedCells[key]

			if (row < startRow) {
				// 在删除行之前的合并单元格
				if (row + rowspan > startRow) {
					// 如果合并单元格跨越了删除范围，需要减少 rowspan
					const overlap = Math.min(endRow - startRow + 1, row + rowspan - startRow)
					newMergedCells.set(key, {
						rowspan: rowspan - overlap,
						colspan,
					})
				} else {
					// 合并单元格完全在删除范围之前，保持不变
					newMergedCells.set(key, mergedCells[key])
				}
			} else if (row > endRow) {
				// 在删除行之后的合并单元格需要更新行号
				newMergedCells.set(`${row - deleteCount}-${col}`, {
					rowspan,
					colspan,
				})
			}
			// 如果合并单元格的起始位置在删除范围内，则不添加到新的 Map 中（相当于删除）
		})
		useMergedCellsHook.setMergedCells(newMergedCells)

		// 删除行相关的cellstyle
		for (let i = startRow; i <= endRow; i++) {
			Object.keys(sheet.config.cellStyle).forEach((key) => {
				const [row] = key.split('-').map(Number)
				if (row === i) {
					delete sheet.config.cellStyle[key]
				}
			})
		}

		// 更新sheet.celldata
		sheet.celldata = newMap
		sheet.config.rowCount = Math.max(0, sheet.config.rowCount - deleteCount)
		updateVisibleRange()
	} catch (error) {
		console.error('处理数据时出错:', error)
	} finally {
		loading.value = false
		loadingText.value = '处理完成'
	}
}

// 删除列
const onRemoveColumnClick = async () => {
	const ranged = useSelectionRangeHook.ranged
	if (!ranged) return

	if (sheet.celldata.size >= 10000) {
		loading.value = true
		loadingText.value = '正在处理数据...'
	}

	const startCol = Math.min(ranged.start.col, ranged.end.col)
	const endCol = Math.max(ranged.start.col, ranged.end.col)
	const deleteCount = endCol - startCol + 1
	const deletedCols = new Map()
	const newMap = new Map()

	try {
		await processMapInBatches(sheet.celldata, (rowIndex, rowData) => {
			const newRowData = []
			rowData.forEach((cellData, colIndex) => {
				if (colIndex < startCol) {
					newRowData[colIndex] = cellData
				} else if (colIndex > endCol) {
					newRowData[colIndex - deleteCount] = cellData
				} else {
					const row = deletedCols.get(rowIndex)
					if (row) {
						row.push({rowIndex, colIndex, value: cellData})
					} else {
						deletedCols.set(rowIndex, [{rowIndex, colIndex, value: cellData}])
					}
				}
			})
			newMap.set(rowIndex, reactive(newRowData))
		})

		// 保存历史
		useHistoryHook.saveHistory(deletedCols, 'removeCol')

		// 更新合并单元格的位置
		const mergedCells = sheet.config.mergedCells
		const newMergedCells = new Map()
		Object.keys(mergedCells).forEach((key) => {
			const [row, col] = key.split('-').map(Number)
			const {rowspan, colspan} = mergedCells[key]

			if (col < startCol) {
				// 在删除列之前的合并单元格
				if (col + colspan > startCol) {
					// 如果合并单元格跨越了删除范围，需要减少 rowspan
					const overlap = Math.min(endCol - startCol + 1, col + colspan - startCol)
					newMergedCells.set(key, {
						rowspan: rowspan,
						colspan: colspan - overlap,
					})
				} else {
					// 合并单元格完全在删除范围之前，保持不变
					newMergedCells.set(key, mergedCells[key])
				}
			} else if (col > endCol) {
				// 在删除列之后的合并单元格需要更新行号
				newMergedCells.set(`${row}-${col - deleteCount}`, {
					rowspan,
					colspan,
				})
			}
		})
		useMergedCellsHook.setMergedCells(newMergedCells)

		// 删除列相关的cellstyle
		for (let i = startCol; i <= endCol; i++) {
			Object.keys(sheet.config.cellStyle).forEach((key) => {
				const [_, col] = key.split('-').map(Number)
				if (col === i) {
					delete sheet.config.cellStyle[key]
				}
			})
		}

		// 更新sheet.celldata和其他相关操作
		sheet.celldata = newMap
		sheet.config.colCount = Math.max(0, sheet.config.colCount - deleteCount)
		updateVisibleRange()
	} catch (error) {
		console.error('处理数据时出错:', error)
	} finally {
		loading.value = false
		loadingText.value = '处理完成'
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

const init = () => {
	initialData()
	updateViewportSize()

	let rowCount = 0
	if (props.modelValue?.celldata) {
		rowCount =
			props.modelValue?.celldata.length > props.rowCount
				? props.modelValue?.celldata.length
				: props.rowCount
	} else {
		rowCount = props.rowCount > 671087 ? 671087 : props.rowCount
	}
	sheet.config.rowCount = rowCount

	let colCount = 0
	if (props.modelValue?.celldata) {
		colCount = props.modelValue.celldata
			.map((d) => d.length)
			.reduce((a, b) => Math.max(a, b), props.colCount)
	} else {
		colCount = props.colCount > 240 ? 240 : props.colCount
	}
	sheet.config.colCount = colCount

	useResizeHook.init()
	useMergedCellsHook.init()
	useSheetRenderHook.init()
	useSelectionRangeHook.init()
	useEditHook.init()
	useCopyHook.init()
	useHistoryHook.init()

	initialized.value = true
	window.addEventListener('resize', updateViewportSize)
	observeView()

	// 计算滚动条宽度
	const outer = document.createElement('div')
	outer.style.visibility = 'hidden'
	outer.style.overflow = 'scroll'
	document.body.appendChild(outer)

	const inner = document.createElement('div')
	outer.appendChild(inner)

	scrollbarWidth.value = outer.offsetWidth - inner.offsetWidth
	outer.parentNode.removeChild(outer)

	nextTick(() => {
		restoreScrollPosition()
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

	window.removeEventListener('resize', updateViewportSize)
}

const clearData = () => {
	sheet.celldata.clear()
}

// 初始化
onMounted(() => {
	useSelectionRangeHook.setRange(0, 0, 0, 0)
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

onUnmounted(() => {
	destroy()
	clearData()
})

defineExpose({
	destroy,
	clearData,
	setRange: useSelectionRangeHook.setRange,
	setMergeCell: useMergedCellsHook.addMergedCell,
	setCellValue: useEditHook.setCellValue,
})
</script>
<template>
	<div class="air-sheet-component" :style="{height: containerHeight}">
		<!-- 工具栏 -->
		<div class="toolbar" :style="{opacity: lastScroll ? 1 : 0.15}">
			<div class="group" v-if="sheet.config.align">
				<div class="item" @click="onAlignClick('left')">
					<Icons icon-name="AlignLeft"></Icons>
					<span>左对齐</span>
				</div>
				<div class="item" @click="onAlignClick('center')">
					<Icons icon-name="AlignCenter"></Icons>
					<span>居中</span>
				</div>
				<div class="item" @click="onAlignClick('right')">
					<Icons icon-name="AlignRight"></Icons>
					<span>右对齐</span>
				</div>
			</div>
			<div class="group" v-if="sheet.config.merge">
				<div class="item" @click="onMergeClick">
					<Icons icon-name="Merge"></Icons>
					<span>合并</span>
				</div>
			</div>
			<div class="group" v-if="sheet.config.border">
				<div class="item" @click="onBorderClick">
					<Icons icon-name="Border"></Icons>
					<span>边框</span>
				</div>
				<div class="item" @click="onBorderClick(false)">
					<Icons icon-name="UnBorder"></Icons>
					<span>无边框</span>
				</div>
				<div class="item" @click="onBorderClick(null, 'top')">
					<Icons icon-name="BorderTop"></Icons>
					<span>上边框</span>
				</div>
				<div class="item" @click="onBorderClick(null, 'bottom')">
					<Icons icon-name="BorderBottom"></Icons>
					<span>下边框</span>
				</div>
				<div class="item" @click="onBorderClick(null, 'left')">
					<Icons icon-name="BorderLeft"></Icons>
					<span>左边框</span>
				</div>
				<div class="item" @click="onBorderClick(null, 'right')">
					<Icons icon-name="BorderRight"></Icons>
					<span>右边框</span>
				</div>
			</div>

			<div class="group">
				<div class="item" @click="onAddRowClick">
					<Icons icon-name="AddRow"></Icons>
					<span>添加行</span>
				</div>
				<div class="item" @click="onAddColumnClick">
					<Icons icon-name="AddColumn"></Icons>
					<span>添加列</span>
				</div>
				<div class="item" @click="onRemoveRowClick">
					<Icons icon-name="RemoveRow"></Icons>
					<span>删除行</span>
				</div>
				<div class="item" @click="onRemoveColumnClick">
					<Icons icon-name="RemoveColumn"></Icons>
					<span>删除列</span>
				</div>
			</div>

			<div class="group" v-if="useHistoryHook.canUndo()">
				<div class="item" @click="useHistoryHook.undo">
					<Icons icon-name="Undo"></Icons>
					<span>撤销</span>
				</div>
			</div>
		</div>

		<!-- Sheet -->
		<div class="sheet" :style="{height: containerHeight}">
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
				class="virtual-sheet custom alphabet brn"
				:style="{
					opacity: lastScroll ? 1 : 0.15,
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
					opacity: lastScroll ? 1 : 0.15,
					width:
						enableFn && fns?.length
							? fnWidth + scrollbarWidth + 'px'
							: scrollbarWidth + 'px',
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
										v-html="useEditHook.formattedValue(cell.value)"
										:data-cell="`${cell.rowIndex}-${cell.colIndex}`"
										:class="{
											merged: isMergedCellStart(cell),
										}"
										:style="getOffsetStyle(cell)"
										class="cell"
										@dblclick="useEditHook.startEdit($event, cell)"
									></div>
								</div>
								<div
									v-else
									v-html="useEditHook.formattedValue(cell.value)"
									:data-cell="`${cell.rowIndex}-${cell.colIndex}`"
									:class="{
										merged: isMergedCellStart(cell),
									}"
									:style="getOffsetStyle(cell)"
									@dblclick="useEditHook.startEdit($event, cell)"
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
			</div>

			<!-- 操作 -->
			<div
				ref="fnRef"
				class="virtual-sheet custom bln"
				v-if="enableFn && fns?.length"
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
		<div class="statusbar" :style="{opacity: lastScroll ? 1 : 0.15}">
			<span>总行数: {{ sheet.config.rowCount }}</span>
			<span>总列数: {{ sheet.config.colCount }}</span>
		</div>

		<!-- 遮罩 -->
		<div v-if="loading" class="mask">
			<Icons icon-name="Loading" class="loading-animation"></Icons>
			<div>{{ loadingText }}</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.air-sheet-component {
	display: flex;
	flex-direction: column;
	overflow: hidden;
	position: relative;
	width: 100%;
}

.toolbar {
	align-items: flex-start;
	border: 1px solid var(--z-line);
	border-bottom: none;
	background-color: rgba(var(--z-bg-secondary-rgb), 0.3);
	display: flex;
	justify-content: flex-start;
	// transition: all 0.15s linear;
	user-select: none;
	.group {
		border-right: 1px solid var(--z-line);
		display: flex;
		padding: 4px 4px 4px 0;
	}

	.item {
		align-items: center;
		border-radius: 2px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		margin: 0 0 0 4px;
		padding: 4px;
		// transition: all 0.15s linear;
		span {
			font-size: 12px;
			padding: 4px 0 0 0;
			transform: scale(0.9);
		}

		&:hover {
			background-color: var(--z-sheet-virtual);
			color: var(--z-font-color);
			:deep(svg) {
				color: var(--z-font-color) !important;
			}
		}
	}
}

.statusbar {
	border: 1px solid var(--z-line);
	border-top: none;
	background-color: rgba(var(--z-bg-secondary-rgb), 0.3);
	display: flex;
	padding: 5px;
	// transition: all 0.15s linear;
	> span {
		font-size: 12px;
		padding-right: 10px;
	}
}

.sheet {
	display: flex;
	flex-wrap: wrap;
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
		will-change: opacity, transform, scroll-position;
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
		will-change: transform, contents;

		.selection {
			color: var(--z-font-color);
			background-color: rgba(var(--z-sheet-virtual-rgb), 1);
		}
	}

	.row {
		display: flex;
		position: relative;
	}

	.cell {
		align-items: flex-start;
		border-right: 1px solid var(--z-line);
		border-bottom: 1px solid var(--z-line);
		box-sizing: border-box;
		color: var(--z-font-color);
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0 4px;

		overflow: hidden;
		user-select: none;

		> :deep(div) {
			line-height: 1;
			&:first-child {
				padding-top: 2px;
			}

			&:last-child {
				padding-bottom: 2px;
			}
		}

		&:focus {
			background-color: var(--z-theme);
			outline: none;
		}
	}

	.custom {
		background-color: rgba(var(--z-bg-secondary-rgb), 0.3);
		flex: none;
		overflow: hidden;
		// transition: opacity 0.15s linear;

		.number-cell {
			align-items: center;
			border-bottom: 1px solid var(--z-line);
			cursor: pointer;
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
				margin: 0 5px;
				text-decoration: none;
			}

			&.selection {
				span {
					// color: var(--z-font-color);
				}
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

			.alphabet-cell {
				cursor: pointer;
				align-items: center;
			}

			.cell {
				border-right: 1px solid var(--z-line);
				border-bottom: 0;
				line-height: 18px;
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
		background-color: rgba(var(--z-bg-secondary-rbg), 0.3);
		height: 18px;
		// transition: opacity 0.15s linear;
	}

	.merged-cell-placeholder {
		box-sizing: border-box;
		border: 1px solid var(--z-border);
		position: relative;
		overflow: visible;
		z-index: 1;
	}

	.selection-box,
	.selection-bg-box {
		position: absolute;
		pointer-events: none;
		z-index: 3;
		// transition: background-color 0.1s;
		will-change: top, left, width, height;

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
	bottom: -3px;
	cursor: row-resize;
	height: 6px;
	position: absolute;
	right: 0;
	// transition: all 0.15s linear;
	width: 100%;
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
	top: 1px;
	left: 0;
	width: 1px;
	background-color: var(--z-main);
	height: 100%;
	pointer-events: none;
	z-index: -1;
}

.mask {
	align-items: center;
	background-color: rgba(var(--z-theme-rgb), 0.8);
	display: flex;
	justify-content: center;
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	div {
		color: var(--z-font-color);
		margin-left: 5px;
	}
}
</style>
