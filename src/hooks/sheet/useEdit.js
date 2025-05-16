import {ref, reactive, nextTick, watch} from 'vue'
import {formatMap} from '@/hooks/sheet/define'
import {ElMessage} from 'element-plus'

export const useEdit = (id, config) => {
	const {
		sheet,
		renderRange,
		useResizeHook,
		useHistoryHook,
		useMergedCellsHook,
		useSelectionRangeHook,
	} = config
	let initialized = false
	let container = null
	let enter = false
	const inputValue = ref('')
	const editing = ref(false)

	const isFormula = ref(false)
	const formulaStyle = ref({})

	const enterContainer = () => {
		enter = true
	}

	const leaveContainer = () => {
		enter = false
	}

	// 将数字转换为Excel样式的列标题 (A-Z, AA-AZ等)
	const titleCache = new Map()
	const MAX_CACHE_SIZE = 5000 // 设置缓存大小上限

	// 清理缓存的函数
	const cleanTitleCache = () => {
		if (titleCache.size > MAX_CACHE_SIZE) {
			// 删除最早添加的20%的缓存项
			const keysToDelete = Array.from(titleCache.keys()).slice(
				0,
				Math.floor(MAX_CACHE_SIZE * 0.2)
			)
			keysToDelete.forEach((key) => titleCache.delete(key))
		}
	}

	const convertTitle = (input) => {
		// 如果输入是数字，转换为字母
		if (typeof input === 'number') {
			if (input < 0) return ''

			// 使用缓存提高性能
			if (titleCache.has(input)) {
				return titleCache.get(input)
			}

			let title = ''
			let n = input

			// 转换算法
			while (n >= 0) {
				// 获取当前位的字母 (A-Z)
				title = String.fromCharCode(65 + (n % 26)) + title
				// 计算下一位
				n = Math.floor(n / 26) - 1
			}

			// 保存到缓存
			titleCache.set(input, title)

			// 检查并清理缓存
			cleanTitleCache()

			return title
		}
		// 如果输入是字母，转换为数字
		else if (typeof input === 'string') {
			const str = input.toUpperCase()
			let result = 0

			// 遍历字符串中的每个字符
			for (let i = 0; i < str.length; i++) {
				// 获取当前字符的ASCII码并转换为0-25的数字
				const charCode = str.charCodeAt(i) - 65

				// 累加结果：每个位置的字母值乘以26的幂
				result = result * 26 + charCode + 1
			}

			// 因为Excel列是从1开始的，但我们的索引是从0开始的，所以减1
			return result - 1
		}

		// 如果输入既不是数字也不是字符串，返回空字符串
		return ''
	}

	const startEdit = (e, cell = useSelectionRangeHook.getStartCell()) => {
		if (!enter || !cell) return

		// 不允许编辑
		if (!sheet.config.edit) {
			ElMessage.warning('当前表格不支持编辑')
			return
		}

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

		// 不允许编辑锁定的单元格
		if (sheet.config.lockCells[`${rowIndex}-${colIndex}`]) {
			ElMessage.warning(`单元格已锁定`)
			return
		}

		const cellEl = document.querySelector(`[data-cell="${rowIndex}-${colIndex}"]`)

		if (!cellEl || cellEl.getAttribute('contenteditable')) {
			return
		}

		cellEl.setAttribute('contenteditable', 'true')

		// 优化体验而已
		if (cellEl.innerText === '') {
			cellEl.style.lineHeight = useResizeHook.getRowHeight(rowIndex) - 1 + 'px'
		}

		// 未双击, 直接输入清空所有内容
		if (cell.rowIndex === undefined) {
			cellEl.innerText = ''
		}

		cellEl.innerText = setCellFormat(cellEl.innerText, rowIndex, colIndex)

		cellEl.focus()
		editing.value = true

		// 将光标移到文本末尾
		const range = document.createRange()
		const selection = window.getSelection()
		range.selectNodeContents(cellEl)
		range.collapse(false)
		selection.removeAllRanges()
		selection.addRange(range)

		const setFormula = () => {
			isFormula.value = true
			const cellRect = cellEl.getBoundingClientRect()
			const containerRect = container.getBoundingClientRect()

			// 考虑滚动条位置
			const scrollLeft = container.scrollLeft || 0
			const scrollTop = container.scrollTop || 0

			formulaStyle.value = {
				left: cellRect.left - containerRect.left + scrollLeft + 'px',
				top: cellRect.bottom - containerRect.top + scrollTop + 'px',
				width: cellRect.width + 'px',
			}
		}

		const blur = () => {
			sheet.celldata.get(rowIndex)[colIndex] = setCellFormat(
				cellEl.innerText,
				rowIndex,
				colIndex,
				true
			)

			cellEl.removeAttribute('contenteditable')
			cellEl.removeEventListener('blur', blur)
			cellEl.removeEventListener('input', input)
			editing.value = false

			// 使用延时处理，给公式菜单点击事件留出执行时间
			nextTick(() => setFormulaValue())
			setTimeout(() => {
				formulaStyle.value = {}
				isFormula.value = false

				setRowHeight(rowIndex, colIndex)
			}, 250)
		}

		const input = () => {
			// 体验优化而已
			cellEl.style.removeProperty('line-height')

			// 检查是否是公式
			if (cellEl.innerText.startsWith('=')) {
				setFormula()
			}

			inputValue.value = cellEl.innerText
		}

		// 检查是否是公式
		if (e.key === '=') {
			cellEl.innerText = ''
			delete sheet.config.cellFormula[`${rowIndex}-${colIndex}`]
			setFormula()
		}

		cellEl.addEventListener('input', input)
		cellEl.addEventListener('blur', blur)
	}

	const setCellFormat = (text, rowIndex, colIndex, format = false, el = null) => {
		const fmt = sheet.config.cellStyle[`${rowIndex}-${colIndex}`]?.fmt
		const formula = sheet.config.cellFormula[`${rowIndex}-${colIndex}`]

		let output = text
		try {
			if (fmt) {
				output = output.replace(/\/|年|月|日|元|,|:/g, '')
				switch (fmt) {
					case formatMap.ShortDate:
						if (format) {
							// 格式本来正确, 保证match不报错
							if (/^\d{4}\/\d{2}\/\d{2}$/.test(output)) {
								output = output.replace(/\//g, '')
							}

							let [_, year, month, day] = output.match(/^(\d{4})(\d{2})(\d{2})/)

							if (month < 1) {
								month = 1
							}

							if (month > 12) {
								month = 12
							}

							if (day < 1) {
								day = 1
							}

							if (day > 31) {
								day = 31
							}

							if (month === 2 && day > 29) {
								if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
									day = 29
								} else {
									day = 28
								}
							}

							output = `${year}/${month}/${day}`
						} else {
							output = output.replace(/\//g, '')
						}
						break
					case formatMap.LongDate:
						if (format) {
							// 格式本来正确, 保证match不报错
							if (/^\d{4}年\d{2}月\d{2}日$/.test(output)) {
								output = output.replace(/\//g, '')
							}

							let [_, year, month, day] = output.match(/^(\d{4})(\d{2})(\d{2})/)

							if (month < 1) {
								month = 1
							}

							if (month > 12) {
								month = 12
							}

							if (day < 1) {
								day = 1
							}

							if (day > 31) {
								day = 31
							}

							if (month === 2 && day > 29) {
								if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
									day = 29
								} else {
									day = 28
								}
							}

							output = `${year}年${month}月${day}日`
						} else {
							output = output.replace(/年|月|日/g, '')
						}
						break
					case formatMap.Time:
						if (format) {
							// 格式本来正确, 保证match不报错
							if (/^\d{2}:\d{2}:\d{2}$/.test(output)) {
								output = output.replace(/\//g, '')
							}

							let [_, hour, minute, second] = output.match(/^(\d{2})(\d{2})(\d{2})/)

							if (hour < 0) {
								hour = 0
							}

							if (minute < 0) {
								minute = 0
							}

							if (second < 0) {
								second = 0
							}

							if (hour > 23) {
								hour = 23
							}

							if (minute > 59) {
								minute = 59
							}

							if (second > 59) {
								second = 59
							}

							output = `${hour}:${minute}:${second}`
						} else {
							output = output.replace(/:/g, '')
						}
						break
					case formatMap.RMB:
						if (format) {
							if (!/^[0-9.]+$/.test(output)) {
								throw new Error()
							}
							output =
								Number(output)
									.toFixed(2)
									.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '元'
						} else {
							output = output.replace(/元|,/g, '')
						}
						break
				}

				if (!format) {
					// 还原的时候
					sheet.celldata.get(rowIndex)[colIndex] = output
				}

				if (el) {
					el.innerText = output
				}
			}

			if (formula) {
				if (format) {
					sheet.config.cellFormula[`${rowIndex}-${colIndex}`] = output
				} else {
					output = formula
				}
			}
		} catch (error) {
			// ElMes	sage.error(`${fmt}格式错误, 请检查内容`)
			console.error(`${fmt}格式错误, 请检查内容`)
			// useSelectionRangeHook.setRange(rowIndex, colIndex, rowIndex, colIndex)
		}
		return output
	}

	const setCellFormula = (key, _) => {
		const ranged = useSelectionRangeHook.ranged
		const r = Math.min(ranged.start.row, ranged.end.row)
		const c = Math.min(ranged.start.col, ranged.end.col)
		const rr = Math.max(ranged.start.row, ranged.end.row)
		const cc = Math.max(ranged.start.col, ranged.end.col)

		if (!_) {
			const value = sheet.celldata.get(r)[c] || ''
			useHistoryHook.saveHistory({rowIndex: r, colIndex: c, value})
		}

		let lockTimer = null
		for (let row = r; row <= rr; row++) {
			for (let col = c; col <= cc; col++) {
				if (sheet.config.lockCells[`${row}-${col}`]) {
					clearTimeout(lockTimer)
					lockTimer = setTimeout(() => ElMessage.warning('单元格已锁定'), 16)
					continue
				}

				const oldFormula = sheet.config.cellFormula[`${row}-${col}`]
				if (oldFormula) {
					// 取出公式中的参数
					const params = oldFormula.match(/\(([^)]*)\)/)
					if (params) {
						sheet.config.cellFormula[`${row}-${col}`] = `=${key}(${params[1]})`
					}
				} else {
					sheet.config.cellFormula[`${row}-${col}`] = `=${key}()`
				}
				inputValue.value = sheet.config.cellFormula[`${row}-${col}`]
			}
		}
		setFormulaValue()
	}

	const setFormulaValue = () => {
		try {
			const formulas = sheet.config.cellFormula

			// 预编译正则表达式，避免重复创建
			const formulaRegex = /=([A-Z]+)\(([^)]*)\)/
			const colRegex = /[A-Z]+/
			const rowRegex = /\d+/
			const cellRefRegex = /^[A-Z]+\d+$/

			// 获取所有公式条目
			const formulaEntries = Object.entries(formulas)

			// 分批处理公式，每批处理100个
			const batchSize = 100
			let currentBatch = 0

			const processNextBatch = () => {
				// 计算当前批次的起始和结束索引
				const startIdx = currentBatch * batchSize
				const endIdx = Math.min(startIdx + batchSize, formulaEntries.length)

				// 如果已处理完所有批次，则退出
				if (startIdx >= formulaEntries.length) return

				// 处理当前批次的公式
				for (let i = startIdx; i < endIdx; i++) {
					const [key, formula] = formulaEntries[i]

					// 跳过无效公式
					if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) {
						continue
					}

					// 提取行列索引
					const [rowIndex, colIndex] = key.split('-').map(Number)

					// 提取公式名称和参数
					const match = formula.match(formulaRegex)
					if (!match) continue

					const [_, functionName, params] = match
					const paramsList = params.split(',').filter((p) => p.trim())

					// 解析单元格引用并获取值 - 使用闭包避免重复创建函数
					const getCellValue = (cellRef) => {
						// 解析单元格引用，如 A1, B2 等
						const colStr = cellRef.match(colRegex)[0]
						const rowStr = cellRef.match(rowRegex)[0]

						// 转换为行列索引
						const col = convertTitle(colStr)
						const row = parseInt(rowStr) - 1 // 转为0基索引

						// 获取单元格值
						if (sheet.celldata.has(row) && sheet.celldata.get(row)[col] !== undefined) {
							const value = sheet.celldata.get(row)[col]
							// 尝试转换为数字
							return isNaN(Number(value)) ? 0 : Number(value)
						}
						return 0
					}

					// 获取参数值 - 重用数组减少内存分配
					const values = []
					for (let j = 0; j < paramsList.length; j++) {
						const param = paramsList[j].trim()
						// 如果是单元格引用
						if (cellRefRegex.test(param)) {
							values.push(getCellValue(param))
						} else {
							// 如果是数字
							values.push(isNaN(Number(param)) ? 0 : Number(param))
						}
					}

					// 根据函数名执行相应计算
					let result
					switch (functionName) {
						case 'SUM':
							result = values.reduce((sum, val) => sum + val, 0)
							break
						case 'AVERAGE':
							result = values.length
								? values.reduce((sum, val) => sum + val, 0) / values.length
								: 0
							break
						case 'MAX':
							result = values.length ? Math.max(...values) : 0
							break
						case 'MIN':
							result = values.length ? Math.min(...values) : 0
							break
						default:
							result = formula
					}

					// 设置单元格显示值
					if (sheet.celldata.has(rowIndex)) {
						if (!sheet.celldata.get(rowIndex)) {
							sheet.celldata.set(rowIndex, [])
						}
						// 确保 0 值也能正确显示
						sheet.celldata.get(rowIndex)[colIndex] = result === 0 ? '0' : result
					}
				}

				// 增加批次计数
				currentBatch++

				// 如果还有更多批次要处理，使用setTimeout让UI线程有喘息机会
				if (currentBatch * batchSize < formulaEntries.length) {
					setTimeout(processNextBatch, 0)
				}
			}

			// 开始处理第一批
			processNextBatch()
		} catch (error) {
			console.error('公式计算错误:', error)
		}
	}

	const setRowHeight = async (rowIndex, colIndex, needRender = true, needSetRange = true) => {
		let r = rowIndex
		let c = colIndex
		const range = useSelectionRangeHook.ranged

		if (range && !r && !c && r !== 0 && c !== 0) {
			r = Math.min(range.start.row, range.end.row)
			c = Math.min(range.start.col, range.end.col)
		}

		console.log(111, r, c)

		const cellEl = container.querySelector(`[data-cell="${r}-${c}"]`)

		if (!cellEl) return

		// 计算实际内容高度
		let contentHeight = 0
		for (const node of cellEl.childNodes) {
			contentHeight += node.offsetHeight
		}

		if (contentHeight < useResizeHook.getRowHeight(r)) return

		const merge = useMergedCellsHook.findMergedCell(r, c)
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

				if (needSetRange) {
					await nextTick()
					useSelectionRangeHook.setRange(
						merge.row,
						merge.col,
						merge.row + merge.rowspan - 1,
						merge.col + merge.colspan - 1,
						true
					)
				}
			}
		} else if (contentHeight > useResizeHook.getRowHeight(r)) {
			// 非合并单元格的情况
			useResizeHook.setRowHeight(r, contentHeight)
			if (needSetRange) {
				await nextTick()
				useSelectionRangeHook.setRange(r, c, r, c, true)
			}
		}

		needRender && renderRange()
	}

	const settingsCache = new Map()
	const MAX_SETTINGS_CACHE_SIZE = 1000 // 设置缓存大小上限

	// 清理设置缓存的函数
	const cleanSettingsCache = () => {
		if (settingsCache.size > MAX_SETTINGS_CACHE_SIZE) {
			// 删除最早添加的20%的缓存项
			const keysToDelete = Array.from(settingsCache.keys()).slice(
				0,
				Math.floor(MAX_SETTINGS_CACHE_SIZE * 0.2)
			)
			keysToDelete.forEach((key) => settingsCache.delete(key))
		}
	}

	const formattedValue = (val, cell) => {
		if (!val) return ''
		let html = ''
		const arr = val.toString().split('\n')
		for (let item of arr) {
			html += `<div>${item}</div>`
		}

		//动态处理高度
		if (
			(arr.length > 1 || arr[0].length > 10) &&
			cell &&
			!settingsCache.has(`${cell.rowIndex}-${cell.colIndex}`)
		) {
			settingsCache.set(`${cell.rowIndex}-${cell.colIndex}`, cell)
			// 检查并清理缓存
			cleanSettingsCache()
			setTimeout(() => setRowHeight(cell.rowIndex, cell.colIndex, false, false), 0)
		}

		return html
	}

	const setCellValue = (rowIndex, colIndex, value, create = false) => {
		let r = rowIndex
		let c = colIndex
		const range = useSelectionRangeHook.ranged

		if (range && !r && !c) {
			r = Math.min(range.start.row, range.end.row)
			c = Math.min(range.start.col, range.end.col)
		}

		if (sheet.celldata.get(r)) {
			if (c > sheet.config.colCount) {
				sheet.config.colCount = c + 1
			}
			sheet.celldata.get(r)[c] = value
		} else if (create) {
			if (!sheet.celldata.get(r)) {
				sheet.celldata.set(r, reactive([]))
				if (r > sheet.config.rowCount) {
					sheet.config.rowCount = r + 1
				}
			}
			sheet.celldata.get(r)[c] = value
		}

		// 计算公式处理
		const formula = sheet.config.cellFormula[`${r}-${c}`]
		if (formula) {
			sheet.config.cellFormula[`${r}-${c}`] = value
			setFormulaValue()
		}

		// 处理格式
		const fmt = sheet.config.cellStyle[`${r}-${c}`]?.fmt
		if (fmt) {
			sheet.celldata.get(r)[c] = setCellFormat(sheet.celldata.get(r)[c], r, c, true)
		}
	}

	const getCellValue = (rowIndex, colIndex) => {
		if (sheet.celldata.get(rowIndex)) {
			const fmt = sheet.config.cellStyle[`${rowIndex}-${colIndex}`]?.fmt
			if (fmt) {
				return sheet.celldata.get(rowIndex)?.[colIndex]?.replace(/\/|年|月|日|:|,|元/g, '')
			}

			const formula = sheet.config.cellFormula[`${rowIndex}-${colIndex}`]
			if (formula) {
				return formula
			}
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

	watch(
		() => useSelectionRangeHook.ranged,
		() => {
			const ranged = useSelectionRangeHook.ranged
			if (!ranged) return
			const startRow = Math.min(ranged.start.row, ranged.end.row)
			const startCol = Math.min(ranged.start.col, ranged.end.col)
			inputValue.value = getCellValue(startRow, startCol)
		},
		{deep: true}
	)

	// onMounted(() => init())
	// onActivated(() => init())
	// onDeactivated(() => destroy())

	return {
		inputValue,
		editing,
		isFormula,
		formulaStyle,

		init,
		destroy,
		startEdit,
		formattedValue,
		setFormulaValue,
		setCellValue,
		setCellFormula,
		setCellFormat,
		setRowHeight,
		getCellValue,
	}
}
