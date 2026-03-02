import {ref, reactive, nextTick, watch, onMounted} from 'vue'
import {formatMap} from '@/hooks/sheet/define'
import {ElMessage} from 'element-plus'
import {useAirSheetStore} from '../store/useAirSheet'
import {useDebounce} from '@/hooks'

export const useEdit = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let initialized = false
	let container = null
	let enter = false
	const inputValue = ref('')
	const editing = ref(false)

	const isFormula = ref(false)
	const formulaStyle = ref({})

	// 公式编辑撤销功能 - 保存原始状态
	let originalFormulaState = null
	let isRestoring = false // 标记是否正在还原状态

	// 保存公式编辑前的原始状态
	const saveOriginalFormulaState = (cell) => {
		// 避免重复保存
		if (originalFormulaState) return

		const cellKey = `${cell.r}-${cell.c}`
		const cellEl = document.querySelector(`[data-cell="${cellKey}"]`)

		// 获取单元格的实际数据内容
		const cellData = sheet.celldata.get(cell.r)?.[cell.c] || ''

		originalFormulaState = {
			cellKey,
			cell: {r: cell.r, c: cell.c},
			originalContent: cellEl ? cellEl.innerText : '',
			originalCellData: cellData, // 保存实际的单元格数据
			originalFormula: sheet.config.formulaed[cellKey] || null,
			originalFormulaMap: sheet.config.formulaMap[cellKey]
				? JSON.parse(JSON.stringify(sheet.config.formulaMap[cellKey]))
				: null,
		}

		console.log('保存原始公式状态:', originalFormulaState)
	}

	// 还原公式编辑前的原始状态
	const restoreOriginalFormulaState = () => {
		if (!originalFormulaState) {
			console.log('没有保存的原始状态，无法还原')
			return
		}

		// 设置还原状态标记，防止实时同步干扰
		isRestoring = true

		const {
			cellKey,
			cell,
			originalContent,
			originalCellData,
			originalFormula,
			originalFormulaMap,
		} = originalFormulaState

		const cellEl = document.querySelector(`[data-cell="${cellKey}"]`)
		const {r, c} = cell

		console.log('开始还原原始公式状态:', originalFormulaState)

		// 还原单元格显示内容
		if (cellEl) {
			inputValue.value = originalFormula
			cellEl.innerText = originalContent
			// 移除编辑状态
			cellEl.removeAttribute('contenteditable')
		}

		// 还原单元格数据
		if (!sheet.celldata.get(r)) {
			sheet.celldata.set(r, [])
		}
		sheet.celldata.get(r)[c] = originalCellData

		// 还原公式配置
		if (originalFormula) {
			sheet.config.formulaed[cellKey] = originalFormula
		} else {
			delete sheet.config.formulaed[cellKey]
		}

		// 还原公式映射
		if (originalFormulaMap && originalFormulaMap.length > 0) {
			sheet.config.formulaMap[cellKey] = JSON.parse(JSON.stringify(originalFormulaMap))
		} else {
			delete sheet.config.formulaMap[cellKey]
		}

		// 重新计算公式值（如果有公式的话）
		if (originalFormula) {
			nextTick(() => {
				setFormulaValue()
			})
		}

		console.log('完成还原原始公式状态')
		originalFormulaState = null

		// 清除还原状态标记
		setTimeout(() => {
			isRestoring = false
		}, 100)
	}

	// 清除保存的原始状态（确认编辑时调用）
	const clearOriginalFormulaState = () => {
		originalFormulaState = null
	}

	// 获取正在编辑的单元格坐标
	const getEditingCellPosition = () => {
		console.log('getEditingCellPosition 调用:', {
			hasOriginalState: !!originalFormulaState,
			originalFormulaState: originalFormulaState
				? {
						cellKey: originalFormulaState.cellKey,
						cell: originalFormulaState.cell,
					}
				: null,
		})

		if (originalFormulaState && originalFormulaState.cell) {
			return {
				r: originalFormulaState.cell.r,
				c: originalFormulaState.cell.c,
			}
		}
		return null
	}

	const enterContainer = (e) => {
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

	const startEdit = (e, cell = sheet.hooks.selectionRangeHook.getStartCell()) => {
		const cellEl = document.querySelector(
			`#${sheet.containerId} [data-cell="${cell.r}-${cell.c}"]`
		)

		// 检查是否是公式单元格，如果是则保存原始状态
		const cellKey = `${cell.r}-${cell.c}`
		const hasFormula =
			sheet.config.formulaed[cellKey] || (cellEl && cellEl.innerText.startsWith('='))
		if (hasFormula) {
			saveOriginalFormulaState(cell)
		}

		const setFormula = () => {
			console.log('setFormula 被调用', {
				cellEl: !!cellEl,
				container: !!container,
				cell,
			})

			if (!cellEl || !container) {
				console.error('setFormula: cellEl 或 container 未定义')
				return
			}

			isFormula.value = true

			const cellRect = cellEl.getBoundingClientRect()
			const containerRect = container.getBoundingClientRect()

			// 考虑滚动条位置
			const scrollLeft = container.scrollLeft || 0
			const scrollTop = container.scrollTop || 0

			// formulaStyle.value = {
			// 	left: cellRect.left - containerRect.left + scrollLeft + 'px',
			// 	top: cellRect.bottom - containerRect.top + scrollTop + 'px',
			// 	width: cellRect.width + 'px',
			// }

			// console.log('公式菜单样式已设置', {
			// 	isFormula: isFormula.value,
			// 	formulaStyle: formulaStyle.value,
			// })

			sheet.state.formulaStyle = {
				left: cellRect.left - containerRect.left + scrollLeft + 'px',
				top: cellRect.bottom - containerRect.top + scrollTop + 'px',
				width: cellRect.width + 'px',
			}

			// 进入公式编辑模式时保存原始状态
			if (!originalFormulaState) {
				saveOriginalFormulaState(cell)
			}

			sheet.state.formula = true
			sheet.state.openformula = true
		}

		let reqTimer = null
		let beforeValue = cellEl?.innerText || ''
		let isAutoSave = false
		const focus = () => {
			if (!sheet.config.synergy) {
				return
			}

			let lastTime = 0
			let fn = () => {
				reqTimer = requestAnimationFrame((time) => {
					if (time - lastTime >= 1000) {
						if (isAutoSave && beforeValue !== cellEl.innerText && lastTime !== 0) {
							console.log('自动保存协同同步:', {
								sheetId: sheet.original.sheetId || sheet.id,
								row: cell.r,
								col: cell.c,
								before: beforeValue,
								after: cellEl.innerText,
							})
							sheet.hooks.synergyHook.changeCell({
								sheetId: sheet.original.sheetId || sheet.id,
								row: cell.r,
								col: cell.c,
								before: beforeValue,
								after: cellEl.innerText,
							})
							beforeValue = cellEl.innerText
						}
						lastTime = time
					}
					fn()
				})
			}
			isAutoSave = true

			fn()
		}

		const blur = () => {
			cancelAnimationFrame(reqTimer)
			if (sheet.state.formula) {
				cellEl.focus()
				setTimeout(() => {
					// formulaStyle.value = {}
					sheet.state.formulaStyle = {}
					sheet.state.openformula = false
					isFormula.value = false
				}, 150)
				return
			}

			if (!sheet.celldata.get(cell.r)) {
				sheet.celldata.set(cell.r, [])
			}

			sheet.celldata.get(cell.r)[cell.c] = setCellFormat(
				cellEl.innerText,
				cell.r,
				cell.c,
				true
			)

			// ✅ 修复: 编辑完成后，更新或清除 deepPermissions（持久锁定）
			if (sheet.config.synergy && sheet.config.auth > 0) {
				// ✅ 修复列级权限问题: 使用 cell 的坐标而不是 ranged
				// 因为 ranged 可能在 blur 时已经改变了（用户可能点击了其他单元格）

				// ✅ 新增: 检查编辑后的数据是否为空
				const rangeIsEmpty = sheet.hooks?.permissionsHook?.isRangeEmpty?.(
					cell.r,
					cell.c,
					cell.r,
					cell.c
				)

				console.log('✅ useEdit.blur: 检查数据是否为空', {
					cell: {r: cell.r, c: cell.c},
					auth: sheet.config.auth,
					rangeIsEmpty,
				})

				if (rangeIsEmpty) {
					// 数据为空，清除 deepPermissions
					console.log('✅ useEdit.blur: 数据为空，调用 clearDeepPermissions')
					sheet.hooks?.permissionsHook?.clearDeepPermissions?.(
						cell.r,
						cell.c,
						cell.r,
						cell.c
					)
				} else {
					// 数据不为空，更新 deepPermissions
					console.log('✅ useEdit.blur: 数据不为空，调用 updateDeepPermissions')
					sheet.hooks?.permissionsHook?.updateDeepPermissions?.(
						cell.r,
						cell.c,
						cell.r,
						cell.c
					)
				}
			}

			cellEl.removeAttribute('contenteditable')
			cellEl.removeEventListener('blur', blur)
			cellEl.removeEventListener('input', input)
			cellEl.removeEventListener('focus', focus)
			editing.value = false

			// 使用延时处理，给公式菜单点击事件留出执行时间
			nextTick(() => {
				console.log('setFormulaValue', cellEl)
				setFormulaValue(cellEl)
			})
			setTimeout(() => {
				// formulaStyle.value = {}
				sheet.state.formulaStyle = {}
				sheet.state.openformula = false
				isFormula.value = false
				// 编辑完成，清除原始状态
				clearOriginalFormulaState()
				setRowHeight(cell.r, cell.c)
			}, 150)
		}

		const input = () => {
			cancelAnimationFrame(reqTimer)
			isAutoSave = false
			useDebounce(() => focus(), 1000, 'airSheetCellAuto')()

			// 体验优化而已
			cellEl.style.removeProperty('line-height')

			// console.log('input 事件触发', {
			// 	innerText: cellEl.innerText,
			// 	startsWithEquals: cellEl.innerText.startsWith('='),
			// })

			// // 检查是否是公式
			// if (cellEl.innerText.startsWith('=')) {
			// 	console.log('检测到公式输入，调用 setFormula()')
			// 	// cellEl.innerText = ''
			// 	delete sheet.config.formulaed[`${cell.r}-${cell.c}`]
			// 	setFormula()
			// }

			inputValue.value = cellEl.innerText

			// 实时同步公式引用 - 监听公式内容变化并同步formulaMap
			// 但不要在还原过程中进行同步，避免干扰撤销功能
			if (
				sheet.state.formula &&
				sheet.hooks.selectionRangeHook.syncFormulaMapRealtime &&
				!isRestoring
			) {
				const cellKey = `${cell.r}-${cell.c}`
				sheet.hooks.selectionRangeHook.syncFormulaMapRealtime(cellKey, cellEl.innerText)
			}
		}

		if (!enter || !cell) return

		if (cell.mergedCell) {
			cell.r = cell.mergedCell.r
			cell.c = cell.mergedCell.c
		}

		// 不允许编辑
		if (!sheet.config.edit) {
			ElMessage.warning('当前表格不支持编辑')
			return
		}

		// 不允许编辑锁定的单元格
		if (sheet.hooks.toolsHook.isLocked(cell.r, cell.c, cell.r, cell.c)) {
			return
		}

		// 检查是否有组合键按下
		if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
			return
		}

		// 公式选择模式下
		if (sheet.state.formula && (e.key === 'Enter' || e.key === 'Escape')) {
			console.log('结束公式设置')
			e.stopPropagation()
			e.preventDefault()
			sheet.state.formula = false

			// 标记是否需要还原（ESC键）
			const shouldRestore = e.key === 'Escape'

			const asyncConfig = () => {
				// 同步配置
				if (sheet.config.synergy) {
					sheet.emits?.('asyncConfig', {
						formulaed: sheet.config.formulaed,
						formulaMap: sheet.config.formulaMap,
					})
				}
			}

			// 先执行blur，然后根据需要还原或清除状态
			blur()

			if (shouldRestore) {
				setTimeout(() => {
					// ESC键：还原原始状态
					restoreOriginalFormulaState()
					asyncConfig()
				}, 10) // 确保在blur完成后执行
			} else if (e.key === 'Enter') {
				// Enter键：清除原始状态（确认编辑）
				clearOriginalFormulaState()
				asyncConfig()
			}

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

		if (!cellEl || cellEl.getAttribute('contenteditable')) {
			return
		}

		cellEl.setAttribute('contenteditable', 'true')

		// 优化体验而已
		if (cellEl.innerText === '') {
			cellEl.style.lineHeight = sheet.hooks.resizeHook.getRowHeight(cell.r) - 1 + 'px'
		}

		// 未双击, 直接输入清空所有内容
		if (cell.r === undefined) {
			cellEl.innerText = ''
		}

		cellEl.innerText = setCellFormat(cellEl.innerText, cell.r, cell.c)

		// 优化体验而已
		// if (cellEl.childNodes.length === 1 && cellEl.childNodes[0].nodeType === 3) {
		// 	cellEl.innerHTML = `<div>${cellEl.innerText}</div>`
		// 	setRowHeight(cell.r, cell.c)
		// }

		cellEl.addEventListener('focus', focus)
		cellEl.addEventListener('input', input)
		cellEl.addEventListener('blur', blur)

		cellEl.focus()

		editing.value = true

		// 将光标移到文本末尾
		const range = document.createRange()
		const selection = window.getSelection()
		range.selectNodeContents(cellEl)
		range.collapse(false)
		selection.removeAllRanges()
		selection.addRange(range)

		// 检查是否是公式
		if (e.key === '=') {
			cellEl.innerText = ''
			delete sheet.config.formulaed[`${cell.r}-${cell.c}`]
			setFormula()
		} else if (cellEl.innerText.startsWith('=')) {
			setFormula()
		}
	}

	// 单元格输入的时候
	let prevText = ''
	const inputCell = (e, cell) => {
		const value = e.target.innerText

		if (sheet.state.formula) {
			console.log('公式模式下不触发输入事件')
			return
		}
		console.log('inputCell', value)
		sheet.emits?.('asyncInputCell', prevText, value, cell)
		prevText = value
	}

	// 单元格格式
	const setCellFormat = (text, rowIndex, colIndex, format = false, el = null) => {
		const fmt = sheet.config.styled[`${rowIndex}-${colIndex}`]?.fmt // 单元格格式
		const formula = sheet.config.formulaed[`${rowIndex}-${colIndex}`] // 单元格公式

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

			// 处理公式：如果输入以 = 开头，或者单元格已有公式配置
			if (formula || (text && text.startsWith('='))) {
				if (format) {
					// 保存公式到配置
					sheet.config.formulaed[`${rowIndex}-${colIndex}`] = output
				} else {
					// 还原时使用已保存的公式
					output = formula || output
				}
			}
		} catch (error) {
			let correctFormat = ''
			switch (fmt) {
				case formatMap.ShortDate:
				case formatMap.LongDate:
					correctFormat = '20250101'
					break
				case formatMap.Time:
					correctFormat = '235959'
					break
				case formatMap.RMB:
					correctFormat = '10000'
					break
			}
			// ElMessage.error(`${fmt}格式错误, 请检查内容, 例如: ${correctFormat}`)
			console.error(`${fmt}格式错误, 请检查内容`)
		}
		return output
	}

	// 设置单元格公式
	const setCellFormula = (key, _) => {
		sheet.state.formula = true

		const cell = sheet.hooks.selectionRangeHook.getRanged()
		const {r, c, rr, cc} = cell

		if (!sheet.celldata.get(r)) {
			sheet.celldata.set(r, [])
		}

		if (!_) {
			const v = sheet.celldata.get(r)[c] || ''
			sheet.hooks.historyHook.save({r, c, v})
		}

		let lockTimer = null
		for (let row = r; row <= r; row++) {
			for (let col = c; col <= c; col++) {
				if (sheet.config.locked[`${row}-${col}`]) {
					clearTimeout(lockTimer)
					lockTimer = setTimeout(() => ElMessage.warning('单元格已锁定'), 16)
					continue
				}

				const oldFormula = sheet.config.formulaed[`${row}-${col}`]
				if (oldFormula) {
					// 取出公式中的参数
					const params = oldFormula.match(/\(([^)]*)\)/)
					if (params) {
						sheet.config.formulaed[`${row}-${col}`] = `=${key}(${params[1]})`
					}
					delete sheet.config.formulaMap[`${row}-${col}`]
				} else {
					sheet.config.formulaed[`${row}-${col}`] = `=${key}()`
				}

				if (sheet.state.formula) {
					if (!sheet.celldata.get(row)) {
						sheet.celldata.set(row, [])
					}
					sheet.celldata.get(row)[col] = `=${key}()`
				}

				inputValue.value = sheet.config.formulaed[`${row}-${col}`]
			}
		}

		if (!sheet.state.formula) {
			setFormulaValue(container.querySelector(`[data-cell="${r}-${c}"]`))
		}

		sheet.state.openformula = false
	}

	// 根据公式计算结果
	const setFormulaValue = (el = null) => {
		try {
			const formulas = sheet.config.formulaed
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

							// 如果值是公式（以=开头），说明这是一个公式单元格，应该跳过或返回0
							// 避免循环引用和获取到公式字符串而不是计算值
							if (typeof value === 'string' && value.startsWith('=')) {
								if (process.env.NODE_ENV === 'development' || sheet.config.debug) {
									console.log(
										`警告: 单元格 ${cellRef} 包含公式 ${value}，返回0避免循环引用`
									)
								}
								return 0
							}

							// 尝试转换为数字
							const numValue = Number(value)
							const result = isNaN(numValue) ? 0 : numValue

							if (process.env.NODE_ENV === 'development' || sheet.config.debug) {
								console.log(`获取单元格值: ${cellRef} = ${value} -> ${result}`)
							}
							return result
						}
						if (process.env.NODE_ENV === 'development' || sheet.config.debug) {
							console.log(`单元格 ${cellRef} 不存在或为空，返回0`)
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

					// 调试信息（可通过环境变量控制）
					if (process.env.NODE_ENV === 'development' || sheet.config.debug) {
						console.log(`公式计算: ${key} = ${formula}`, {
							functionName,
							paramsList,
							values,
							result,
						})
					}

					// 设置单元格显示值
					if (sheet.celldata.has(rowIndex)) {
						if (!sheet.celldata.get(rowIndex)) {
							sheet.celldata.set(rowIndex, [])
						}
						// 确保 0 值也能正确显示
						sheet.celldata.get(rowIndex)[colIndex] = result === 0 ? '0' : result
						const cur = container.querySelector(`[data-cell="${rowIndex}-${colIndex}"]`)
						if (cur) {
							cur.innerText = result === 0 ? '0' : result
						}
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

	const setRowHeight = async (rowIndex, colIndex, needSetRange = true) => {
		let r = rowIndex
		let c = colIndex
		const range = sheet.hooks.selectionRangeHook.getRanged()

		if (range && !r && !c && r !== 0 && c !== 0) {
			r = Math.min(range.r, range.rr)
			c = Math.min(range.c, range.cc)
		}

		const cellEl = container?.querySelector(`[data-cell="${r}-${c}"]`)

		if (!cellEl) return

		// 计算实际内容高度
		let contentHeight = 0
		for (const node of cellEl.childNodes) {
			contentHeight += node.offsetHeight
		}

		if (contentHeight < sheet.hooks.resizeHook.getRowHeight(r)) return

		const merge = sheet.hooks.mergeHook.findMergedCell(r, c)

		// 如果是合并单元格
		if (merge) {
			// 获取合并区域内所有行的当前高度
			const rowHeights = Array(merge.rs)
				.fill(0)
				.map((_, index) => sheet.hooks.resizeHook.getRowHeight(merge.r + index))

			const mergedTotalHeight = rowHeights.reduce((total, height) => total + height, 0)

			// 如果内容高度超过合并单元格总高度
			if (contentHeight > mergedTotalHeight) {
				// 计算需要增加的高度
				const additionalHeight = contentHeight - mergedTotalHeight
				// 将额外高度添加到第一行
				const newFirstRowHeight = rowHeights[0] + additionalHeight
				sheet.hooks.resizeHook.setRowHeight(merge.r, newFirstRowHeight)

				if (needSetRange) {
					await nextTick()
					sheet.hooks.selectionRangeHook.setRange(
						merge.r,
						merge.c,
						merge.r + merge.rs,
						merge.c + merge.cs,
						true
					)
				}
			}
		} else if (contentHeight > sheet.hooks.resizeHook.getRowHeight(r)) {
			if (!sheet.state.importing) {
				// 非合并单元格的情况
				sheet.hooks.resizeHook.setRowHeight(r, contentHeight)
				if (needSetRange) {
					await nextTick()
					sheet.hooks.selectionRangeHook.setRange(r, c, r, c, true)
				}
			}
		}
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
			!settingsCache.has(`${cell.r}-${cell.c}`)
		) {
			settingsCache.set(`${cell.r}-${cell.c}`, cell)
			// 检查并清理缓存
			cleanSettingsCache()
			setTimeout(() => setRowHeight(cell.r, cell.c, false), 128)
		}

		return html
	}

	const setCellValue = async (rowIndex, colIndex, value, create = false) => {
		let r = rowIndex
		let c = colIndex
		const range = sheet.hooks.selectionRangeHook.getRanged()

		if (
			range.r &&
			range.c &&
			(r === undefined || c === undefined || r === null || c === null)
		) {
			r = Math.min(range.r, range.rr)
			c = Math.min(range.c, range.cc)
		}

		if (sheet.celldata.get(r)) {
			if (c > sheet.config.colCount) {
				sheet.config.colCount = c + 1
			}
		} else if (create) {
			if (!sheet.celldata.get(r)) {
				sheet.celldata.set(r, [])
				if (r > sheet.config.rowCount) {
					sheet.config.rowCount = r + 1
				}
			}
		} else if (!sheet.celldata.get(r)) {
			sheet.celldata.set(r, [])
		}

		sheet.celldata.get(r)[c] = value

		// 计算公式处理
		const formula = sheet.config.formulaed[`${r}-${c}`]
		if (formula) {
			sheet.config.formulaed[`${r}-${c}`] = value
			setFormulaValue()
		}

		// 处理格式
		const fmt = sheet.config.styled[`${r}-${c}`]?.fmt
		if (fmt) {
			sheet.celldata.get(r)[c] = setCellFormat(value, r, c, true)
		}
	}

	const getCellValue = (rowIndex, colIndex) => {
		if (sheet.celldata.get(rowIndex)) {
			const fmt = sheet.config.styled[`${rowIndex}-${colIndex}`]?.fmt
			if (fmt) {
				return sheet.celldata.get(rowIndex)?.[colIndex]?.replace(/\/|年|月|日|:|,|元/g, '')
			}

			const formula = sheet.config.formulaed[`${rowIndex}-${colIndex}`]
			if (formula) {
				return formula
			}
			return sheet.celldata.get(rowIndex)[colIndex]
		}
		return ''
	}

	let formulaSelectionCell = null
	const parseFormula = (str) => {
		// ^= 表示以等号开头
		// ([A-Z]+) 捕获函数名（大写字母，如果可能有小写就用 [A-Za-z]+）
		// \((.*?)\) 捕获括号里的内容
		let match = str.match(/^=([A-Za-z]+)\((.*?)\)$/)
		if (match) {
			return {
				func: match[1], // 函数名，如 "SUM"
				args: match[2], // 参数字符串，如 "A1,A10"
			}
		}
		return null
	}
	const setFormulaSelectionCell = (range) => {
		const {start, end, format, sqref} = range
		const {r, rr, c, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (start.row === r && start.col === c) {
			return
		}
		formulaSelectionCell = container.querySelector(`[data-cell="${r}-${c}"]`)
		if (formulaSelectionCell) {
			for (let i = r; i <= r; i++) {
				for (let j = c; j <= c; j++) {
					if (!sheet.celldata.get(i)) {
						sheet.celldata.set(i, [])
					}
					const sqref = range.sqref.split(':')
					const formula = parseFormula(formulaSelectionCell.innerText)

					// 检查 formula 是否为 null，避免报错
					if (!formula) {
						console.warn('无法解析公式:', formulaSelectionCell.innerText)
						continue
					}

					if (!formula.args) {
						formula.args = sqref[0]
					} else {
						formula.args += `,${sqref[0]}`
					}
					const result = `=${formula.func}(${Array.from(
						new Set(formula.args.split(','))
					).join(',')})`
					sheet.celldata.get(i)[j] = result
					inputValue.value = result
				}
			}
		}
	}

	const destroy = () => {
		initialized = false
		container = null
		sheet = null
		sheetKey = null
	}

	const refreshSheet = async (id) => {
		sheet = sheetStore.getSheet(id)
	}

	const addEvent = (containerId) => {
		container = document.querySelector(`#${containerId}`)
		if (!container) {
			return
		}
		container = document.querySelector(`#${containerId}`)

		container.addEventListener('mousemove', enterContainer)
		container.addEventListener('mouseout', leaveContainer)
		document.addEventListener('keydown', startEdit)
	}

	const removeEvent = () => {
		if (container) {
			container.removeEventListener('mousemove', enterContainer)
			container.removeEventListener('mouseout', leaveContainer)
		}
		document.removeEventListener('keydown', startEdit)
	}

	const watchSelectionRange = () => {
		if (!sheet?.hooks?.selectionRangeHook) {
			return
		}
		watch(
			() => sheet.hooks.selectionRangeHook.ranged,
			(newVal) => {
				const {r, c, rr, cc} = newVal

				if (r === undefined || c === undefined) {
					inputValue.value = ''
					return
				}

				inputValue.value = getCellValue(r, c)
			},
			{deep: true}
		)
	}

	const init = (key, containerId) => {
		sheetKey = key
		sheet = sheetStore.getSheet(sheetKey)

		setTimeout(() => watchSelectionRange(), 16)

		return {
			inputValue,
			editing,
			// isFormula,
			// formulaStyle,

			destroy,
			startEdit,
			formattedValue,
			setFormulaValue,
			setCellValue,
			setCellFormula,
			setCellFormat,
			setRowHeight,
			getCellValue,
			setFormulaSelectionCell,
			getEditingCellPosition,

			inputCell,
			refreshSheet,

			addEvent,
			removeEvent,
		}
	}

	return {
		init,
	}
}
