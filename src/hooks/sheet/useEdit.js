import {ref, reactive, nextTick} from 'vue'
import {ElMessage} from 'element-plus'

export const useEdit = (id, config) => {
	const {sheet, renderRange, useResizeHook, useMergedCellsHook, useSelectionRangeHook} = config
	let initialized = false
	let container = null
	let enter = false
	const editing = ref(false)

	const enterContainer = () => {
		enter = true
	}

	const leaveContainer = () => {
		enter = false
	}

	const startEdit = (e, cell = useSelectionRangeHook.getStartCell()) => {
		if (!enter || !cell) return

		// 检查是否有组合键按下
		if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
			return
		}

		// 允许的特殊按键：退格键、删除键、方向键等
		const allowedKeys = ['Backspace', 'Delete']

		// 如果是功能键，不执行编辑
		if (e.key && e.key.startsWith('F') && /^\d+$/.test(e.key.slice(1))) {
			return
		}

		// 如果不是字母、数字、特殊字符或允许的特殊按键，不执行编辑
		if (e.key && e.key.length > 1 && !allowedKeys.includes(e.key)) {
			return
		}

		const rowIndex = cell.row ?? cell.rowIndex
		const colIndex = cell.col ?? cell.colIndex

		// 不允许编辑
		if (!sheet.config.edit) {
			ElMessage.warning('当前表格不支持编辑')
			return
		}

		// 不允许编辑锁定的单元格
		if (sheet.config.lockCells[`${rowIndex}-${colIndex}`]) {
			ElMessage.warning(`单元格已锁定`)
			return
		}

		const cellEl = document.querySelector(`[data-cell="${rowIndex}-${colIndex}"]`)
		// const originalValue = cellEl?.innerText

		if (!cellEl || cellEl.getAttribute('contenteditable')) {
			return
		}

		cellEl.setAttribute('contenteditable', 'true')

		// 未双击, 直接输入清空所有内容
		if (cell.rowIndex === undefined) {
			cellEl.innerText = ''
		}

		// 将光标移到文本末尾
		const range = document.createRange()
		const selection = window.getSelection()
		range.selectNodeContents(cellEl)
		range.collapse(false)
		selection.removeAllRanges()
		selection.addRange(range)

		cellEl.focus()
		editing.value = true

		const setRowHeight = async () => {
			const merge = useMergedCellsHook.findMergedCell(rowIndex, colIndex)

			// 计算实际内容高度
			let contentHeight = 0
			for (const node of cellEl.childNodes) {
				contentHeight += node.offsetHeight
			}

			// 如果是合并单元格
			if (merge) {
				// 获取合并区域内所有行的当前高度
				const rowHeights = Array(merge.rowspan)
					.fill(0)
					.map((_, index) => useResizeHook.getRowHeight(merge.row + index))

				const mergedTotalHeight = rowHeights.reduce((total, height) => total + height, 0)

				// 如果内容高度超过合并单元格总高度
				if (contentHeight > mergedTotalHeight) {
					// 计算需要增加的高度
					const additionalHeight = contentHeight - mergedTotalHeight
					// 将额外高度添加到第一行
					const newFirstRowHeight = rowHeights[0] + additionalHeight
					useResizeHook.setRowHeight(merge.row, newFirstRowHeight)

					await nextTick()
					useSelectionRangeHook.setRange(
						merge.row,
						merge.col,
						merge.row + merge.rowspan - 1,
						merge.col + merge.colspan - 1,
						true
					)
				}
			} else {
				// 非合并单元格的情况
				if (contentHeight > useResizeHook.getRowHeight(rowIndex)) {
					useResizeHook.setRowHeight(rowIndex, contentHeight)
					await nextTick()
					useSelectionRangeHook.setRange(rowIndex, colIndex, rowIndex, colIndex, true)
				}
			}

			renderRange()
		}

		const blur = () => {
			// if (cellEl.innerText === '') {
			// 	cellEl.innerText = originalValue
			// }
			sheet.celldata.get(rowIndex)[colIndex] = cellEl.innerText
			cellEl.removeAttribute('contenteditable')
			cellEl.removeEventListener('blur', blur)
			editing.value = false
			setTimeout(() => setRowHeight(), 0)
		}

		cellEl.addEventListener('blur', blur)
	}

	const formattedValue = (val) => {
		if (!val) return ''
		let html = ''
		const arr = val.split('\n')
		for (let item of arr) {
			html += `<div>${item}</div>`
		}
		return html
	}

	const setCellValue = (rowIndex, colIndex, value, create = false) => {
		if (sheet.celldata.get(rowIndex)) {
			if (colIndex > sheet.config.colCount) {
				sheet.config.colCount = colIndex + 1
			}
			sheet.celldata.get(rowIndex)[colIndex] = value
		} else if (create) {
			if (!sheet.celldata.get(rowIndex)) {
				sheet.celldata.set(rowIndex, reactive([]))
				if (rowIndex > sheet.config.rowCount) {
					sheet.config.rowCount = rowIndex + 1
				}
			}
			sheet.celldata.get(rowIndex)[colIndex] = value
		}
	}

	const getCellValue = (rowIndex, colIndex) => {
		if (sheet.celldata.get(rowIndex)) {
			return sheet.celldata.get(rowIndex)[colIndex]
		}
		return ''
	}

	const destroy = () => {
		initialized = false
		container.removeEventListener('mouseenter', enterContainer)
		container.removeEventListener('mouseleave', leaveContainer)
		document.removeEventListener('keydown', startEdit)
		container = null
	}

	const init = () => {
		if (initialized) return
		initialized = true
		container = document.querySelector(`#${id}`)

		container.addEventListener('mouseenter', enterContainer)
		container.addEventListener('mouseleave', leaveContainer)
		document.addEventListener('keydown', startEdit)
	}

	// onMounted(() => init())
	// onActivated(() => init())
	// onDeactivated(() => destroy())

	return {
		editing,
		init,
		destroy,
		startEdit,
		formattedValue,
		setCellValue,
		getCellValue,
	}
}
