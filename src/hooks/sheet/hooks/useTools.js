import {ref, nextTick, reactive} from 'vue'
import useGuid from '@/hooks/useGuid'
import {ElMessage} from 'element-plus'
import {useAirSheetStore} from '../store/useAirSheet'
import {useProcessMapInBatches} from './useProcessMapInBatches'
import {useDebounce} from '@/hooks/useDebounce'
import {
	useBufferToMap,
	useMapToBuffer,
	useStringArrayToBuffer,
	useBufferToStringArray,
} from './useBuffer'
import {sassTrue} from 'sass'

export const useTools = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = ''
	let sheet = null

	const isLocked = () => {
		const {r, c} = sheet.hooks.selectionRangeHook.getRanged()
		return !!sheet.config.locked[`${r}-${c}`]
	}

	// 检查指定行是否有锁定的单元格
	const isRowLocked = (rowIndex) => {
		if (!sheet.config.locked) return false

		for (let col = 0; col < sheet.config.colCount; col++) {
			if (sheet.config.locked[`${rowIndex}-${col}`]) {
				return true
			}
		}
		return false
	}

	// 检查指定列是否有锁定的单元格
	const isColumnLocked = (colIndex) => {
		if (!sheet.config.locked) return false

		for (let row = 0; row < sheet.config.rowCount; row++) {
			if (sheet.config.locked[`${row}-${colIndex}`]) {
				return true
			}
		}
		return false
	}

	// 检查在指定行位置添加行是否会影响锁定单元格
	// 只有在锁定单元格的具体行位置插入才禁止，在上方插入允许（锁定单元格会下移）
	const canAddRowAt = (insertRowIndex, selectedRowStart, selectedRowEnd) => {
		if (!sheet.config.locked) return {canAdd: true, reason: ''}

		// 检查选中的行范围内是否有锁定单元格
		for (let row = selectedRowStart; row <= selectedRowEnd; row++) {
			if (isRowLocked(row)) {
				return {
					canAdd: false,
					reason: `无法在选中区域添加行：第${row + 1}行包含锁定的单元格`,
				}
			}
		}

		return {canAdd: true, reason: ''}
	}

	// 检查在指定列位置添加列是否会影响锁定单元格
	// 只有在锁定单元格的具体列位置插入才禁止，在左侧插入允许（锁定单元格会右移）
	const canAddColumnAt = (insertColIndex, selectedColStart, selectedColEnd) => {
		if (!sheet.config.locked) return {canAdd: true, reason: ''}

		// 检查选中的列范围内是否有锁定单元格
		for (let col = selectedColStart; col <= selectedColEnd; col++) {
			if (isColumnLocked(col)) {
				return {
					canAdd: false,
					reason: `无法在选中区域添加列：第${col + 1}列包含锁定的单元格`,
				}
			}
		}

		return {canAdd: true, reason: ''}
	}

	// 检查删除行范围是否包含锁定单元格
	const canRemoveRows = (startRow, endRow) => {
		if (!sheet.config.locked) return {canRemove: true, reason: ''}

		for (let row = startRow; row <= endRow; row++) {
			if (isRowLocked(row)) {
				return {
					canRemove: false,
					reason: `无法删除行：第${row + 1}行包含锁定的单元格`,
				}
			}
		}

		return {canRemove: true, reason: ''}
	}

	// 检查删除列范围是否包含锁定单元格
	const canRemoveColumns = (startCol, endCol) => {
		if (!sheet.config.locked) return {canRemove: true, reason: ''}

		for (let col = startCol; col <= endCol; col++) {
			if (isColumnLocked(col)) {
				return {
					canRemove: false,
					reason: `无法删除列：第${col + 1}列包含锁定的单元格`,
				}
			}
		}

		return {canRemove: true, reason: ''}
	}

	// 更新锁定单元格位置 - 添加行时
	const updateLockedCellsAfterAddRow = (insertRowIndex, addCount) => {
		if (!sheet.config.locked) return

		const newLocked = {}
		Object.entries(sheet.config.locked).forEach(([key, value]) => {
			const [row, col] = key.split('-').map(Number)
			if (row >= insertRowIndex) {
				// 锁定单元格在插入位置之后，需要向下移动
				newLocked[`${row + addCount}-${col}`] = value
			} else {
				// 锁定单元格在插入位置之前，位置不变
				newLocked[key] = value
			}
		})
		sheet.config.locked = newLocked
	}

	// 更新锁定单元格位置 - 添加列时
	const updateLockedCellsAfterAddColumn = (insertColIndex, addCount) => {
		if (!sheet.config.locked) return

		const newLocked = {}
		Object.entries(sheet.config.locked).forEach(([key, value]) => {
			const [row, col] = key.split('-').map(Number)
			if (col >= insertColIndex) {
				// 锁定单元格在插入位置之后，需要向右移动
				newLocked[`${row}-${col + addCount}`] = value
			} else {
				// 锁定单元格在插入位置之前，位置不变
				newLocked[key] = value
			}
		})
		sheet.config.locked = newLocked
	}

	// 批量设置单元格样式, 工具栏共用, 设置框选范围样式
	const setCellStyles = (type, val, fn, save = true) => {
		if (isLocked()) {
			return
		}

		if (save) {
			sheet.hooks.historyHook.save()
		}

		const ranged = sheet.hooks.selectionRangeHook.getRanged()
		const {r, c, rr, cc} = ranged

		for (let i = r; i <= rr; i++) {
			for (let j = c; j <= cc; j++) {
				if (fn && typeof fn === 'function') {
					fn(i, j, {r, c, rr, cc})
				} else {
					if (!sheet.config.styled[`${i}-${j}`]) {
						sheet.config.styled[`${i}-${j}`] = {}
					}

					if (
						sheet.config.styled[`${i}-${j}`][type] &&
						sheet.config.styled[`${i}-${j}`][type] === val
					) {
						delete sheet.config.styled[`${i}-${j}`][type]
						continue
					}
					sheet.config.styled[`${i}-${j}`][type] = val
				}
			}
		}

		synergyEvent({styled: sheet.config.styled})
	}

	// 设置单元格样式, 指定单元格
	const setCellStyle = ({type, value, row, col, rowspan = 1, colspan = 1}) => {
		if (isLocked()) {
			return
		}

		for (let i = row; i < row + rowspan; i++) {
			for (let j = col; j < col + colspan; j++) {
				if (!sheet.config.styled[`${i}-${j}`]) {
					sheet.config.styled[`${i}-${j}`] = {}
				}
				sheet.config.styled[`${i}-${j}`][type] = value
			}
		}
		synergyEvent({styled: sheet.config.styled})
	}

	// 设置字体
	const setFont = (e) => {
		const font = e.target.value
		setCellStyles('ff', font)
	}

	// 设置字体大小
	const setFontSize = (e, containerRef) => {
		const size = e.target.value
		setCellStyles('fs', size)
		setTimeout(() => {
			const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
			if (!r) return

			// 更新每一行的高度
			for (let row = r; row <= rr; row++) {
				const rowCells = Array.from(
					containerRef.querySelectorAll(`[data-cell^="${row}-"]`)
				).filter((cell) => {
					const col = parseInt(cell.dataset.cell.split('-')[1])
					return col >= c && col <= cc
				})

				const maxHeight = Math.max(
					...rowCells.map((cell) =>
						Array.from(cell.childNodes).reduce((h, node) => h + node.offsetHeight, 0)
					)
				)
				if (maxHeight > sheet.hooks.resizeHook.getRowHeight(row)) {
					sheet.hooks.resizeHook.setRowHeight(row, maxHeight)
				}
			}

			sheet.hooks.selectionRangeHook.setRange(r, c, rr, cc, true)
		}, 151)
	}

	// 设置单元格格式
	const setFormat = (e, containerRef) => {
		const format = e.target.value
		setCellStyles('fmt', format)

		const cell = sheet.hooks.selectionRangeHook.getStartCell()
		const el = containerRef.querySelector(`[data-cell="${cell.r}-${cell.c}"]`)

		if (el) {
			sheet.hooks.editHook.setCellFormat(el.innerText, cell.r, cell.c, true, el)
		}
	}

	// 设置字体颜色
	let fontSaved = false
	const setFontColor = (e) => {
		useDebounce(
			(e) => {
				if (!fontSaved) {
					sheet.hooks.historyHook.save()
					fontSaved = true
				}
				const color = e.target.value
				setCellStyles('fc', color, null, false)
			},
			128,
			'fontColor'
		)(e)
	}
	const fontColorChanged = () => (fontSaved = false)

	// 设置单元格背景色
	let fillSaved = false
	const setFillColor = (e) => {
		useDebounce(
			(e) => {
				if (!fillSaved) {
					sheet.hooks.historyHook.save()
					fillSaved = true
				}
				const color = e.target.value
				setCellStyles('bg', color, null, false)
			},
			128,
			'fillColor'
		)(e)
	}
	const fillColorChanged = () => (fillSaved = false)

	// 设置边框颜色
	let borderSaved = false
	const setBorderColor = (e) => {
		useDebounce(
			(e) => {
				if (!borderSaved) {
					sheet.hooks.historyHook.save()
					borderSaved = true
				}
				const color = e.target.value
				setCellStyles(
					'bc',
					color,
					(r, c) => {
						const style = sheet.config.styled[`${r}-${c}`]

						if (style && (style.b || style.bt || style.bb || style.bl || style.br)) {
							if (style.b) {
								sheet.config.styled[`${r}-${c}`]['btc'] = color
								sheet.config.styled[`${r}-${c}`]['brc'] = color
								sheet.config.styled[`${r}-${c}`]['blc'] = color
								sheet.config.styled[`${r}-${c}`]['bbc'] = color
							} else {
								if (style.bt) {
									sheet.config.styled[`${r}-${c}`]['btc'] = color
								}
								if (style.bb) {
									sheet.config.styled[`${r}-${c}`]['bbc'] = color
								}
								if (style.bl) {
									sheet.config.styled[`${r}-${c}`]['blc'] = color
								}
								if (style.br) {
									sheet.config.styled[`${r}-${c}`]['brc'] = color
								}
							}
						}
					},
					false
				)
			},
			128,
			'borderColor'
		)(e)
	}
	const borderColorChanged = () => (borderSaved = false)

	// 合并
	const setMerge = () => {
		if (isLocked()) {
			return
		}

		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()

		if (r === null || r === undefined) return
		sheet.hooks.historyHook.save()

		sheet.hooks.mergeHook.setMerge(r, c, rr - r + 1, cc - c + 1)

		if (sheet.config.synergy) {
			synergyEvent({merged: sheet.config.merged})
		}
	}

	// 边框
	const setBorder = (border = true, direction = null, save = true) => {
		const handleBorder = (r, c) => {
			// 删除边框样式
			if (!border && !direction) {
				// 无边框
				if (sheet.config.styled[`${r}-${c}`]) {
					delete sheet.config.styled[`${r}-${c}`].b
					delete sheet.config.styled[`${r}-${c}`].bt
					delete sheet.config.styled[`${r}-${c}`].bb
					delete sheet.config.styled[`${r}-${c}`].bl
					delete sheet.config.styled[`${r}-${c}`].br
					delete sheet.config.styled[`${r}-${c}`].btc
					delete sheet.config.styled[`${r}-${c}`].brc
					delete sheet.config.styled[`${r}-${c}`].blc
					delete sheet.config.styled[`${r}-${c}`].bbc

					// 如果没有其他样式，删除整个样式对象
					if (Object.keys(sheet.config.styled[`${r}-${c}`]).length === 0) {
						delete sheet.config.styled[`${r}-${c}`]
					}
				}
				return
			}

			// 点边框时删除其他边框
			if (border && !direction) {
				try {
					delete sheet.config.styled[`${r}-${c}`].bt
					delete sheet.config.styled[`${r}-${c}`].bb
					delete sheet.config.styled[`${r}-${c}`].bl
					delete sheet.config.styled[`${r}-${c}`].br
				} catch {}
			}

			// 如果没有cellStyle对象，创建一个
			if (!sheet.config.styled[`${r}-${c}`]) {
				sheet.config.styled[`${r}-${c}`] = {}
			}

			// 创建一个映射来跟踪每个单元格
			const cellMap = {}
			Object.entries(sheet.config.styled).forEach(([key, value]) => {
				const [r, c] = key.split('-').map(Number)
				if (value.bt || value.bb || value.bl || value.br) {
					cellMap[`${r}-${c}`] = true
				}
			})

			// 使用精确的边框定义，指定每个边的边框
			const borderTop = !cellMap[`${r - 1}-${c}`]
			const borderRight = !cellMap[`${r}-${c + 1}`]
			const borderBottom = !cellMap[`${r + 1}-${c}`]
			const borderLeft = !cellMap[`${r}-${c - 1}`]

			// 单边框
			if (direction) {
				if (direction === 'top') {
					sheet.config.styled[`${r}-${c}`].bt = true
				} else if (direction === 'bottom') {
					sheet.config.styled[`${r}-${c}`].bb = true
				} else if (direction === 'left') {
					sheet.config.styled[`${r}-${c}`].bl = true
				} else if (direction === 'right') {
					sheet.config.styled[`${r}-${c}`].br = true
				}
				return
			}

			// 设置每个边的边框
			if (borderTop) {
				sheet.config.styled[`${r}-${c}`].bt = true
			}

			if (borderLeft) {
				sheet.config.styled[`${r}-${c}`].bl = true
			}

			sheet.config.styled[`${r}-${c}`].br = true
			sheet.config.styled[`${r}-${c}`].bb = true
		}
		setCellStyles('', null, (r, c) => handleBorder(r, c), save)
	}

	// 对齐
	const setAlign = (align) => {
		setCellStyles('align', align)
	}

	// 加粗
	const setBold = () => {
		setCellStyles('bold', true)
	}

	// 斜体
	const setItalic = () => {
		setCellStyles('it', true)
	}

	// 下划线
	const setUnderline = () => {
		setCellStyles('un', true)
	}

	// 删除线
	const setStrikethrough = () => {
		setCellStyles('st', true)
	}

	// 本地的列转换函数
	const convertTitle = (input) => {
		// 如果输入是数字，转换为字母
		if (typeof input === 'number') {
			if (input < 0) return ''

			let title = ''
			let n = input

			// 转换算法
			while (n >= 0) {
				// 获取当前位的字母 (A-Z)
				title = String.fromCharCode(65 + (n % 26)) + title
				// 计算下一位
				n = Math.floor(n / 26) - 1
			}

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

	// 更新公式中的单元格引用
	const updateCellReferencesInFormula = (formula, insertRow, insertCol, count) => {
		const isDelete = count < 0
		const absCount = Math.abs(count)

		// 匹配单元格引用的正则表达式，如 A1, B2, C10 等
		const cellRefRegex = /([A-Z]+)(\d+)/g

		return formula.replace(cellRefRegex, (match, colStr, rowStr) => {
			const col = convertTitle(colStr)
			const row = parseInt(rowStr) - 1 // 转为0基索引

			let newRow = row
			let newCol = col
			let isInvalidRef = false

			if (insertRow !== null) {
				if (isDelete) {
					// 删除行操作
					if (row >= insertRow && row < insertRow + absCount) {
						// 引用的行被删除了，标记为无效引用
						isInvalidRef = true
					} else if (row >= insertRow + absCount) {
						// 引用的行在被删除范围之后，向前移动
						newRow = row - absCount
					}
				} else {
					// 添加行操作
					if (row >= insertRow) {
						newRow = row + count
					}
				}
			}

			if (insertCol !== null) {
				if (isDelete) {
					// 删除列操作
					if (col >= insertCol && col < insertCol + absCount) {
						// 引用的列被删除了，标记为无效引用
						isInvalidRef = true
					} else if (col >= insertCol + absCount) {
						// 引用的列在被删除范围之后，向前移动
						newCol = col - absCount
					}
				} else {
					// 添加列操作
					if (col >= insertCol) {
						newCol = col + count
					}
				}
			}

			// 如果引用无效，返回错误标记
			if (isInvalidRef) {
				return '#REF!'
			}

			// 如果位置发生了变化，返回新的引用
			if (newRow !== row || newCol !== col) {
				const newColStr = convertTitle(newCol)
				const newRowStr = (newRow + 1).toString() // 转为1基索引
				return newColStr + newRowStr
			}

			return match // 位置没有变化，返回原引用
		})
	}

	const asyncUpdateConfig = (count = 0, row = null, col = null, callback = null) => {
		const isDelete = count < 0
		const absCount = Math.abs(count)

		// 处理行列格式的配置对象
		const loops = (obj) => {
			const keysToUpdate = []
			const keysToDelete = []

			Object.keys(obj).forEach((key) => {
				const [r, c] = key.split('-').map(Number)
				let shouldDelete = false
				let curRow = r
				let curCol = c

				if (row !== null) {
					if (isDelete) {
						// 删除操作：检查是否在被删除的范围内
						if (r >= row && r < row + absCount) {
							shouldDelete = true
						} else if (r >= row + absCount) {
							// 在被删除范围之后的行，向前移动
							curRow = r - absCount
						}
					} else {
						// 添加操作：在插入位置之后的行向后移动
						if (r >= row) {
							curRow = r + count
						}
					}
				}

				if (col !== null) {
					if (isDelete) {
						// 删除操作：检查是否在被删除的范围内
						if (c >= col && c < col + absCount) {
							shouldDelete = true
						} else if (c >= col + absCount) {
							// 在被删除范围之后的列，向前移动
							curCol = c - absCount
						}
					} else {
						// 添加操作：在插入位置之后的列向后移动
						if (c >= col) {
							curCol = c + count
						}
					}
				}

				if (shouldDelete) {
					keysToDelete.push(key)
				} else if (curRow !== r || curCol !== c) {
					keysToUpdate.push({
						oldKey: key,
						newKey: `${curRow}-${curCol}`,
						oldRow: r,
						oldCol: c,
						newRow: curRow,
						newCol: curCol,
						value: obj[key],
					})
				}
			})

			// 删除需要删除的键
			keysToDelete.forEach((key) => {
				delete obj[key]
			})

			// 批量更新位置变化的键
			keysToUpdate.forEach(({oldKey, newKey, oldRow, oldCol, newRow, newCol, value}) => {
				obj[newKey] = value
				delete obj[oldKey]
				callback && callback(oldRow, oldCol, newRow, newCol)
			})
		}

		// 处理所有行列格式的配置对象
		loops(sheet.config.merged)
		loops(sheet.config.locked)
		loops(sheet.config.styled)
		loops(sheet.config.formulaed)
		// formulaMap 需要特殊处理，不能使用通用的 loops 函数

		// 处理 rResize（行调整大小）
		if (row !== null) {
			const rResizeUpdates = []
			Object.keys(sheet.config.rResize).forEach((r) => {
				const rowNum = Number(r)
				if (isDelete) {
					// 删除操作
					if (rowNum >= row && rowNum < row + absCount) {
						// 在被删除范围内，直接删除
						delete sheet.config.rResize[r]
					} else if (rowNum >= row + absCount) {
						// 在被删除范围之后，向前移动
						rResizeUpdates.push({
							oldKey: r,
							newKey: rowNum - absCount,
							value: sheet.config.rResize[r],
						})
					}
				} else {
					// 添加操作
					if (rowNum >= row) {
						rResizeUpdates.push({
							oldKey: r,
							newKey: rowNum + count,
							value: sheet.config.rResize[r],
						})
					}
				}
			})

			rResizeUpdates.forEach(({oldKey, newKey, value}) => {
				sheet.config.rResize[newKey] = value
				delete sheet.config.rResize[oldKey]
			})
		}

		// 处理 cResize（列调整大小）
		if (col !== null) {
			const cResizeUpdates = []
			Object.keys(sheet.config.cResize).forEach((c) => {
				const colNum = Number(c)
				if (isDelete) {
					// 删除操作
					if (colNum >= col && colNum < col + absCount) {
						// 在被删除范围内，直接删除
						delete sheet.config.cResize[c]
					} else if (colNum >= col + absCount) {
						// 在被删除范围之后，向前移动
						cResizeUpdates.push({
							oldKey: c,
							newKey: colNum - absCount,
							value: sheet.config.cResize[c],
						})
					}
				} else {
					// 添加操作
					if (colNum >= col) {
						cResizeUpdates.push({
							oldKey: c,
							newKey: colNum + count,
							value: sheet.config.cResize[c],
						})
					}
				}
			})

			cResizeUpdates.forEach(({oldKey, newKey, value}) => {
				sheet.config.cResize[newKey] = value
				delete sheet.config.cResize[oldKey]
			})
		}

		// 处理合并单元格的 mergedCells Map
		const mergeHook = sheet.hooks.mergeHook
		if (mergeHook && mergeHook.getMergedCells && mergeHook.setMergeCells) {
			const mergedCells = mergeHook.getMergedCells()
			const newMergedCells = new Map()

			Object.keys(mergedCells).forEach((key) => {
				const [r, c] = key.split('-').map(Number)
				let shouldDelete = false
				let curRow = r
				let curCol = c

				if (row !== null) {
					if (isDelete) {
						if (r >= row && r < row + absCount) {
							shouldDelete = true
						} else if (r >= row + absCount) {
							curRow = r - absCount
						}
					} else {
						if (r >= row) {
							curRow = r + count
						}
					}
				}

				if (col !== null) {
					if (isDelete) {
						if (c >= col && c < col + absCount) {
							shouldDelete = true
						} else if (c >= col + absCount) {
							curCol = c - absCount
						}
					} else {
						if (c >= col) {
							curCol = c + count
						}
					}
				}

				if (!shouldDelete) {
					const newKey = `${curRow}-${curCol}`
					newMergedCells.set(newKey, mergedCells[key])
				}
			})

			mergeHook.setMergeCells(newMergedCells)
		}

		// 处理 formulaMap（公式引用映射）- 需要特殊处理
		const formulaMapKeys = Object.keys(sheet.config.formulaMap)
		if (formulaMapKeys.length > 0) {
			const formulaMapUpdates = []
			const formulaMapDeletes = []

			formulaMapKeys.forEach((key) => {
				const [r, c] = key.split('-').map(Number)
				let shouldDelete = false
				let curRow = r
				let curCol = c

				// 处理行操作 - 更新公式单元格的位置
				if (row !== null) {
					if (isDelete) {
						if (r >= row && r < row + absCount) {
							shouldDelete = true
						} else if (r >= row + absCount) {
							curRow = r - absCount
						}
					} else {
						if (r >= row) {
							curRow = r + count
						}
					}
				}

				// 处理列操作 - 更新公式单元格的位置
				if (col !== null) {
					if (isDelete) {
						if (c >= col && c < col + absCount) {
							shouldDelete = true
						} else if (c >= col + absCount) {
							curCol = c - absCount
						}
					} else {
						if (c >= col) {
							curCol = c + count
						}
					}
				}

				if (shouldDelete) {
					formulaMapDeletes.push(key)
				} else {
					// 更新公式单元格的位置键
					const newKey = `${curRow}-${curCol}`

					// 更新公式引用的单元格位置
					const updatedReferences = sheet.config.formulaMap[key]
						.map((ref) => {
							let newRefRow = ref.r
							let newRefCol = ref.c
							let isRefDeleted = false

							// 处理行操作对引用单元格的影响
							if (row !== null) {
								if (isDelete) {
									if (ref.r >= row && ref.r < row + absCount) {
										// 被引用的单元格被删除了
										isRefDeleted = true
									} else if (ref.r >= row + absCount) {
										newRefRow = ref.r - absCount
									}
								} else {
									if (ref.r >= row) {
										newRefRow = ref.r + count
									}
								}
							}

							// 处理列操作对引用单元格的影响
							if (col !== null) {
								if (isDelete) {
									if (ref.c >= col && ref.c < col + absCount) {
										// 被引用的单元格被删除了
										isRefDeleted = true
									} else if (ref.c >= col + absCount) {
										newRefCol = ref.c - absCount
									}
								} else {
									if (ref.c >= col) {
										newRefCol = ref.c + count
									}
								}
							}

							// 如果引用的单元格被删除，返回null，稍后过滤掉
							if (isRefDeleted) {
								return null
							}

							// 更新引用的range信息
							const updatedRange = {
								...ref.range,
								start: {row: newRefRow, col: newRefCol},
								end: {row: newRefRow, col: newRefCol},
							}

							return {
								r: newRefRow,
								c: newRefCol,
								range: updatedRange,
							}
						})
						.filter((ref) => ref !== null) // 过滤掉被删除的引用

					formulaMapUpdates.push({
						oldKey: key,
						newKey: newKey,
						value: updatedReferences,
					})
				}
			})

			// 批量删除和更新
			formulaMapDeletes.forEach((key) => {
				delete sheet.config.formulaMap[key]
				// 同时删除对应的公式
				delete sheet.config.formulaed[key]
			})

			formulaMapUpdates.forEach(({oldKey, newKey, value}) => {
				sheet.config.formulaMap[newKey] = value

				// 如果公式单元格位置发生了变化，需要更新 formulaed
				if (oldKey !== newKey) {
					// 移动公式到新位置
					if (sheet.config.formulaed[oldKey]) {
						sheet.config.formulaed[newKey] = sheet.config.formulaed[oldKey]
						delete sheet.config.formulaed[oldKey]
					}
					delete sheet.config.formulaMap[oldKey]
				}

				// 根据更新后的 formulaMap 重建公式字符串
				if (value.length > 0 && sheet.config.formulaed[newKey]) {
					const currentFormula = sheet.config.formulaed[newKey]
					// 提取公式函数名（如 SUM, AVERAGE 等）
					const formulaMatch = currentFormula.match(/^=([A-Z]+)\(/)
					if (formulaMatch) {
						const functionName = formulaMatch[1]
						// 根据 formulaMap 重建参数列表
						const cellRefs = value.map((ref) => {
							const colStr = convertTitle(ref.c)
							const rowStr = (ref.r + 1).toString()
							return colStr + rowStr
						})
						// 重建公式
						const newFormula = `=${functionName}(${cellRefs.join(',')})`
						sheet.config.formulaed[newKey] = newFormula

						// 同时更新 celldata 中的公式
						const [r, c] = newKey.split('-').map(Number)
						if (sheet.celldata.has(r)) {
							if (!sheet.celldata.get(r)) {
								sheet.celldata.set(r, [])
							}
							sheet.celldata.get(r)[c] = newFormula
						}
					}
				}
			})
		}

		// 处理公式单元格的引用更新和计算值清除
		const formulaedKeys = Object.keys(sheet.config.formulaed)
		if (formulaedKeys.length > 0) {
			// 更新公式中的单元格引用
			formulaedKeys.forEach((key) => {
				const formula = sheet.config.formulaed[key]
				if (formula && formula.startsWith('=')) {
					const updatedFormula = updateCellReferencesInFormula(formula, row, col, count)
					if (updatedFormula !== formula) {
						sheet.config.formulaed[key] = updatedFormula
						// 同时更新 celldata 中的公式
						const [r, c] = key.split('-').map(Number)
						if (sheet.celldata.has(r)) {
							if (!sheet.celldata.get(r)) {
								sheet.celldata.set(r, [])
							}
							sheet.celldata.get(r)[c] = updatedFormula
						}
					}
				}
			})

			// 清除所有公式单元格的计算值，保留公式
			formulaedKeys.forEach((key) => {
				const [r, c] = key.split('-').map(Number)
				if (sheet.celldata.has(r) && sheet.celldata.get(r)[c] !== undefined) {
					const formula = sheet.config.formulaed[key]
					if (formula && formula.startsWith('=')) {
						sheet.celldata.get(r)[c] = formula
					}
				}
			})

			// 重新计算所有公式
			if (sheet.hooks.editHook && sheet.hooks.editHook.setFormulaValue) {
				setTimeout(() => {
					sheet.hooks.editHook.setFormulaValue()
				}, 0)
			}
		}

		// 协同功能支持 - 使用 nextTick 确保所有本地状态更新完成后再发送协同消息
		if (sheet.config.synergy) {
			nextTick(() => {
				sheet?.emits('asyncConfig', {
					merged: sheet.config.merged,
					locked: sheet.config.locked,
					styled: sheet.config.styled,
					formulaed: sheet.config.formulaed,
					formulaMap: sheet.config.formulaMap,
					rResize: sheet.config.rResize,
					cResize: sheet.config.cResize,
				})
			})
		}
	}

	// 添加行
	const addRowCount = ref(1)
	const addRow = async (_, isEnd = false, save = true, asyncData = null) => {
		if (!sheet.config.addRow) {
			ElMessage.warning('请先在配置中开启添加行功能')
			return
		}

		if (!addRowCount.value) {
			addRowCount.value = 1
		}

		let {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()

		// 确定插入位置
		const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
		let insertRowIndex

		if (asyncData) {
			r = asyncData.startIndex
			rr = asyncData.startIndex
			addRowCount.value = asyncData.count
			insertRowIndex = asyncData.startIndex
		} else {
			if (isEnd) {
				insertRowIndex = sheet.config.rowCount
			} else {
				// 在选中行的下一行插入（无论是否筛选状态）
				insertRowIndex = rr + 1
			}
		}

		// 检查是否可以在选中区域添加行
		// 只有在锁定单元格的具体行位置插入才禁止，在上方插入允许（锁定单元格会下移）
		const checkResult = canAddRowAt(insertRowIndex, r, rr)
		if (!checkResult.canAdd) {
			ElMessage.warning(checkResult.reason)
			return
		}

		if (sheet.celldata.size >= sheet.props.limit) {
			sheet.state.loading = true
			sheet.state.progress = 0
			sheet.state.msg = '正在处理数据...'
		}

		try {
			// 移动现有数据为新行腾出空间
			// 先收集需要移动的数据，避免在遍历时修改导致的问题
			const dataToMove = new Map()
			const rowsToDelete = new Set()

			await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					if (rowIndex >= insertRowIndex) {
						// 收集需要向下移动的数据
						dataToMove.set(rowIndex + addRowCount.value, rowData)
						// 记录需要清除的原位置
						rowsToDelete.add(rowIndex)
					}
				}
			})

			// 清除原位置的数据
			rowsToDelete.forEach((rowIndex) => {
				sheet.celldata.delete(rowIndex)
			})

			// 设置移动后的数据
			dataToMove.forEach((rowData, newRowIndex) => {
				sheet.celldata.set(newRowIndex, rowData)
			})

			// 在指定位置插入新的空行
			for (let i = insertRowIndex; i < insertRowIndex + addRowCount.value; i++) {
				sheet.celldata.set(i, [])
			}

			// 更新sheet.celldata
			sheet.config.rowCount += addRowCount.value

			// 使用 asyncUpdateConfig 统一处理所有配置更新（添加行操作）
			// 注意：只在非筛选状态下更新配置，筛选状态下的配置更新会在筛选重新执行时处理
			if (!isFiltered) {
				asyncUpdateConfig(addRowCount.value, insertRowIndex, null)
			}

			// 如果当前处于筛选状态，重新筛选以包含新行
			if (sheet.config.filtered && sheet.config.filtered.length > 0) {
				// 保存当前筛选条件
				const currentFiltered = [...sheet.config.filtered]

				// 最终解决方案：使用静默筛选 + 最小化loading状态切换
				await filterByCheckedSilent(currentFiltered)

				ElMessage.success(`添加了 ${addRowCount.value} 行，筛选数据已更新`)
			}

			if (save) {
				sheet.hooks.historyHook.save(
					{
						r: insertRowIndex,
						rs: addRowCount.value,
					},
					'addRow'
				)
			}

			if (sheet.config.synergy && !asyncData) {
				sheet.hooks.synergyHook.addRow({
					sheetId: sheet?.original?.sheetId || sheet.id,
					count: addRowCount.value,
					startIndex: insertRowIndex,
				})
			}
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			sheet.state.loading = false
			sheet.state.progress = -1
		}
	}

	// 删除行
	const removeRow = async (_, asyncData = null, callback = null) => {
		if (!sheet.config.removeRow) {
			ElMessage.warning('请先在配置中开启删除行功能')
			return
		}
		try {
			let {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
			if (r === undefined) return

			let deleteCount = rr - r + 1

			if (asyncData) {
				r = asyncData.startIndex
				rr = asyncData.startIndex + asyncData.count - 1
				deleteCount = asyncData.count
			}

			const deletedRows = new Map()

			// 检查要删除的行范围是否有锁定的单元格
			const checkResult = canRemoveRows(r, rr)
			if (!checkResult.canRemove) {
				ElMessage.warning(checkResult.reason)
				return
			}

			if (sheet.celldata.size >= sheet.props.limit) {
				sheet.state.loading = true
				sheet.state.progress = 0
				sheet.state.msg = '正在处理数据...'
			}

			// 先找到数据的最大行索引，用于后续清理
			let maxRowIndex = 0
			sheet.celldata.forEach((_, rowIndex) => {
				if (typeof rowIndex === 'number') {
					maxRowIndex = Math.max(maxRowIndex, rowIndex)
				}
			})

			await useProcessMapInBatches(
				sheet?.original?.sheetId || sheet.id,
				sheet.celldata,
				(rowIndex, rowData) => {
					console.log(rowIndex)

					if (typeof rowIndex === 'number') {
						if (rowIndex >= r && rowIndex <= rr) {
							deletedRows.set(`${rowIndex}`, {
								rowData: useStringArrayToBuffer(rowData),
								deleteCount,
							})
						} else if (rowIndex > rr) {
							// 移动数据到新位置
							sheet.celldata.set(rowIndex - deleteCount, rowData)
						}
					}
				}
			)

			// 清除最后几行的重复数据，避免重复显示
			// 只清除原来数据末尾的 deleteCount 行
			for (let i = maxRowIndex; i > maxRowIndex - deleteCount; i--) {
				if (i > maxRowIndex - deleteCount) {
					sheet.celldata.delete(i)
				}
			}

			// 保存历史
			sheet.hooks.historyHook.save(deletedRows, 'removeRow')

			// 使用 asyncUpdateConfig 统一处理所有配置更新（删除操作）
			asyncUpdateConfig(-deleteCount, r, null)

			// 更新sheet.celldata
			sheet.config.rowCount = Math.max(0, sheet.config.rowCount - deleteCount)

			// 如果当前处于筛选状态，需要更新筛选数据和行号映射
			if (sheet.config.filtered && sheet.config.filtered.length > 0) {
				// 使用静默模式重新执行筛选，避免闪烁
				const currentFiltered = [...sheet.config.filtered]
				await filterByCheckedSilent(currentFiltered)
				ElMessage.success(`删除了 ${deleteCount} 行，筛选数据已更新`)
			}

			// 优化：删除操作后清理相关缓存，提高后续操作性能
			if (sheet.hooks?.selectionRangeHook?.clearCache) {
				sheet.hooks.selectionRangeHook.clearCache()
			}

			if (sheet.config.synergy && !asyncData) {
				sheet.hooks.synergyHook.removeRow({
					sheetId: sheet?.original?.sheetId || sheet.id,
					startIndex: r,
					count: deleteCount,
				})
			}

			// 优化：延迟触发选区重新计算，避免立即卡顿
			setTimeout(() => {
				if (sheet.hooks?.selectionRangeHook?.refreshSelection) {
					sheet.hooks.selectionRangeHook.refreshSelection()
				}
			}, 100)
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			sheet.state.loading = false
			sheet.state.progress = -1
		}
	}

	// 添加列
	const addColumnCount = ref(1)
	const addColumn = async (_, isEnd = false, save = true, asyncData = null) => {
		if (!sheet.config.addColumn) {
			ElMessage.warning('请先在配置中开启添加列功能')
			return
		}

		if (!addColumnCount.value) {
			addColumnCount.value = 1
		}

		let {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || c === undefined) return

		// 确定插入列的位置
		let insertColIndex = isEnd ? sheet.config.colCount : cc + 1

		if (asyncData) {
			c = asyncData.startIndex
			cc = asyncData.startIndex + asyncData.count - 1
			addColumnCount.value = asyncData.count
			insertColIndex = asyncData.startIndex
		}

		// 检查是否可以在选中区域添加列
		// 只有在锁定单元格的具体列位置插入才禁止，在左侧插入允许（锁定单元格会右移）
		const checkResult = canAddColumnAt(insertColIndex, c, cc)
		if (!checkResult.canAdd) {
			ElMessage.warning(checkResult.reason)
			return
		}

		if (sheet.celldata.size >= sheet.props.limit) {
			sheet.state.loading = true
			sheet.state.progress = 0
			sheet.state.msg = '正在处理数据...'
		}

		try {
			await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					// 创建新的行数据数组
					const newRowData = Array.from(rowData || [])

					// 在指定位置插入空值，根据addColumnCount插入多列
					for (let i = 0; i < addColumnCount.value; i++) {
						newRowData.splice(insertColIndex + i, 0, '')
					}

					// 更新到新Map
					sheet.celldata.set(rowIndex, newRowData)
				}
			})

			sheet.config.colCount += addColumnCount.value

			// 使用 asyncUpdateConfig 统一处理所有配置更新（添加列操作）
			asyncUpdateConfig(addColumnCount.value, null, insertColIndex)

			// 如果当前处于筛选状态，需要更新筛选数据
			if (sheet.config.filtered && sheet.config.filtered.length > 0) {
				// 更新筛选数据中的列数据，保持现有的筛选行数据
				const updatedFilterCellData = new Map()

				sheet.filterCellData.forEach((rowData, rowIndex) => {
					if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
						// 创建新的行数据数组
						const newRowData = Array.from(rowData || [])

						// 在指定位置插入空值，根据addColumnCount插入多列
						for (let i = 0; i < addColumnCount.value; i++) {
							newRowData.splice(insertColIndex + i, 0, '')
						}

						// 保存更新后的行数据
						updatedFilterCellData.set(rowIndex, newRowData)
					}
				})

				// 更新筛选数据，保持现有的筛选行
				sheet.filterCellData.clear()
				updatedFilterCellData.forEach((value, key) => {
					sheet.filterCellData.set(key, value)
				})

				ElMessage.success(`添加了 ${addColumnCount.value} 列，筛选数据已更新`)
			} else {
				// 非筛选状态下的正常处理
				ElMessage.success(`添加了 ${addColumnCount.value} 列`)
			}

			if (save) {
				// 为每一列分别保存历史记录，确保可以依次撤销
				sheet.hooks.historyHook.save(
					{
						c: insertColIndex,
						cs: addColumnCount.value,
					},
					'addCol'
				)
			}

			if (sheet.config.synergy && !asyncData) {
				sheet.hooks.synergyHook.addColumn({
					sheetId: sheet?.original?.sheetId || sheet.id,
					count: addColumnCount.value,
					startIndex: insertColIndex,
				})
			}
		} catch (error) {
			console.error('添加列失败', error)
		} finally {
			sheet.state.loading = false
			sheet.state.progress = -1
		}
	}

	// 删除列
	const removeColumn = async (_, asyncData = null, callback = null) => {
		if (!sheet.config.removeColumn) {
			ElMessage.warning('请先在配置中开启删除列功能')
			return
		}
		let {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || c === undefined) return

		let deleteCount = cc - c + 1

		if (asyncData) {
			c = asyncData.startIndex
			cc = asyncData.startIndex + asyncData.count - 1
			deleteCount = asyncData.count
		}

		// 检查要删除的列范围是否有锁定的单元格
		const checkResult = canRemoveColumns(c, cc)
		if (!checkResult.canRemove) {
			ElMessage.warning(checkResult.reason)
			return
		}

		if (sheet.celldata.size >= sheet.props.limit) {
			sheet.state.loading = true
			sheet.state.progress = 0
			sheet.state.msg = '正在处理数据...'
		}

		// 优化：使用更紧凑的历史存储结构，类似删除行的方式
		const deletedColsData = {
			startCol: c,
			endCol: cc,
			deleteCount: deleteCount,
			// 只保存有数据的行，而不是为每行都创建条目
			rowsData: new Map(), // Map<rowIndex, Array> - 直接保存被删除的列数据
		}

		try {
			// 完全重新设计：借鉴删除行的高效实现，使用批处理但简化逻辑
			// 关键思路：让批处理只做简单的数组操作，避免复杂的逻辑
			await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
				if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
					// 优化：只保存被删除列的数据，使用更紧凑的格式
					if (rowData.length > c) {
						// 提取被删除的列数据
						const deletedRowCols = rowData.slice(c, cc + 1)

						// 只有当有非空数据时才保存
						const hasData = deletedRowCols.some(
							(val) => val !== undefined && val !== null && val !== ''
						)
						if (hasData) {
							deletedColsData.rowsData.set(rowIndex, deletedRowCols)
						}

						// 借鉴删除行的简洁逻辑：只做最简单的数组操作
						// 使用 splice 直接修改原数组，避免创建新数组
						rowData.splice(c, deleteCount)
						// 注意：这里直接修改了 rowData，它已经是 sheet.celldata 中的引用
						// 所以不需要再调用 sheet.celldata.set()
					}
				}
			})

			// 保存历史 - 优化：使用新的紧凑存储结构和异步保存
			setTimeout(() => {
				try {
					sheet.hooks.historyHook.save(deletedColsData, 'removeCol')
				} catch (error) {
					console.error('保存删除列历史失败:', error)
				}
			}, 0)

			// 使用 asyncUpdateConfig 统一处理所有配置更新（删除列操作）
			asyncUpdateConfig(-deleteCount, null, c)

			// 更新sheet.celldata和其他相关操作
			sheet.config.colCount = Math.max(0, sheet.config.colCount - deleteCount)
			sheet.hooks.selectionRangeHook.setRange(r, c, rr, cc)

			// 如果当前处于筛选状态，需要更新筛选条件中的列索引
			if (sheet.config.filtered && sheet.config.filtered.length > 0) {
				// 更新筛选条件中的列索引
				const updatedFiltered = []
				sheet.config.filtered.forEach((filter) => {
					if (filter.c < c) {
						// 删除列之前的筛选条件保持不变
						updatedFiltered.push(filter)
					} else if (filter.c > cc) {
						// 删除列之后的筛选条件需要更新列索引
						updatedFiltered.push({
							...filter,
							c: filter.c - deleteCount,
						})
					}
					// 删除列范围内的筛选条件被移除（不添加到updatedFiltered）
				})

				// 更新筛选条件
				sheet.config.filtered = updatedFiltered

				// 如果还有筛选条件，重新执行筛选
				if (updatedFiltered.length > 0) {
					await filterByCheckedSilent(updatedFiltered)
					ElMessage.success(`删除了 ${deleteCount} 列，筛选条件已更新`)
				} else {
					// 如果没有筛选条件了，清除筛选状态
					sheet.config.filtered = []
					sheet.filterCellData.clear()
					sheet.rowMapping = []
					ElMessage.success(`删除了 ${deleteCount} 列，筛选条件已清除`)
				}

				// 优化：删除操作后清理相关缓存，提高后续操作性能
				if (sheet.hooks?.selectionRangeHook?.clearCache) {
					sheet.hooks.selectionRangeHook.clearCache()
				}

				// 优化：延迟触发选区重新计算，避免立即卡顿
				setTimeout(() => {
					if (sheet.hooks?.selectionRangeHook?.refreshSelection) {
						sheet.hooks.selectionRangeHook.refreshSelection()
					}
				}, 100)
			}

			if (sheet.config.synergy && !asyncData) {
				sheet.hooks.synergyHook.removeColumn({
					sheetId: sheet?.original?.sheetId || sheet.id,
					startIndex: c,
					count: deleteCount,
				})
			}
		} catch (error) {
			console.error('处理数据时出错:', error)
		} finally {
			sheet.state.loading = false
			sheet.state.progress = -1
		}
	}

	// 导入Excel
	const importExcel = async (event) => {
		if (!sheet.config.import) {
			ElMessage.warning('当前表格不支持导入')
			return
		}
		const file = event.target.files[0]
		if (!file) return
		sheet.celldata.clear()
		await nextTick()
		const result = await sheet.hooks.excelHook.readExcelFile(file)
		if (result.success) {
			event.target.value = null
		}
	}

	// 导出Excel
	const exportExcel = async () => {
		if (!sheet.config.export) {
			ElMessage.warning('当前表格不支持导出')
			return
		}
		const name = Date.now()
		const result = await sheet.hooks.excelHook.exportExcel(`${name}.xlsx`)
		if (result.success) {
		}
	}

	// 锁定
	const setLocked = () => {
		if (!sheet.config.locked) {
			ElMessage.warning('当前表格不支持锁定')
			return
		}
		sheet.hooks.historyHook.save()

		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || c === undefined) return

		for (let row = r; row <= rr; row++) {
			for (let col = c; col <= cc; col++) {
				sheet.config.locked[`${row}-${col}`] = true
			}
		}

		ElMessage.success(`已锁定`)

		if (sheet.config.synergy) {
			sheet?.emits('asyncConfig', {
				locked: sheet.config.locked,
			})
		}
	}

	// 解锁
	const setUnlocked = () => {
		if (!sheet.config.unlock) {
			ElMessage.warning('当前表格不支持解锁')
			return
		}
		sheet.hooks.historyHook.save()

		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || c === undefined) return

		for (let row = r; row <= rr; row++) {
			for (let col = c; col <= cc; col++) {
				delete sheet.config.locked[`${row}-${col}`]
			}
		}

		ElMessage.success(`已解锁`)

		if (sheet.config.synergy) {
			sheet?.emits('asyncConfig', {
				locked: sheet.config.locked,
			})
		}
	}

	// 筛选, 先把当前列所有数据取出来
	const filterCol = async (alphabet) => {
		// console.log('useTools - 获取列筛选数据:', {
		// 	列信息: alphabet,
		// 	列索引: alphabet.c,
		// 	使用筛选后数据: sheet.filterCellData.size > 0,
		// 	原始数据行数: sheet.celldata.size,
		// 	行映射数量: sheet.rowMapping?.length || 0,
		// })

		const data = []
		const org = sheet.filterCellData.size ? sheet.filterCellData : sheet.celldata
		const addedValues = new Set() // 用于去重，避免合并单元格重复添加相同值
		const isFiltered = sheet.filterCellData.size > 0

		await useProcessMapInBatches(sheet.id, org, (rowIndex, rowData) => {
			if (rowData[alphabet.c] === undefined) return

			// 在筛选状态下，需要将筛选后的行索引转换为原始行索引
			let originalRowIndex = rowIndex
			if (isFiltered && sheet.rowMapping && sheet.rowMapping[rowIndex]) {
				originalRowIndex = sheet.rowMapping[rowIndex].originalIndex
			}

			// 使用原始行索引检查当前单元格是否在合并单元格内
			const mergedCell = sheet.hooks.mergeHook.findMergedCell(originalRowIndex, alphabet.c)

			if (mergedCell) {
				// 如果是合并单元格，只有起始位置的单元格才应该出现在筛选选项中
				if (mergedCell.r === originalRowIndex && mergedCell.c === alphabet.c) {
					// 这是合并单元格的起始位置，添加到筛选选项中
					const cellValue = rowData[alphabet.c]
					if (
						cellValue !== undefined &&
						cellValue !== null &&
						cellValue !== '' &&
						!addedValues.has(cellValue)
					) {
						addedValues.add(cellValue)
						data.push({
							r: originalRowIndex, // 使用原始行索引
							c: alphabet.c,
							v: cellValue,
							_filter: true,
						})
					}
				}
				// 如果不是起始位置，跳过（不添加到筛选选项中）
			} else {
				// 普通单元格，直接添加到筛选选项中
				const cellValue = rowData[alphabet.c]
				if (
					cellValue !== undefined &&
					cellValue !== null &&
					cellValue !== '' &&
					!addedValues.has(cellValue)
				) {
					addedValues.add(cellValue)
					data.push({
						r: originalRowIndex, // 使用原始行索引
						c: alphabet.c,
						v: cellValue,
						_filter: true,
					})
				}
			}
		})

		console.log('useTools - 列筛选数据获取完成:', {
			列索引: alphabet.c,
			数据数量: data.length,
			数据样本: data.slice(0, 3),
			筛选状态: isFiltered,
		})

		return data
	}

	// 获取合并单元格组信息
	const getMergedCellGroups = () => {
		const mergedCells = sheet.hooks.mergeHook.getMergedCells()
		const groups = []

		for (const [key, value] of Object.entries(mergedCells)) {
			const [startRow, startCol] = key.split('-').map(Number)
			const endRow = startRow + value.rs - 1
			const endCol = startCol + value.cs - 1

			const rows = []
			for (let r = startRow; r <= endRow; r++) {
				rows.push(r)
			}

			groups.push({
				startRow,
				endRow,
				startCol,
				endCol,
				rows,
				key,
			})
		}

		return groups
	}

	// 检查行是否属于合并单元格组（保留供将来使用）
	// const findMergedGroupForRow = (rowIndex, mergedGroups) => {
	// 	return mergedGroups.find((group) => group.rows.includes(rowIndex))
	// }

	// 筛选, 过滤勾选列的数据（支持合并单元格完整性）
	const filterByChecked = async (checked) => {
		if (!sheet.config.filter) {
			ElMessage.warning('当前表格不支持筛选')
			return
		}

		// 边界情况处理：检查参数有效性
		if (!checked || !Array.isArray(checked)) {
			ElMessage.warning('筛选条件无效')
			return
		}

		// 保存筛选操作的历史记录
		sheet.hooks.historyHook.save(null, 'filter')

		// 设置加载状态
		sheet.state.loading = true
		sheet.state.msg = '正在筛选数据...'

		try {
			sheet.config.filtered = checked
			sheet.filterCellData.clear()

			// 清空之前的行号映射
			sheet.rowMapping = []

			// 如果没有筛选条件，清除筛选状态
			if (checked.length === 0) {
				sheet.state.loading = false
				ElMessage.success('筛选已清除')
				return
			}

			// 边界情况处理：检查数据源是否存在
			if (!sheet.celldata || sheet.celldata.size === 0) {
				sheet.state.loading = false
				ElMessage.warning('没有可筛选的数据')
				return
			}

			// 获取所有合并单元格组
			const mergedGroups = getMergedCellGroups()

			// 第一阶段：标准筛选，找出符合条件的行
			const matchedRows = new Set()
			let processedCount = 0
			const totalRows = sheet.celldata.size

			await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
				processedCount++

				// 边界情况处理：检查行数据有效性
				if (!rowData || !Array.isArray(rowData)) {
					return
				}

				// 按列分组筛选条件
				const filtersByColumn = new Map()
				for (const filter of sheet.config.filtered) {
					if (!filtersByColumn.has(filter.c)) {
						filtersByColumn.set(filter.c, [])
					}
					filtersByColumn.get(filter.c).push(filter.v)
				}

				let matchesAllColumns = true

				// 检查每一列的筛选条件
				for (const [columnIndex, filterValues] of filtersByColumn) {
					// 边界情况处理：检查列索引有效性
					if (columnIndex < 0 || columnIndex >= rowData.length) {
						continue
					}

					let cellValue = rowData[columnIndex]

					// 特殊处理：对于合并单元格，需要检查是否应该使用合并单元格的值
					const mergedCell = sheet.hooks.mergeHook.findMergedCell(rowIndex, columnIndex)
					if (mergedCell && mergedCell.r !== rowIndex) {
						// 如果当前行不是合并单元格的起始行，获取起始行的值
						const startRowData = sheet.celldata.get(mergedCell.r)
						if (startRowData && startRowData[columnIndex] !== undefined) {
							cellValue = startRowData[columnIndex]
						}
					}

					// 检查当前列的值是否匹配任一筛选值（OR逻辑）
					let matchesThisColumn = false
					for (const filterValue of filterValues) {
						if (cellValue === filterValue) {
							matchesThisColumn = true
							break
						}
					}

					// 如果当前列不匹配任何筛选值，则整行不匹配
					if (!matchesThisColumn) {
						matchesAllColumns = false
						break
					}
				}

				// 如果符合所有筛选条件，标记为匹配行
				if (matchesAllColumns && rowData.length > 0) {
					matchedRows.add(rowIndex)
				}

				// 更新进度
				if (processedCount % 1000 === 0) {
					sheet.state.progress = Math.floor((processedCount / totalRows) * 50) // 第一阶段占50%
				}
			})

			// 第二阶段：合并单元格完整性检查
			const completeRows = new Set(matchedRows)

			for (const group of mergedGroups) {
				// 检查合并单元格组中是否有任何行匹配筛选条件
				const hasMatchInGroup = group.rows.some((row) => matchedRows.has(row))

				if (hasMatchInGroup) {
					// 如果组中有匹配的行，则包含整个组的所有行
					group.rows.forEach((row) => {
						// 确保行在数据范围内
						if (sheet.celldata.has(row)) {
							completeRows.add(row)
						}
					})
				}
			}

			// 第三阶段：构建最终筛选结果
			const sortedRows = Array.from(completeRows).sort((a, b) => a - b)
			const rowMappingData = []
			let filteredRowIndex = 0

			for (const originalRowIndex of sortedRows) {
				const rowData = sheet.celldata.get(originalRowIndex)
				if (rowData && Array.isArray(rowData)) {
					// 将符合条件的行数据存储到filterCellData中
					sheet.filterCellData.set(filteredRowIndex, rowData)

					// 存储行号映射关系
					rowMappingData.push({
						filteredIndex: filteredRowIndex,
						originalIndex: originalRowIndex,
					})

					filteredRowIndex++
				}
			}

			// 将行号映射信息存储到sheet中，供前端使用
			sheet.rowMapping = rowMappingData

			// 边界情况处理：检查筛选结果
			if (sheet.filterCellData.size === 0) {
				ElMessage.warning('没有符合筛选条件的数据')
			} else {
				const mergedCellsIncluded = completeRows.size - matchedRows.size
				const message =
					mergedCellsIncluded > 0
						? `筛选完成，找到 ${sheet.filterCellData.size} 条记录（包含 ${mergedCellsIncluded} 条合并单元格相关行）`
						: `筛选完成，找到 ${sheet.filterCellData.size} 条记录`
				ElMessage.success(message)
			}

			console.log('合并单元格感知筛选完成:', {
				原始数据行数: sheet.celldata.size,
				直接匹配行数: matchedRows.size,
				合并单元格补充行数: completeRows.size - matchedRows.size,
				最终筛选行数: sheet.filterCellData.size,
				筛选条件: sheet.config.filtered,
				合并单元格组数: mergedGroups.length,
				处理时间: Date.now(),
			})
		} catch (error) {
			console.error('筛选过程中发生错误:', error)
			ElMessage.error('筛选失败，请重试')
		} finally {
			// 重置加载状态
			sheet.state.loading = false
			sheet.state.progress = 100
		}
	}

	// 静默筛选方法，用于避免数据闪烁（支持合并单元格完整性）
	const filterByCheckedSilent = async (checked) => {
		if (!sheet.config.filter) {
			return
		}

		// 边界情况处理：检查参数有效性
		if (!checked || !Array.isArray(checked)) {
			return
		}

		// 不设置加载状态，避免界面闪烁
		try {
			sheet.config.filtered = checked
			sheet.filterCellData.clear()

			// 清空之前的行号映射
			sheet.rowMapping = []

			// 如果没有筛选条件，清除筛选状态
			if (checked.length === 0) {
				return
			}

			// 边界情况处理：检查数据源是否存在
			if (!sheet.celldata || sheet.celldata.size === 0) {
				return
			}

			// 获取所有合并单元格组
			const mergedGroups = getMergedCellGroups()

			// 第一阶段：标准筛选，找出符合条件的行
			const matchedRows = new Set()

			await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
				// 边界情况处理：检查行数据有效性
				if (!rowData || !Array.isArray(rowData)) {
					return
				}

				// 按列分组筛选条件
				const filtersByColumn = new Map()
				for (const filter of sheet.config.filtered) {
					if (!filtersByColumn.has(filter.c)) {
						filtersByColumn.set(filter.c, [])
					}
					filtersByColumn.get(filter.c).push(filter.v)
				}

				let matchesAllColumns = true

				// 检查是否为空行（筛选后添加行时需要包含空行）
				let isEmptyRow = true
				for (let i = 0; i < rowData.length; i++) {
					const cellValue = rowData[i]
					if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
						isEmptyRow = false
						break
					}
				}

				// 如果是空行，直接包含在筛选结果中（筛选后添加行时不过滤空行）
				if (isEmptyRow) {
					matchesAllColumns = true
				} else {
					// 非空行：检查每一列的筛选条件
					for (const [columnIndex, filterValues] of filtersByColumn) {
						// 边界情况处理：检查列索引有效性
						if (columnIndex < 0 || columnIndex >= rowData.length) {
							// 如果列不存在，直接跳过该行（不匹配）
							matchesAllColumns = false
							break
						}

						let cellValue = rowData[columnIndex]

						// 特殊处理：对于合并单元格，需要检查是否应该使用合并单元格的值
						const mergedCell = sheet.hooks.mergeHook.findMergedCell(
							rowIndex,
							columnIndex
						)
						if (mergedCell && mergedCell.r !== rowIndex) {
							// 如果当前行不是合并单元格的起始行，获取起始行的值
							const startRowData = sheet.celldata.get(mergedCell.r)
							if (startRowData && startRowData[columnIndex] !== undefined) {
								cellValue = startRowData[columnIndex]
							}
						}

						// 检查当前列的值是否匹配任一筛选值（OR逻辑）
						let matchesThisColumn = false
						for (const filterValue of filterValues) {
							// 严格匹配，不处理空值的特殊情况
							if (cellValue === filterValue) {
								matchesThisColumn = true
								break
							}
						}

						// 如果当前列不匹配任何筛选值，则整行不匹配
						if (!matchesThisColumn) {
							matchesAllColumns = false
							break
						}
					}
				}

				// 如果符合所有筛选条件，标记为匹配行
				if (matchesAllColumns) {
					matchedRows.add(rowIndex)
				}
			})

			// 第二阶段：合并单元格完整性检查
			const completeRows = new Set(matchedRows)

			for (const group of mergedGroups) {
				// 检查合并单元格组中是否有任何行匹配筛选条件
				const hasMatchInGroup = group.rows.some((row) => matchedRows.has(row))

				if (hasMatchInGroup) {
					// 如果组中有匹配的行，则包含整个组的所有行
					group.rows.forEach((row) => {
						// 确保行在数据范围内
						if (sheet.celldata.has(row)) {
							completeRows.add(row)
						}
					})
				}
			}

			// 第三阶段：构建最终筛选结果
			const sortedRows = Array.from(completeRows).sort((a, b) => a - b)
			const rowMappingData = []
			let filteredRowIndex = 0

			for (const originalRowIndex of sortedRows) {
				const rowData = sheet.celldata.get(originalRowIndex)
				if (rowData && Array.isArray(rowData)) {
					// 将符合条件的行数据存储到filterCellData中
					sheet.filterCellData.set(filteredRowIndex, rowData)

					// 存储行号映射关系
					rowMappingData.push({
						filteredIndex: filteredRowIndex,
						originalIndex: originalRowIndex,
					})

					filteredRowIndex++
				}
			}

			// 将行号映射信息存储到sheet中，供前端使用
			sheet.rowMapping = rowMappingData
		} catch (error) {
			console.error('静默筛选过程中发生错误:', error)
		}
	}

	// 冻结
	const freezeRow = ref(1)
	const freezeCol = ref(1)
	const setFreeze = (r, c) => {}

	// 筛选
	const setFilter = () => {
		sheet.state.filter = !sheet.state.filter
	}

	// 查找
	const setSearch = () => {
		sheet.state.search = !sheet.state.search
	}

	// 搜索状态管理
	let searchResults = []
	let currentSearchIndex = -1
	let lastSearchKeyword = ''

	// 导航搜索的独立状态管理
	let navigationKeyword = ''
	let currentNavigationPosition = {r: 0, c: 0}
	let lastNavigationResult = null

	// 搜索所有匹配的单元格
	const searchAll = async (keyword) => {
		if (!keyword || typeof keyword !== 'string') {
			searchResults = []
			currentSearchIndex = -1
			lastSearchKeyword = ''
			return []
		}

		// 如果关键字相同且有缓存结果，直接返回
		if (keyword === lastSearchKeyword && searchResults.length > 0) {
			return searchResults
		}

		// 重置搜索状态
		searchResults = []
		currentSearchIndex = -1
		lastSearchKeyword = keyword

		// 确定数据源：优先使用筛选数据，否则使用原始数据
		const isFiltered = sheet.config.filtered && sheet.config.filtered.length > 0
		const dataSource =
			isFiltered && sheet.filterCellData.size > 0 ? sheet.filterCellData : sheet.celldata

		if (!dataSource || dataSource.size === 0) {
			return []
		}

		// 搜索关键字转换为小写以支持不区分大小写搜索
		const searchKeyword = keyword.toLowerCase()

		try {
			// 使用批处理遍历数据
			await useProcessMapInBatches(sheet.id, dataSource, (rowIndex, rowData) => {
				if (!Array.isArray(rowData)) return

				// 遍历行中的每个单元格
				rowData.forEach((cellValue, colIndex) => {
					if (cellValue === undefined || cellValue === null || cellValue === '') {
						return
					}

					// 将单元格值转换为字符串并转为小写进行匹配
					const cellStr = String(cellValue).toLowerCase()
					if (cellStr.includes(searchKeyword)) {
						// 确定实际的行索引
						let actualRowIndex = rowIndex

						// 如果是筛选状态，需要转换为原始行索引
						if (isFiltered && sheet.rowMapping && sheet.rowMapping[rowIndex]) {
							actualRowIndex = sheet.rowMapping[rowIndex].originalIndex
						}

						searchResults.push({
							r: actualRowIndex,
							c: colIndex,
							v: cellValue,
						})
					}
				})
			})

			// 按行列顺序排序搜索结果
			searchResults.sort((a, b) => {
				if (a.r !== b.r) {
					return a.r - b.r
				}
				return a.c - b.c
			})

			console.log(
				`搜索完成: 关键字"${keyword}"，找到 ${searchResults.length} 个匹配项`,
				searchResults
			)
			return searchResults
		} catch (error) {
			console.error('搜索过程中发生错误:', error)
			searchResults = []
			return []
		}
	}

	// 搜索上一个匹配项（独立搜索，不依赖searchAll）
	const searchPrevious = async (keyword) => {
		// 如果没有关键字，返回错误
		if (!keyword || typeof keyword !== 'string') {
			ElMessage.warning('需要提供搜索关键字')
			return null
		}

		const keywordLower = keyword.toLowerCase()

		// 如果关键字变化了，重置导航位置
		if (keyword !== navigationKeyword) {
			navigationKeyword = keyword
			// 从当前选区位置开始，如果没有选区则从末尾开始
			const currentRange = sheet.hooks.selectionRangeHook.getRanged()
			if (currentRange && currentRange.r !== undefined && currentRange.c !== undefined) {
				currentNavigationPosition = {r: currentRange.r, c: currentRange.c}
			} else {
				// 获取数据的最大行列，从末尾开始搜索
				const dataSource =
					sheet.config.filtered && sheet.filterCellData.size > 0
						? sheet.filterCellData
						: sheet.celldata

				let maxRow = 0,
					maxCol = 0
				dataSource.forEach((rowData, rowIndex) => {
					maxRow = Math.max(maxRow, rowIndex)
					if (Array.isArray(rowData)) {
						maxCol = Math.max(maxCol, rowData.length - 1)
					}
				})
				currentNavigationPosition = {r: maxRow, c: maxCol}
			}
		}

		// 确定数据源
		const isFiltered = sheet.config.filtered && sheet.filterCellData.size > 0
		const dataSource = isFiltered ? sheet.filterCellData : sheet.celldata

		if (!dataSource || dataSource.size === 0) {
			ElMessage.warning('没有可搜索的数据')
			return null
		}

		// 首先找到所有匹配项
		let allMatches = []
		dataSource.forEach((rowData, rowIndex) => {
			if (Array.isArray(rowData)) {
				rowData.forEach((cellValue, colIndex) => {
					if (cellValue && String(cellValue).toLowerCase().includes(keywordLower)) {
						let actualRow = rowIndex
						// 如果是筛选状态，需要映射回原始行索引
						if (isFiltered && sheet.rowMapping) {
							const mapping = sheet.rowMapping.find(
								(m) => m.filteredIndex === rowIndex
							)
							if (mapping) {
								actualRow = mapping.originalIndex
							}
						}
						allMatches.push({
							r: actualRow,
							c: colIndex,
							v: cellValue,
							originalR: rowIndex, // 保存原始行索引用于位置比较
						})
					}
				})
			}
		})

		if (allMatches.length === 0) {
			ElMessage.warning('没有找到匹配的搜索结果')
			return null
		}

		// 如果只有一个匹配项，直接返回它
		if (allMatches.length === 1) {
			const found = allMatches[0]
			currentNavigationPosition = {r: found.originalR, c: found.c}
			lastNavigationResult = found
			console.log('导航到唯一的搜索结果:', found)
			await scrollToCellAndSelect(found.r, found.c)
			return found
		}

		// 多个匹配项时，找到当前位置之前的上一个
		// 按行列顺序排序
		allMatches.sort((a, b) => {
			if (a.originalR !== b.originalR) return a.originalR - b.originalR
			return a.c - b.c
		})

		// 找到当前位置之前的最后一个匹配项
		let prevMatch = null
		for (let i = allMatches.length - 1; i >= 0; i--) {
			const match = allMatches[i]
			if (
				match.originalR < currentNavigationPosition.r ||
				(match.originalR === currentNavigationPosition.r &&
					match.c < currentNavigationPosition.c)
			) {
				prevMatch = match
				break
			}
		}

		// 如果没找到，提示没有找到匹配数据
		if (!prevMatch) {
			ElMessage.warning('没有找到匹配的搜索结果')
			return null
		}

		currentNavigationPosition = {r: prevMatch.originalR, c: prevMatch.c}
		lastNavigationResult = prevMatch
		console.log('导航到上一个搜索结果:', prevMatch)
		await scrollToCellAndSelect(prevMatch.r, prevMatch.c)
		return prevMatch
	}

	// 搜索下一个匹配项（独立搜索，不依赖searchAll）
	const searchNext = async (keyword) => {
		// 如果没有关键字，返回错误
		if (!keyword || typeof keyword !== 'string') {
			ElMessage.warning('需要提供搜索关键字')
			return null
		}

		const keywordLower = keyword.toLowerCase()

		// 如果关键字变化了，重置导航位置
		if (keyword !== navigationKeyword) {
			navigationKeyword = keyword
			// 从当前选区位置开始，如果没有选区则从开头开始
			const currentRange = sheet.hooks.selectionRangeHook.getRanged()
			if (currentRange && currentRange.r !== undefined && currentRange.c !== undefined) {
				currentNavigationPosition = {r: currentRange.r, c: currentRange.c}
			} else {
				// 从开头开始搜索
				currentNavigationPosition = {r: 0, c: 0}
			}
		}

		// 确定数据源
		const isFiltered = sheet.config.filtered && sheet.filterCellData.size > 0
		const dataSource = isFiltered ? sheet.filterCellData : sheet.celldata

		if (!dataSource || dataSource.size === 0) {
			ElMessage.warning('没有可搜索的数据')
			return null
		}

		// 首先找到所有匹配项
		let allMatches = []
		dataSource.forEach((rowData, rowIndex) => {
			if (Array.isArray(rowData)) {
				rowData.forEach((cellValue, colIndex) => {
					if (cellValue && String(cellValue).toLowerCase().includes(keywordLower)) {
						let actualRow = rowIndex
						// 如果是筛选状态，需要映射回原始行索引
						if (isFiltered && sheet.rowMapping) {
							const mapping = sheet.rowMapping.find(
								(m) => m.filteredIndex === rowIndex
							)
							if (mapping) {
								actualRow = mapping.originalIndex
							}
						}
						allMatches.push({
							r: actualRow,
							c: colIndex,
							v: cellValue,
							originalR: rowIndex, // 保存原始行索引用于位置比较
						})
					}
				})
			}
		})

		if (allMatches.length === 0) {
			ElMessage.warning('没有找到匹配的搜索结果')
			return null
		}

		// 如果只有一个匹配项，直接返回它
		if (allMatches.length === 1) {
			const found = allMatches[0]
			currentNavigationPosition = {r: found.originalR, c: found.c}
			lastNavigationResult = found
			console.log('导航到唯一的搜索结果:', found)
			await scrollToCellAndSelect(found.r, found.c)
			return found
		}

		// 多个匹配项时，找到当前位置之后的下一个
		// 按行列顺序排序
		allMatches.sort((a, b) => {
			if (a.originalR !== b.originalR) return a.originalR - b.originalR
			return a.c - b.c
		})

		// 找到当前位置之后的第一个匹配项
		let nextMatch = null
		for (let match of allMatches) {
			if (
				match.originalR > currentNavigationPosition.r ||
				(match.originalR === currentNavigationPosition.r &&
					match.c > currentNavigationPosition.c)
			) {
				nextMatch = match
				break
			}
		}

		// 如果没找到，提示没有找到匹配数据
		if (!nextMatch) {
			ElMessage.warning('没有找到匹配的搜索结果')
			return null
		}

		currentNavigationPosition = {r: nextMatch.originalR, c: nextMatch.c}
		lastNavigationResult = nextMatch
		console.log('导航到下一个搜索结果:', nextMatch)
		await scrollToCellAndSelect(nextMatch.r, nextMatch.c)
		return nextMatch
	}

	// 滚动到指定单元格并设置选区
	const scrollToCellAndSelect = async (targetRow, targetCol) => {
		try {
			// 获取容器引用
			const container = document.querySelector(`#${sheetKey}`)
			if (!container) {
				console.error('找不到表格容器')
				return
			}

			// 计算目标单元格的绝对位置
			let targetTop = 0
			let targetLeft = 0

			// 计算行位置（考虑行高调整）
			for (let r = 0; r < targetRow; r++) {
				targetTop += sheet.hooks.resizeHook.getRowHeight(r)
			}

			// 计算列位置（考虑列宽调整）
			for (let c = 0; c < targetCol; c++) {
				targetLeft += sheet.hooks.resizeHook.getColWidth(c)
			}

			// 获取当前单元格的尺寸
			const cellHeight = sheet.hooks.resizeHook.getRowHeight(targetRow)
			const cellWidth = sheet.hooks.resizeHook.getColWidth(targetCol)

			// 获取容器的可视区域尺寸
			const containerWidth = container.clientWidth
			const containerHeight = container.clientHeight

			// 计算居中滚动位置
			const centerScrollLeft = Math.max(0, targetLeft - containerWidth / 2 + cellWidth / 2)
			const centerScrollTop = Math.max(0, targetTop - containerHeight / 2 + cellHeight / 2)

			// 设置滚动位置
			container.scrollLeft = centerScrollLeft
			container.scrollTop = centerScrollTop

			// 等待滚动完成后设置选区
			await new Promise((resolve) => {
				// 使用 requestAnimationFrame 确保滚动完成
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						// 设置选区到目标单元格
						sheet.hooks.selectionRangeHook.setRange(
							targetRow,
							targetCol,
							targetRow,
							targetCol,
							true
						)
						resolve()
					})
				})
			})

			console.log(
				`已滚动到单元格 (${targetRow}, ${targetCol})，位置: (${targetLeft}, ${targetTop})，滚动位置: (${centerScrollLeft}, ${centerScrollTop})`
			)
		} catch (error) {
			console.error('滚动到单元格时发生错误:', error)
		}
	}

	const clearAll = () => {
		const {r, c, rr, cc} = sheet.hooks.selectionRangeHook.getRanged()
		if (r === undefined || c === undefined) return

		sheet.hooks.historyHook.save()

		let lockTimer = null
		let canAsync = true
		for (let row = r; row <= rr; row++) {
			for (let col = c; col <= cc; col++) {
				if (sheet.config.locked[`${row}-${col}`]) {
					clearTimeout(lockTimer)
					lockTimer = setTimeout(() => ElMessage.warning('单元格已锁定'), 16)
					canAsync = false
					continue
				}
				delete sheet.config.styled[`${row}-${col}`]
				delete sheet.config.formulaed[`${row}-${col}`]
				delete sheet.config.formulaMap[`${row}-${col}`]
			}
		}

		if (sheet.config.synergy && canAsync) {
			sheet?.emits('asyncConfig', {
				styled: sheet.config.styled,
				formulaed: sheet.config.formulaed,
				formulaMap: sheet.config.formulaMap,
			})
		}
	}

	// 解析Excel单元格引用格式(如 "C1:D1" 或 "1-4")，返回起始和结束的行列索引
	const parseCellRange = (range) => {
		// 解析列标识(A,B,C等)为数字索引(0,1,2等)
		const colToIndex = (col) => {
			let index = 0
			for (let i = 0; i < col.length; i++) {
				index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0))
			}
			return index
		}

		// 数字索引转Excel列标识(0->A, 1->B, etc)
		const indexToCol = (index) => {
			index = Math.max(0, index) // 确保不会出现负数
			let col = ''
			do {
				col = String.fromCharCode((index % 26) + 'A'.charCodeAt(0)) + col
				index = Math.floor(index / 26) - 1
			} while (index >= 0)
			return col || 'A' // 如果是0，返回'A'
		}

		// 尝试匹配数字格式 (如 "0-0"，第一个数字是行号，第二个数字是列号)
		const numberPattern = /^(\d+)-(\d+)$/
		const numberMatch = range.match(numberPattern)
		if (numberMatch) {
			const [, row, col] = numberMatch
			const rowNumber = parseInt(row) + 1 // 转为1基数
			const colLetter = indexToCol(parseInt(col)) // 转换列号为字母

			return {
				start: {
					row: parseInt(row), // 保持0基数
					col: parseInt(col), // 保持0基数
				},
				end: {
					row: parseInt(row), // 保持0基数
					col: parseInt(col), // 保持0基数
				},
				format: {
					start: colLetter,
					end: colLetter,
				},
				sqref: `${colLetter}${rowNumber}:${colLetter}${rowNumber}`, // Excel格式使用1基数
			}
		}

		// 匹配单个单元格格式 (如 "A1", "B2")
		const singleCellPattern = /^([A-Z]+)(\d+)$/
		const singleCellMatch = range.match(singleCellPattern)
		if (singleCellMatch) {
			const [, col, row] = singleCellMatch
			return {
				start: {
					row: parseInt(row) - 1, // 转为0基数
					col: colToIndex(col),
				},
				end: {
					row: parseInt(row) - 1, // 转为0基数
					col: colToIndex(col),
				},
				format: {
					start: col,
					end: col,
				},
				sqref: `${col}${row}:${col}${row}`, // 保持原始Excel格式
			}
		}

		// 匹配Excel格式 (如 "C1:D1")
		const pattern = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/
		let match = range.match(pattern)
		if (!match) {
			if (!match) {
				throw new Error(
					'无效的单元格范围格式，正确格式例如: "A1:B2" 或 "0-0"（第一个数字是行号，第二个数字是列号）' +
						range
				)
			}
		}

		const [, startCol, startRow, endCol, endRow] = match

		return {
			start: {
				row: parseInt(startRow) - 1, // 转为0基数
				col: colToIndex(startCol),
			},
			end: {
				row: parseInt(endRow) - 1, // 转为0基数
				col: colToIndex(endCol),
			},
			format: {
				start: startCol,
				end: endCol,
			},
			sqref: `${startCol}${startRow}:${endCol}${endRow}`, // 保持原始Excel格式
		}
	}

	// luckysheet转air
	const luckyToAir = (config, data) => {
		return new Promise((resolve, reject) => {
			try {
				const total = data.length
				const celldata = []
				const styled = {}
				const merged = {}

				let processed = 0
				const batchSize = 3000

				if (config) {
					// 合并单元格处理
					if (config.merge) {
						Object.entries(config.merge).forEach(([key, value]) => {
							merged[`${value.r}-${value.c}`] = {
								rs: value.rs - 1,
								cs: value.cs - 1,
							}
						})
					}

					// 边框处理
					if (config.borderInfo) {
						// 创建一个映射来跟踪每个单元格
						const cellMap = {}
						config.borderInfo.forEach((item) => {
							if (item.rangeType && item.rangeType === 'cell') {
								const r = item.value.row_index
								const c = item.value.col_index
								cellMap[`${r}-${c}`] = true
							} else if (item.rangeType && item.rangeType === 'range') {
								item.range.forEach((r) => {
									const [startRow, endRow] = r.row
									const [startCol, endCol] = r.column

									for (let row = startRow; row <= endRow; row++) {
										for (let col = startCol; col <= endCol; col++) {
											cellMap[`${row}-${col}`] = true
											config.borderInfo.push({
												rangeType: 'cell',
												value: {
													row_index: row,
													col_index: col,
												},
											})
										}
									}
								})
							}
						})

						config.borderInfo.forEach((item) => {
							if (item.value) {
								const r = item.value.row_index
								const c = item.value.col_index

								if (!styled[`${r}-${c}`]) {
									styled[`${r}-${c}`] = {}
								}

								// 使用精确的边框定义，指定每个边的边框
								const borderTop = !cellMap[`${r - 1}-${c}`]
								const borderRight = !cellMap[`${r}-${c + 1}`]
								const borderBottom = !cellMap[`${r + 1}-${c}`]
								const borderLeft = !cellMap[`${r}-${c - 1}`]

								// 设置每个边的边框
								if (borderTop) {
									styled[`${r}-${c}`].bt = true
								}

								if (borderLeft) {
									styled[`${r}-${c}`].bl = true
								}

								styled[`${r}-${c}`].br = true
								styled[`${r}-${c}`].bb = true

								// 设置边框颜色（如果需要）
								if (borderTop || borderRight || borderBottom || borderLeft) {
									// styled[`${r}-${c}`].bc = '#000000' // 边框颜色
								}
							}
						})
					}

					// 处理锁定单元格
					if (
						config.authority &&
						config.authority.allowRangeList &&
						config.authority.allowRangeList.length > 0
					) {
						try {
							config.authority.allowRangeList.forEach((item) => {
								if (!item.sqref.includes('$')) {
									const {start, end} = parseCellRange(item.sqref)
									const startRow = Math.min(start.row, end.row)
									const startCol = Math.min(start.col, end.col)
									const endRow = Math.max(start.row, end.row)
									const endCol = Math.max(start.col, end.col)
									for (let row = startRow; row <= endRow; row++) {
										for (let col = startCol; col <= endCol; col++) {
											sheet.config.locked[`${row}-${col}`] = true
										}
									}
								}
							})
						} catch (e) {}
					}
				}

				function processBatch() {
					const start = performance.now()
					let count = 0

					while (
						processed < total &&
						count < batchSize &&
						performance.now() - start < 16
					) {
						const item = data[processed]

						if (!celldata[item.r]) {
							celldata[item.r] = []
						}
						celldata[item.r][item.c] = item.v.v

						if (!styled[item.r + '-' + item.c]) {
							styled[item.r + '-' + item.c] = {}
						}

						// 背景
						if (item?.v?.bg) {
							styled[item.r + '-' + item.c]['bg'] = item.v.bg
						}

						// 粗体
						if (item?.v?.bl) {
							styled[item.r + '-' + item.c]['bold'] = true
						}

						// 斜体
						if (item?.v?.it) {
							styled[item.r + '-' + item.c]['it'] = true
						}

						// 下划线
						if (item?.v?.un) {
							styled[item.r + '-' + item.c]['un'] = true
						}

						// 删除线
						if (item?.v?.st) {
							styled[item.r + '-' + item.c]['st'] = true
						}

						// 颜色
						if (item?.v?.fc) {
							styled[item.r + '-' + item.c]['fc'] = item.v.fc
						}

						// 字体大小
						if (item?.v?.fs) {
							const size = parseInt(item.v.fs)
							styled[item.r + '-' + item.c]['fs'] = parseInt(size)
						}

						// 字体
						if (item?.v?.ff) {
							styled[item.r + '-' + item.c]['ff'] = item.v.ff
						}

						// 对齐
						if (item?.v?.ht) {
							const ht = Number(item.v.ht)
							let align = 'left'
							if (ht === 0) {
								align = 'center'
							} else if (ht === 2) {
								align = 'right'
							}
							styled[item.r + '-' + item.c]['align'] = align
						}

						processed++
						count++
					}

					sheet.state.loading = true
					sheet.state.msg = '数据转换中...'
					sheet.state.progress = Math.floor((processed / total) * 100)

					if (processed < total) {
						requestAnimationFrame(processBatch)
					} else {
						sheet.state.progress = 100
						sheet.state.loading = false

						resolve({
							config: {
								styled,
								merged,
							},
							celldata,
						})
					}
				}
				requestAnimationFrame(processBatch)
			} catch (e) {
				reject(e)
			}
		})
	}

	// air转luckysheet
	const airToLucky = async (sheet) => {
		const merge = {}
		const authority = {
			allowRangeList: [],
		}
		const borderInfo = []
		const celldata = []

		// 合并单元格
		Object.entries(sheet.config.mergedCells).forEach(([key, value]) => {
			const [r, c] = key.split('-').map(Number)
			merge[`${r}_${c}`] = {
				r,
				c,
				rs: value.rowspan,
				cs: value.colspan,
			}
		})

		// 锁定单元格处理
		Object.entries(sheet.config.locked).forEach(([key, value]) => {
			const range = parseCellRange(key)
			authority.allowRangeList.push({
				sqref: range.sqref,
				password: useGuid(),
				name: 'NotEditableDiy',
				hintText: '单元格不可编辑!',
				algorithmName: 'None',
				saltValue: null,
			})
		})

		// 单元格数据
		loading.value = true
		loadingText.value = '数据转换中...'

		await useProcessMapInBatches(sheet.id, sheet.celldata, (rowIndex, rowData) => {
			const cells = []
			if (typeof rowIndex === 'number' && Array.isArray(rowData)) {
				rowData.forEach((cell, colIndex) => {
					const data = {r: rowIndex, c: colIndex, v: {v: cell}}
					const style = sheet.config.styled[rowIndex + '-' + colIndex]

					if (style) {
						// 背景
						if (style?.bg) {
							data.v.bg = style?.bg
						}

						// 粗体
						if (style?.bold) {
							data.v.bl = 1
						}

						// 斜体
						if (style?.it) {
							data.v.it = 1
						}

						// 下划线
						if (style?.un) {
							data.v.un = 1
						}

						// 删除线
						if (style?.st) {
							data.v.st = 1
						}

						// 颜色
						if (style?.fc) {
							data.v.fc = style?.fc
						}

						// 字体大小
						if (style?.fs) {
							data.v.fs = parseInt(style?.fs)
						}

						// 字体
						if (style?.ff) {
							data.v.ff = style?.ff
						}

						// 对齐
						if (style?.align) {
							let ht = 1 // 左对齐
							if (style?.align === 'center') {
								ht = 0 // 居中对齐
							} else if (style?.align === 'right') {
								ht = 2 // 右对齐
							}
							data.v.ht = ht
						}

						// 边框
						if (style?.b || style?.bt || style?.bb || style?.bl || style?.br) {
							let border = {
								rangeType: 'cell',
								value: {
									row_index: rowIndex,
									col_index: colIndex,
								},
							}

							if (style?.bt) {
								Object.assign(border.value, {
									t: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.bb) {
								Object.assign(border.value, {
									b: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.bl) {
								Object.assign(border.value, {
									l: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}

							if (style?.br) {
								Object.assign(border.value, {
									r: {style: 1, color: 'rgb(0, 0, 0)'},
								})
							}
							borderInfo.push(border)
						}
					}
					cells.push(data)
				})
				celldata.push(cells)
			}
		})
		loading.value = false

		return Promise.resolve({
			merge,
			authority,
			borderInfo,
			celldata,
		})
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
	}

	// source: key or {}
	const addSheet = async (sheet, props, emits, callback = () => {}) => {
		await sheetStore.addSheet(sheet, props, emits, callback)
	}

	const synergyEvent = (json) => {
		if (!sheet.config.synergy) {
			return
		}
		sheet.emits?.('asyncConfig', json)
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => console.log('installed useTools'), 16)
		return {
			setCellStyle,

			setFont,
			setFontSize,
			setFormat,
			setFontColor,
			fontColorChanged,
			setFillColor,
			fillColorChanged,
			setBorderColor,
			borderColorChanged,

			setBold,
			setItalic,
			setUnderline,
			setStrikethrough,
			setMerge,
			setBorder,
			setAlign,

			freezeRow,
			freezeCol,
			setFreeze,
			setFilter,
			setSearch,
			searchAll,
			searchPrevious,
			searchNext,
			scrollToCellAndSelect,

			addRowCount,
			addRow,
			removeRow,

			addColumnCount,
			addColumn,
			removeColumn,

			importExcel,
			exportExcel,

			setLocked,
			setUnlocked,

			filterCol,
			filterByChecked,
			filterByCheckedSilent,

			luckyToAir,
			airToLucky,

			clearAll,
			addSheet,

			refreshSheet,
			parseCellRange,
			asyncUpdateConfig,
		}
	}

	return {
		init,
	}
}
