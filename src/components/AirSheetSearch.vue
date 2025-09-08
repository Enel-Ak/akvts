<script setup>
import {ref, computed, watch, nextTick} from 'vue'
import {ElInput, ElButton, ElLoading} from 'element-plus'
import {useDebounce} from '@/hooks/useDebounce'

// 组件 props 定义
const props = defineProps({
	// 表格数据对象，包含 celldata、config 等
	sheet: {
		type: Object,
		required: true,
		validator: (value) => {
			return value && typeof value === 'object' && value.celldata
		},
	},
	// 是否显示搜索组件
	visible: {
		type: Boolean,
		default: false,
	},
	// 容器引用，用于滚动控制
	containerRef: {
		type: Object,
		default: null,
	},
	// 滚动相关的响应式数据
	scrollData: {
		type: Object,
		default: () => ({
			scrollTop: 0,
			scrollLeft: 0,
			viewportHeight: 0,
			viewportWidth: 0,
		}),
	},
	// 可见范围数据
	visibleRange: {
		type: Object,
		default: () => ({
			startRow: 0,
			endRow: 0,
			startCol: 0,
			endCol: 0,
		}),
	},
	// 行高和列宽配置
	dimensions: {
		type: Object,
		default: () => ({
			rowHeight: 25,
			colWidth: 100,
			zoom: 1,
		}),
	},
	// 调整大小的行列配置
	resizeConfig: {
		type: Object,
		default: () => ({
			rResize: {},
			cResize: {},
		}),
	},
})

// 组件 emits 定义
const emits = defineEmits([
	'scroll-to-cell', // 滚动到指定单元格 { row, col, center }
	'update:visible', // 更新显示状态
	'search-status', // 搜索状态变化 { active, keyword, results, currentIndex }
	'cell-highlight', // 高亮单元格 { row, col, highlight }
	'selection-change', // 选择变化 { row, col, range }
])

// 搜索相关状态
const searchKeyword = ref('')
const searchResults = ref([])
const currentIndex = ref(-1)
const isSearching = ref(false)
const showAllResults = ref(false)

// 性能优化相关状态
const maxDisplayResults = ref(100) // 最大显示结果数
const resultPage = ref(0) // 当前页码
const resultsPerPage = ref(50) // 每页结果数

// 搜索统计信息
const searchStats = computed(() => {
	const total = searchResults.value.length
	const current = currentIndex.value >= 0 ? currentIndex.value + 1 : 0
	return {current, total}
})

// 是否有搜索结果
const hasResults = computed(() => searchResults.value.length > 0)

// 当前选中的搜索结果
const currentResult = computed(() => {
	if (currentIndex.value >= 0 && currentIndex.value < searchResults.value.length) {
		return searchResults.value[currentIndex.value]
	}
	return null
})

// 分页相关计算属性
const totalPages = computed(() => {
	return Math.ceil(searchResults.value.length / resultsPerPage.value)
})

const displayedResults = computed(() => {
	const total = searchResults.value.length

	// 如果结果数量较少，直接显示全部
	if (total <= maxDisplayResults.value) {
		return searchResults.value
	}

	// 分页显示
	const start = resultPage.value * resultsPerPage.value
	const end = Math.min(start + resultsPerPage.value, total)
	return searchResults.value.slice(start, end)
})

const hasMoreResults = computed(() => {
	return searchResults.value.length > maxDisplayResults.value
})

const paginationInfo = computed(() => {
	const total = searchResults.value.length
	const currentPageStart = resultPage.value * resultsPerPage.value + 1
	const currentPageEnd = Math.min((resultPage.value + 1) * resultsPerPage.value, total)

	return {
		currentPageStart,
		currentPageEnd,
		total,
		currentPage: resultPage.value + 1,
		totalPages: totalPages.value,
	}
})

// 搜索结果管理辅助方法
const updateCurrentIndex = (newIndex) => {
	if (searchResults.value.length === 0) {
		currentIndex.value = -1
		return
	}

	// 确保索引在有效范围内
	if (newIndex < 0) {
		currentIndex.value = searchResults.value.length - 1 // 循环到最后一个
	} else if (newIndex >= searchResults.value.length) {
		currentIndex.value = 0 // 循环到第一个
	} else {
		currentIndex.value = newIndex
	}

	// 发送状态更新事件
	emits('search-status', {
		active: true,
		keyword: searchKeyword.value,
		results: searchResults.value.length,
		currentIndex: currentIndex.value,
	})
}

// 获取指定索引的搜索结果
const getResultByIndex = (index) => {
	if (index >= 0 && index < searchResults.value.length) {
		return searchResults.value[index]
	}
	return null
}

// 查找包含指定位置的搜索结果索引
const findResultIndexByPosition = (row, col) => {
	return searchResults.value.findIndex((result) => result.row === row && result.col === col)
}

// 重置搜索状态
const resetSearchState = () => {
	searchResults.value = []
	currentIndex.value = -1
	showAllResults.value = false
	isSearching.value = false
	resultPage.value = 0
}

// 分页控制方法
const goToPage = (page) => {
	if (page >= 0 && page < totalPages.value) {
		resultPage.value = page
	}
}

const goToNextPage = () => {
	if (resultPage.value < totalPages.value - 1) {
		resultPage.value++
	}
}

const goToPrevPage = () => {
	if (resultPage.value > 0) {
		resultPage.value--
	}
}

// 性能优化：防抖搜索
const performSearchDebounced = useDebounce(async (keyword) => {
	await performSearch(keyword)
}, 300)

// 搜索方法实现
const performSearch = async (keyword) => {
	if (!keyword || !props.sheet?.celldata) {
		searchResults.value = []
		currentIndex.value = -1
		emits('search-status', {active: false, keyword: '', results: 0, currentIndex: -1})
		return
	}

	// 防止重复搜索
	if (isSearching.value) {
		return
	}

	isSearching.value = true
	const results = []
	const searchTerm = keyword.toLowerCase()
	const maxResults = 1000 // 限制最大搜索结果数量，避免性能问题

	try {
		// 遍历 celldata 进行搜索
		const celldata = props.sheet.celldata

		// 如果 celldata 是 Map 类型
		if (celldata instanceof Map) {
			for (const [rowIndex, rowData] of celldata.entries()) {
				if (Array.isArray(rowData)) {
					for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
						// 检查是否达到最大结果数量
						if (results.length >= maxResults) {
							break
						}

						const cellValue = rowData[colIndex]
						if (cellValue != null && cellValue !== '') {
							const cellText = String(cellValue).toLowerCase()
							if (cellText.includes(searchTerm)) {
								results.push({
									row: rowIndex,
									col: colIndex,
									content: String(cellValue),
									originalContent: cellValue,
								})
							}
						}
					}
				}

				// 检查是否达到最大结果数量
				if (results.length >= maxResults) {
					break
				}
			}
		}
		// 如果 celldata 是二维数组
		else if (Array.isArray(celldata)) {
			for (let rowIndex = 0; rowIndex < celldata.length; rowIndex++) {
				const rowData = celldata[rowIndex]
				if (Array.isArray(rowData)) {
					for (let colIndex = 0; colIndex < rowData.length; colIndex++) {
						// 检查是否达到最大结果数量
						if (results.length >= maxResults) {
							break
						}

						const cellValue = rowData[colIndex]
						if (cellValue != null && cellValue !== '') {
							const cellText = String(cellValue).toLowerCase()
							if (cellText.includes(searchTerm)) {
								results.push({
									row: rowIndex,
									col: colIndex,
									content: String(cellValue),
									originalContent: cellValue,
								})
							}
						}
					}
				}

				// 检查是否达到最大结果数量
				if (results.length >= maxResults) {
					break
				}
			}
		}

		// 按行列顺序排序结果
		results.sort((a, b) => {
			if (a.row !== b.row) {
				return a.row - b.row
			}
			return a.col - b.col
		})

		searchResults.value = results
		currentIndex.value = results.length > 0 ? 0 : -1

		// 发送搜索状态更新事件
		emits('search-status', {
			active: true,
			keyword: keyword,
			results: results.length,
			currentIndex: currentIndex.value,
			hasMore: results.length >= maxResults,
		})

		// 如果有结果，自动跳转到第一个结果
		if (results.length > 0) {
			jumpToResult(results[0])
		} else {
			// 没有找到结果时的提示
			console.log(`未找到包含 "${keyword}" 的单元格`)
		}

		// 如果达到最大结果数量，给出提示
		if (results.length >= maxResults) {
			console.warn(`搜索结果过多，仅显示前 ${maxResults} 个结果`)
		}
	} catch (error) {
		console.error('搜索过程中发生错误:', error)
		searchResults.value = []
		currentIndex.value = -1
		emits('search-status', {
			active: false,
			keyword: '',
			results: 0,
			currentIndex: -1,
			error: error.message,
		})

		// 可以在这里添加用户友好的错误提示
		// ElMessage.error('搜索时发生错误，请重试')
	} finally {
		isSearching.value = false
	}
}

// 查找上一个
const findPrevious = () => {
	if (!hasResults.value) {
		return
	}

	const newIndex = currentIndex.value - 1
	updateCurrentIndex(newIndex)

	// 跳转到新的结果位置
	const result = currentResult.value
	if (result) {
		jumpToResult(result)
	}
}

// 查找下一个
const findNext = () => {
	if (!hasResults.value) {
		return
	}

	const newIndex = currentIndex.value + 1
	updateCurrentIndex(newIndex)

	// 跳转到新的结果位置
	const result = currentResult.value
	if (result) {
		jumpToResult(result)
	}
}

// 查找全部
const findAll = () => {
	if (!hasResults.value) {
		return
	}

	showAllResults.value = !showAllResults.value

	// 如果显示全部结果，确保当前结果在列表中可见
	if (showAllResults.value && currentResult.value) {
		nextTick(() => {
			scrollResultIntoView(currentIndex.value)
		})
	}
}

// 滚动结果列表中的指定项到可视区域
const scrollResultIntoView = (index) => {
	if (index < 0 || index >= searchResults.value.length) {
		return
	}

	const resultsList = document.querySelector('.air-sheet-search .results-list')
	const resultItem = resultsList?.querySelector(`.result-item:nth-child(${index + 1})`)

	if (resultItem && resultsList) {
		const itemTop = resultItem.offsetTop
		const itemHeight = resultItem.offsetHeight
		const listScrollTop = resultsList.scrollTop
		const listHeight = resultsList.clientHeight

		// 检查是否需要滚动
		if (itemTop < listScrollTop) {
			// 项目在可视区域上方，滚动到顶部
			resultsList.scrollTop = itemTop
		} else if (itemTop + itemHeight > listScrollTop + listHeight) {
			// 项目在可视区域下方，滚动到底部
			resultsList.scrollTop = itemTop + itemHeight - listHeight
		}
	}
}

// 平滑滚动辅助方法
const smoothScrollTo = (element, targetScrollTop, targetScrollLeft, duration = 300) => {
	if (!element) return Promise.resolve()

	return new Promise((resolve) => {
		const startScrollTop = element.scrollTop
		const startScrollLeft = element.scrollLeft
		const changeScrollTop = targetScrollTop - startScrollTop
		const changeScrollLeft = targetScrollLeft - startScrollLeft
		const startTime = performance.now()

		const animateScroll = (currentTime) => {
			const timeElapsed = currentTime - startTime
			const progress = Math.min(timeElapsed / duration, 1)

			// 使用 easeInOutQuad 缓动函数
			const easeProgress =
				progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress

			element.scrollTop = startScrollTop + changeScrollTop * easeProgress
			element.scrollLeft = startScrollLeft + changeScrollLeft * easeProgress

			if (progress < 1) {
				requestAnimationFrame(animateScroll)
			} else {
				resolve()
			}
		}

		requestAnimationFrame(animateScroll)
	})
}

// 计算单元格位置的辅助方法
const calculateCellPosition = (row, col) => {
	const dimensions = props.dimensions
	const resizeConfig = props.resizeConfig
	const zoom = dimensions.zoom || 1

	let top = 0
	let left = 0

	// 计算到目标行的累积高度
	for (let i = 0; i < row; i++) {
		const customHeight = resizeConfig.rResize?.[i]
		const rowHeight = customHeight ? customHeight * zoom : dimensions.rowHeight * zoom
		top += rowHeight
	}

	// 计算到目标列的累积宽度
	for (let i = 0; i < col; i++) {
		const customWidth = resizeConfig.cResize?.[i]
		const colWidth = customWidth ? customWidth * zoom : dimensions.colWidth * zoom
		left += colWidth
	}

	return {top, left}
}

// 计算居中滚动位置
const calculateCenterScrollPosition = (cellTop, cellLeft) => {
	const scrollData = props.scrollData
	const dimensions = props.dimensions
	const zoom = dimensions.zoom || 1

	// 获取当前单元格的尺寸
	const cellHeight = dimensions.rowHeight * zoom
	const cellWidth = dimensions.colWidth * zoom

	// 计算居中位置
	const centerTop = cellTop - scrollData.viewportHeight / 2 + cellHeight / 2
	const centerLeft = cellLeft - scrollData.viewportWidth / 2 + cellWidth / 2

	// 确保滚动位置不超出边界
	const maxScrollTop = Math.max(0, cellTop)
	const maxScrollLeft = Math.max(0, cellLeft)

	return {
		top: Math.max(0, Math.min(centerTop, maxScrollTop)),
		left: Math.max(0, Math.min(centerLeft, maxScrollLeft)),
	}
}

// 跳转到指定结果
const jumpToResult = (result) => {
	if (!result || !props.containerRef) {
		return
	}

	try {
		// 计算单元格位置
		const cellPosition = calculateCellPosition(result.row, result.col)

		// 计算居中滚动位置
		const scrollPosition = calculateCenterScrollPosition(cellPosition.top, cellPosition.left)

		// 发送滚动事件
		emits('scroll-to-cell', {
			row: result.row,
			col: result.col,
			scrollTop: scrollPosition.top,
			scrollLeft: scrollPosition.left,
			center: true,
		})

		// 添加视觉反馈效果
		addVisualFeedback(result.row, result.col)

		// 更新当前结果索引
		const resultIndex = findResultIndexByPosition(result.row, result.col)
		if (resultIndex >= 0) {
			currentIndex.value = resultIndex
		}
	} catch (error) {
		console.error('跳转到搜索结果时发生错误:', error)
	}
}

// 清空搜索
const clearSearch = () => {
	searchKeyword.value = ''
	resetSearchState()
	emits('search-status', {active: false, keyword: '', results: 0, currentIndex: -1})
}

// 关闭搜索组件
const closeSearch = () => {
	clearSearch()
	emits('update:visible', false)
}

// 监听搜索关键词变化
const debouncedSearch = useDebounce(performSearch, 300)
watch(searchKeyword, (newKeyword) => {
	if (newKeyword.trim()) {
		// 如果关键词长度小于2，不进行搜索（可选的性能优化）
		if (newKeyword.trim().length >= 1) {
			debouncedSearch(newKeyword.trim())
		}
	} else {
		clearSearch()
	}
})

// 键盘事件处理
const handleKeydown = (event) => {
	if (!props.visible || !hasResults.value) {
		return
	}

	switch (event.key) {
		case 'Enter':
			if (event.shiftKey) {
				event.preventDefault()
				findPrevious()
			} else {
				event.preventDefault()
				findNext()
			}
			break
		case 'Escape':
			event.preventDefault()
			closeSearch()
			break
		case 'F3':
			event.preventDefault()
			if (event.shiftKey) {
				findPrevious()
			} else {
				findNext()
			}
			break
	}
}

// 添加视觉反馈效果
const addVisualFeedback = (row, col) => {
	// 发送高亮事件给父组件
	emits('cell-highlight', {
		row,
		col,
		highlight: true,
		duration: 2000, // 高亮持续时间
	})

	// 发送选择变化事件
	emits('selection-change', {
		row,
		col,
		range: {startRow: row, endRow: row, startCol: col, endCol: col},
	})
}

// 移除视觉反馈效果
const removeVisualFeedback = () => {
	emits('cell-highlight', {
		row: -1,
		col: -1,
		highlight: false,
	})
}

// 监听显示状态变化
watch(
	() => props.visible,
	(visible) => {
		if (visible) {
			// 组件显示时聚焦搜索框并添加键盘监听
			nextTick(() => {
				const searchInput = document.querySelector('.air-sheet-search .el-input__inner')
				if (searchInput) {
					searchInput.focus()
				}
			})

			// 添加全局键盘事件监听
			document.addEventListener('keydown', handleKeydown)
		} else {
			// 组件隐藏时清理状态和事件监听
			clearSearch()
			removeVisualFeedback()
			document.removeEventListener('keydown', handleKeydown)
		}
	}
)

// 高亮搜索关键词
const highlightSearchTerm = (text) => {
	if (!searchKeyword.value || !text) {
		return text
	}

	const keyword = searchKeyword.value.toLowerCase()
	const textLower = text.toLowerCase()
	const index = textLower.indexOf(keyword)

	if (index === -1) {
		return text
	}

	const before = text.substring(0, index)
	const match = text.substring(index, index + keyword.length)
	const after = text.substring(index + keyword.length)

	return `${before}<mark class="search-highlight">${match}</mark>${after}`
}

// 结果项悬停处理
const onResultHover = (index) => {
	// 可以在这里添加悬停预览功能
	// 暂时不实现，保留接口
}

// 获取结果列表引用
const resultsListRef = ref(null)

// 监听当前索引变化，更新结果列表滚动位置
watch(currentIndex, (newIndex) => {
	if (newIndex >= 0 && showAllResults.value) {
		nextTick(() => {
			scrollResultIntoView(newIndex)
		})
	}
})

// 监听搜索结果变化，重置列表滚动位置
watch(searchResults, () => {
	if (resultsListRef.value) {
		resultsListRef.value.scrollTop = 0
	}
})
</script>

<template>
	<div v-if="visible" class="air-sheet-search" :class="{'show-results': showAllResults}">
		<!-- 搜索控制区域 -->
		<div class="search-controls">
			<!-- 搜索输入框 -->
			<div class="search-input-wrapper">
				<el-input
					v-model="searchKeyword"
					placeholder="请输入搜索内容..."
					clearable
					size="small"
					class="search-input"
					@keyup.enter="findNext"
					@keyup.esc="closeSearch"
				>
					<template #prefix>
						<i class="el-icon-search"></i>
					</template>
				</el-input>

				<!-- 搜索统计 -->
				<div v-if="hasResults" class="search-stats">
					{{ searchStats.current }}/{{ searchStats.total }}
					<span
						v-if="searchResults.length >= 1000"
						class="max-results-hint"
						title="结果过多，仅显示前1000项"
						>+</span
					>
				</div>
			</div>

			<!-- 操作按钮组 -->
			<div class="search-buttons">
				<el-button
					size="small"
					:disabled="!hasResults"
					@click="findPrevious"
					title="查找上一个 (Shift+Enter)"
				>
					上一个
				</el-button>

				<el-button
					size="small"
					:disabled="!hasResults"
					@click="findNext"
					title="查找下一个 (Enter)"
				>
					下一个
				</el-button>

				<el-button
					size="small"
					:disabled="!hasResults"
					@click="findAll"
					:type="showAllResults ? 'primary' : 'default'"
					title="显示/隐藏全部结果"
				>
					全部 ({{ searchStats.total }})
				</el-button>

				<el-button size="small" @click="closeSearch" title="关闭搜索 (Esc)">
					关闭
				</el-button>
			</div>
		</div>

		<!-- 搜索结果列表 -->
		<div v-if="showAllResults && hasResults" class="search-results">
			<div class="results-header">
				<span>搜索结果 ({{ searchStats.total }} 项)</span>
				<div class="results-actions">
					<el-button
						size="small"
						text
						@click="showAllResults = false"
						title="隐藏结果列表"
					>
						<i class="el-icon-arrow-up"></i>
					</el-button>
				</div>
			</div>

			<!-- 分页信息 -->
			<div v-if="hasMoreResults" class="pagination-info">
				<span
					>显示 {{ paginationInfo.currentPageStart }}-{{
						paginationInfo.currentPageEnd
					}}
					项，共 {{ paginationInfo.total }} 项</span
				>
				<div class="pagination-controls">
					<el-button
						size="small"
						:disabled="resultPage === 0"
						@click="goToPrevPage"
						title="上一页"
					>
						<i class="el-icon-arrow-left"></i>
					</el-button>
					<span class="page-info"
						>{{ paginationInfo.currentPage }}/{{ paginationInfo.totalPages }}</span
					>
					<el-button
						size="small"
						:disabled="resultPage >= totalPages - 1"
						@click="goToNextPage"
						title="下一页"
					>
						<i class="el-icon-arrow-right"></i>
					</el-button>
				</div>
			</div>

			<div class="results-list" ref="resultsListRef">
				<div
					v-for="(result, index) in displayedResults"
					:key="`${result.row}-${result.col}`"
					class="result-item"
					:class="{active: searchResults.indexOf(result) === currentIndex}"
					@click="jumpToResult(result)"
					@mouseenter="onResultHover(searchResults.indexOf(result))"
					:title="`跳转到 行${result.row + 1}, 列${result.col + 1}`"
				>
					<div class="result-content">
						<span
							class="result-text"
							v-html="highlightSearchTerm(result.content)"
						></span>
					</div>
					<div class="result-location">
						<span class="location-text"
							>行 {{ result.row + 1 }}, 列 {{ result.col + 1 }}</span
						>
						<span
							v-if="searchResults.indexOf(result) === currentIndex"
							class="current-indicator"
							>当前</span
						>
					</div>
				</div>
			</div>
		</div>

		<!-- 加载状态 -->
		<div v-if="isSearching" class="search-loading">
			<el-loading text="搜索中..." />
		</div>
	</div>
</template>

<style scoped lang="scss">
.air-sheet-search {
	position: absolute;
	top: 10px;
	right: 10px;
	background: var(--z-theme);
	border: 1px solid rgba(var(--z-line-rgb), 0.3);
	border-radius: 8px;
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12), 0 3px 6px rgba(0, 0, 0, 0.08);
	z-index: 1000;
	min-width: 420px;
	max-width: 520px;
	font-size: var(--z-font-size-base);

	&.show-results {
		max-height: 65vh;
		overflow: hidden;
	}

	.search-controls {
		padding: 16px;
		border-bottom: 1px solid rgba(var(--z-line-rgb), 0.2);
		background: var(--z-theme);

		.search-input-wrapper {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 12px;

			.search-input {
				flex: 1;

				:deep(.el-input__inner) {
					border-radius: 6px;
					border: 1px solid rgba(var(--z-line-rgb), 0.3);
					font-size: 13px;
					height: 32px;

					&:focus {
						border-color: var(--z-primary);
						box-shadow: 0 0 0 2px rgba(var(--z-primary-rgb), 0.1);
					}
				}

				:deep(.el-input__prefix) {
					color: var(--z-font-color-secondary);
				}
			}

			.search-stats {
				font-size: 12px;
				color: var(--z-font-color-secondary);
				white-space: nowrap;
				min-width: 50px;
				text-align: center;
				padding: 4px 8px;
				background: var(--z-bg-gray);
				border-radius: 4px;
				font-weight: 500;
				display: flex;
				align-items: center;
				gap: 2px;

				.max-results-hint {
					color: var(--z-warning);
					font-weight: 600;
					font-size: 10px;
				}
			}
		}

		.search-buttons {
			display: flex;
			gap: 8px;
			justify-content: flex-end;

			.el-button {
				font-size: 12px;
				padding: 6px 12px;
				height: 28px;
				border-radius: 4px;
				font-weight: 500;

				&.el-button--small {
					min-width: 60px;
				}

				&:not(.el-button--primary) {
					border: 1px solid rgba(var(--z-line-rgb), 0.3);
					background: var(--z-theme);
					color: var(--z-font-color);

					&:hover {
						border-color: var(--z-primary);
						color: var(--z-primary);
					}

					&:disabled {
						opacity: 0.5;
						cursor: not-allowed;
					}
				}

				&.el-button--primary {
					background: var(--z-primary);
					border-color: var(--z-primary);

					&:hover {
						background: var(--z-primary);
						opacity: 0.9;
					}
				}
			}
		}
	}

	.search-results {
		max-height: 320px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--z-theme);

		.results-header {
			padding: 10px 16px;
			background: var(--z-bg-gray);
			border-bottom: 1px solid rgba(var(--z-line-rgb), 0.2);
			font-size: 12px;
			font-weight: 600;
			color: var(--z-font-color);
			display: flex;
			align-items: center;
			justify-content: space-between;

			.results-actions {
				display: flex;
				align-items: center;
				gap: 4px;

				.el-button {
					padding: 2px 4px;
					font-size: 12px;
					color: var(--z-font-color-secondary);

					&:hover {
						color: var(--z-primary);
					}
				}
			}
		}

		.pagination-info {
			padding: 8px 16px;
			background: var(--z-bg-gray);
			border-bottom: 1px solid rgba(var(--z-line-rgb), 0.1);
			display: flex;
			align-items: center;
			justify-content: space-between;
			font-size: 11px;
			color: var(--z-font-color-secondary);

			.pagination-controls {
				display: flex;
				align-items: center;
				gap: 8px;

				.el-button {
					padding: 2px 6px;
					font-size: 12px;
					min-width: 24px;
					height: 24px;

					&:disabled {
						opacity: 0.4;
					}
				}

				.page-info {
					font-size: 11px;
					font-weight: 500;
					color: var(--z-font-color);
					min-width: 40px;
					text-align: center;
				}
			}
		}

		.results-list {
			flex: 1;
			overflow-y: auto;
			max-height: 280px;

			&::-webkit-scrollbar {
				width: 6px;
			}

			&::-webkit-scrollbar-track {
				background: var(--z-bg-gray);
			}

			&::-webkit-scrollbar-thumb {
				background: rgba(var(--z-line-rgb), 0.4);
				border-radius: 3px;

				&:hover {
					background: rgba(var(--z-line-rgb), 0.6);
				}
			}

			.result-item {
				padding: 12px 16px;
				border-bottom: 1px solid rgba(var(--z-line-rgb), 0.1);
				cursor: pointer;
				transition: all 0.2s ease;
				position: relative;

				&:hover {
					background: var(--z-bg-gray);
				}

				&.active {
					background: var(--z-primary);
					color: white;

					.result-location {
						color: rgba(255, 255, 255, 0.8);
					}

					&::before {
						content: '';
						position: absolute;
						left: 0;
						top: 0;
						bottom: 0;
						width: 3px;
						background: rgba(255, 255, 255, 0.8);
					}
				}

				&:last-child {
					border-bottom: none;
				}

				.result-content {
					margin-bottom: 6px;

					.result-text {
						font-size: 13px;
						font-weight: 500;
						word-break: break-all;
						line-height: 1.4;
						display: -webkit-box;
						-webkit-line-clamp: 2;
						-webkit-box-orient: vertical;
						overflow: hidden;
					}
				}

				.result-location {
					font-size: 11px;
					color: var(--z-font-color-secondary);
					font-weight: 500;
					opacity: 0.8;
					display: flex;
					align-items: center;
					justify-content: space-between;

					.location-text {
						flex: 1;
					}

					.current-indicator {
						background: var(--z-primary);
						color: white;
						padding: 1px 6px;
						border-radius: 10px;
						font-size: 10px;
						font-weight: 600;
						margin-left: 8px;
					}
				}
			}
		}
	}

	.search-loading {
		padding: 24px;
		text-align: center;
		color: var(--z-font-color-secondary);
	}

	// 搜索高亮样式
	:deep(.search-highlight) {
		background: var(--z-warning);
		color: var(--z-font-color);
		padding: 1px 2px;
		border-radius: 2px;
		font-weight: 600;
	}

	// 响应式设计
	@media (max-width: 768px) {
		min-width: 320px;
		max-width: 90vw;
		top: 5px;
		right: 5px;

		.search-controls {
			padding: 12px;

			.search-input-wrapper {
				gap: 8px;
				margin-bottom: 10px;
			}

			.search-buttons {
				gap: 6px;

				.el-button {
					font-size: 11px;
					padding: 4px 8px;
					min-width: 50px;
				}
			}
		}

		.search-results {
			max-height: 250px;

			.results-list {
				max-height: 200px;

				.result-item {
					padding: 10px 12px;
				}
			}
		}
	}
}
</style>
