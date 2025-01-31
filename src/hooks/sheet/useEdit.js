import {onActivated, onDeactivated, onMounted} from 'vue'
export const useEdit = (id, config) => {
	const {sheet, renderRange, useResizeHook, useSelectionRangeHook} = config
	let initialized = false
	let container = null
	let enter = false

	const enterContainer = () => {
		enter = true
	}

	const leaveContainer = () => {
		enter = false
	}

	const startEdit = (e, cell = useSelectionRangeHook.getStartCell()) => {
		if (!enter || !cell) return

		const rowIndex = cell.row ?? cell.rowIndex
		const colIndex = cell.col ?? cell.colIndex
		const cellEl = document.querySelector(`[data-cell="${rowIndex}-${colIndex}"]`)

		if (cellEl.getAttribute('contenteditable')) return

		cellEl.setAttribute('contenteditable', 'true')
		// 未双击, 直接输入清空所有内容
		if (cell.rowIndex === undefined) {
			cellEl.innerText = ''
		}
		cellEl.focus()

		// 将光标移到文本末尾
		const range = document.createRange()
		const selection = window.getSelection()
		range.selectNodeContents(cellEl)
		range.collapse(false)
		selection.removeAllRanges()
		selection.addRange(range)

		const setRowHeight = () => {
			let height = 0
			for (let node of cellEl.childNodes) {
				height += node.offsetHeight
			}

			if (height > useResizeHook.getRowHeight(rowIndex)) {
				useResizeHook.setRowHeight(rowIndex, height)
			}
			renderRange()
		}

		const blur = () => {
			sheet.celldata[rowIndex][colIndex] = cellEl.innerText
			setRowHeight()

			cellEl.removeAttribute('contenteditable')
			cellEl.removeEventListener('blur', blur)
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

	onMounted(() => init())
	onActivated(() => init())
	onDeactivated(() => destroy())

	return {
		init,
		destroy,
		startEdit,
		formattedValue,
	}
}
