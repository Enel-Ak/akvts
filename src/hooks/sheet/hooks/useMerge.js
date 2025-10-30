import {useAirSheetStore} from '../store/useAirSheet'
export const useMerge = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = ''
	let sheet = null

	// 存储合并单元格信息
	let mergedCells = new Map()

	// 获取所有合并单元格
	const getMergedCells = () => {
		const result = {}
		for (const [key, value] of mergedCells.entries()) {
			result[key] = value
		}
		return result
	}

	// 添加合并单元格
	const setMerge = (r, c, rs, cs, force = true) => {
		const currentKey = `${r}-${c}`
		const existingMerge = mergedCells.get(currentKey)

		console.log('setMerge 调用:', {r, c, rs, cs, force, currentKey, existingMerge})

		// 检查是否是相同位置的框选
		if (existingMerge) {
			// 如果是相同位置，检查大小是否相同
			if (existingMerge.rs === rs && existingMerge.cs === cs && force) {
				// 相同位置且相同大小，则取消合并
				console.log('取消合并:', currentKey)
				mergedCells.delete(currentKey)
				sheet.config.merged = getMergedCells()

				console.log('取消合并后的 merged 配置:', sheet.config.merged)

				// 取消合并后，需要确保被合并单元格的内容能够正确显示
				// 强制触发界面重新渲染
				if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
					setTimeout(() => {
						sheet.state.lastMergeUpdate = Date.now()
						console.log('取消合并触发界面重新渲染')
					}, 0)
				}
				return
			} else {
				// 相同位置但大小不同，删除旧合并
				console.log('删除旧合并（大小不同）:', currentKey)
				mergedCells.delete(currentKey)
			}
		}

		// 清理所有与新合并区域有冲突的现有合并单元格
		const conflictingMerges = new Set()

		// 检查新区域内的每个单元格
		for (let i = r; i < r + rs; i++) {
			for (let j = c; j < c + cs; j++) {
				const otherMerge = findMergedCell(i, j)
				if (otherMerge) {
					// 记录冲突的合并单元格
					conflictingMerges.add(`${otherMerge.r}-${otherMerge.c}`)
				}
			}
		}

		// 同时检查是否有其他合并单元格与新区域有交集
		for (const [mergeKey, mergeValue] of mergedCells.entries()) {
			const [mergeR, mergeC] = mergeKey.split('-').map(Number)
			const mergeEndR = mergeR + mergeValue.rs
			const mergeEndC = mergeC + mergeValue.cs
			const newEndR = r + rs
			const newEndC = c + cs

			// 检查是否有交集
			if (!(mergeEndR <= r || mergeR >= newEndR || mergeEndC <= c || mergeC >= newEndC)) {
				conflictingMerges.add(mergeKey)
			}
		}

		// 删除所有冲突的合并单元格
		if (conflictingMerges.size > 0) {
			console.log('删除冲突的合并单元格:', [...conflictingMerges])
		}
		conflictingMerges.forEach((key) => {
			mergedCells.delete(key)
		})

		// 创建新合并（如果rs和cs都大于0）
		if (rs > 0 && cs > 0) {
			console.log('创建新合并:', currentKey, {rs, cs})
			mergedCells.set(currentKey, {rs, cs})
		}

		sheet.config.merged = getMergedCells()
		console.log('setMerge 完成，最终 merged 配置:', sheet.config.merged)
	}

	// 批量设置合并单元格
	const setMergeCells = (cellMap, isReplace = true) => {
		if (isReplace) {
			mergedCells = cellMap
		} else {
			mergedCells = new Map([...mergedCells, ...cellMap])
		}

		sheet.config.merged = getMergedCells()

		// 批量设置合并单元格后，强制触发界面重新渲染
		// 这对于协同同步时的界面更新非常重要
		if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
			setTimeout(() => {
				sheet.state.lastMergeUpdate = Date.now()
			}, 0)
		}
	}

	// 获取单元格样式
	const getCellStyle = (cell) => {
		const key = `${cell.r}-${cell.c}`
		const merged = mergedCells.get(key)

		// 1. 检查是否是合并单元格的起始位置
		if (merged) {
			let rh = 0
			let cw = 0

			const {rs, cs} = merged

			for (let i = cell.r; i < cell.r + rs; i++) {
				rh += sheet.hooks.resizeHook.getRowHeight(i)
			}

			for (let i = cell.c; i < cell.c + cs; i++) {
				cw += sheet.hooks.resizeHook.getColWidth(i)
			}

			// 合并单元格
			return {
				height: `${rh || sheet.rowHeight}px`,
				width: `${cw || sheet.colWidth}px`,
				position: 'absolute',
				top: 0,
				left: 0,
			}
		}

		// 2. 检查是否在合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)

			if (
				cell.r >= mergedRow &&
				cell.r < mergedRow + value.rs &&
				cell.c >= mergedCol &&
				cell.c < mergedCol + value.cs
			) {
				// 在合并单元格内
				return {
					height: `${sheet.hooks.resizeHook.getRowHeight(cell.r)}px`,
					width: `${sheet.hooks.resizeHook.getColWidth(cell.c)}px`,
					opacity: 0,
					visibility: 'hidden',
					pointerEvents: 'none',
				}
			}
		}

		// 3. 普通单元格样式
		return {
			height: `${sheet.hooks.resizeHook.getRowHeight(cell.r)}px`,
			width: `${sheet.hooks.resizeHook.getColWidth(cell.c)}px`,
		}
	}

	// 清除合并单元格
	const clearMergedCells = () => {
		sheet.config.merged = {}
		mergedCells.clear()
	}

	// 删除指定的合并单元格
	const removeMergedCell = (r, c) => {
		if (mergedCells.has(`${r}-${c}`)) {
			mergedCells.delete(`${r}-${c}`)
			sheet.config.merged = getMergedCells()
		}
	}

	const findMergedCell = (r, c) => {
		// 1. 检查是否是合并单元格的起始位置
		const key = `${r}-${c}`
		if (mergedCells.has(key)) {
			return {
				r,
				c,
				...mergedCells.get(key),
			}
		}

		// 2. 检查是否在其他合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)

			if (
				r >= mergedRow &&
				r < mergedRow + value.rs &&
				c >= mergedCol &&
				c < mergedCol + value.cs
			) {
				return {
					r: mergedRow,
					c: mergedCol,
					...value,
				}
			}
		}

		return null
	}

	// 检查当前列在指定行是否有合并单元格
	// 用于列级权限检查：返回该列在该行处的完整合并信息
	// r 为该列内合并的起始行，c 保持不变（传入的列号），rs 为该列内的完整行跨度，cs 保持不变
	// 例如：isRowMerged(1, 0) 检查第1行第0列，如果第0-2行的第0-1列合并，返回 {r: 0, c: 0, rs: 3, cs: 2}
	const isRowMerged = (r, c) => {
		// 检查所有合并单元格
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)
			const mergedEndRow = mergedRow + value.rs - 1
			const mergedEndCol = mergedCol + value.cs - 1

			// 检查该行该列是否在合并单元格范围内
			if (r >= mergedRow && r <= mergedEndRow && c >= mergedCol && c <= mergedEndCol) {
				return {
					r: mergedRow, // 该列内合并的起始行
					c: c, // 保持不变（传入的列号）
					rs: value.rs, // 该列内的完整行跨度
					cs: value.cs, // 保持不变（原合并单元格的列跨度）
				}
			}
		}

		return null
	}

	// 检查当前行在指定列是否有合并单元格
	// 用于行级权限检查：返回该行在该列处的完整合并信息
	// r 保持不变（传入的行号），c 为该行内合并的起始列，rs 保持不变，cs 为该行内的完整列跨度
	// 例如：isColumnMerged(0, 1) 检查第0行第1列，如果第0行的第0-1列合并，返回 {r: 0, c: 0, rs: 1, cs: 2}
	const isColumnMerged = (r, c) => {
		// 检查所有合并单元格
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)
			const mergedEndRow = mergedRow + value.rs - 1
			const mergedEndCol = mergedCol + value.cs - 1

			// 检查该行该列是否在合并单元格范围内
			if (r >= mergedRow && r <= mergedEndRow && c >= mergedCol && c <= mergedEndCol) {
				return {
					r: r, // 保持不变（传入的行号）
					c: mergedCol, // 该行内合并的起始列
					rs: value.rs, // 保持不变（原合并单元格的行跨度）
					cs: value.cs, // 该行内的完整列跨度
				}
			}
		}

		return null
	}

	const refreshMerge = () => {
		console.log('refreshMerge 开始，当前 merged 配置:', sheet.config.merged)
		console.log('refreshMerge 之前的 mergedCells:', [...mergedCells.entries()])

		const merged = sheet.config.merged

		// 先清空 mergedCells，避免旧数据残留
		mergedCells.clear()

		// 重新设置所有合并单元格
		for (const key in merged) {
			mergedCells.set(key, merged[key])
		}

		console.log('refreshMerge 之后的 mergedCells:', [...mergedCells.entries()])

		// 刷新合并单元格后，强制触发界面重新渲染
		// 这对于协同同步时的界面更新非常重要
		if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
			setTimeout(() => {
				sheet.state.lastMergeUpdate = Date.now()
				console.log('refreshMerge 触发界面重新渲染')
			}, 0)
		}
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
		mergedCells.clear()
		for (const key in sheet.config.merged) {
			mergedCells.set(key, sheet.config.merged[key])
		}
	}

	const destroy = () => {
		sheet = null
		sheetKey = null
	}

	const init = (key) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)
		setTimeout(() => console.log('installed useMerge'), 16)
		return {
			destroy,
			getCellStyle,
			getMergedCells,
			setMerge,
			setMergeCells,
			findMergedCell,
			isRowMerged,
			isColumnMerged,
			clearMergedCells,
			removeMergedCell,

			refreshSheet,
			refreshMerge,
		}
	}

	return {
		init,
	}
}
