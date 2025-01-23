import {reactive, ref} from 'vue'
export const useResize = (config = {}) => {
	// 行高调整相关
	const rowHeights = reactive({}) // 存储自定义行高
	const colWidths = reactive({}) // 存储自定义列宽
	const isResizing = ref(false) // 是否正在调整大小
	const resizingRow = ref(null) // 当前调整的行
	const startY = ref(0) // 开始拖动时的Y坐标
	const startHeight = ref(0) // 开始拖动时的行高

	const resizingCol = ref(null) // 当前调整的列
	const startX = ref(0) // 开始拖动时的X坐标
	const startWidth = ref(0) // 开始拖动时的列宽

	let rowHeight = config.rowHeight
	let colWidth = config.colWidth

	// 获取行的实际高度
	const getRowHeight = (index) => {
		return rowHeights[index] || rowHeight
	}

	// 获取列的实际宽度
	const getColWidth = (index) => {
		return colWidths[index] || colWidth
	}

	// 开始调整行高
	const startResize = (item, e, direction = 'vertical') => {
		e.preventDefault()
		isResizing.value = true

		if (direction === 'vertical') {
			resizingRow.value = item
			startY.value = e.clientY
			startHeight.value = getRowHeight(item.index)
		} else {
			resizingCol.value = item
			startX.value = e.clientX
			startWidth.value = getColWidth(item.index)
		}

		document.addEventListener('mousemove', onResize)
		document.addEventListener('mouseup', stopResize)
	}

	// 调整大小（行高或列宽）
	const onResize = (e) => {
		if (!isResizing.value) return

		if (resizingRow.value) {
			const deltaY = e.clientY - startY.value
			const newHeight = Math.max(25, startHeight.value + deltaY) // 最小高度25px
			rowHeights[resizingRow.value.index] = newHeight
		}

		if (resizingCol.value) {
			const deltaX = e.clientX - startX.value
			const newWidth = Math.max(100, startWidth.value + deltaX) // 最小宽度100px
			colWidths[resizingCol.value.index] = newWidth
		}
	}

	// 停止调整
	const stopResize = () => {
		if (isResizing.value) {
			if (resizingRow.value) {
				const finalHeight = rowHeights[resizingRow.value.index]
				const rowIndex = resizingRow.value.index
			}

			if (resizingCol.value) {
				const finalWidth = colWidths[resizingCol.value.index]
				const colIndex = resizingCol.value.index
			}

			// 确保在事件监听器移除之前触发最后一次更新
			setTimeout(() => {}, 0)
		}

		isResizing.value = false
		resizingRow.value = null
		resizingCol.value = null

		document.removeEventListener('mousemove', onResize)
		document.removeEventListener('mouseup', stopResize)
	}

	return {
		startResize,
		getRowHeight,
		getColWidth,
		resizingCol,
		resizingRow,
	}
}
