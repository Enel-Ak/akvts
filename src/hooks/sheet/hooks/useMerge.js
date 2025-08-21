// import {useStyle} from './useStyle'
export const useMerge = () => {
	// 基础配置
	// const {sheet, useResizeHook, renderRange, rowHeight, colWidth, useSelectionRangeHook} = config
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

		// 检查是否是相同位置的框选
		if (existingMerge) {
			// 如果是相同位置，检查大小是否相同
			if (existingMerge.rs === rs && existingMerge.cs === cs && force) {
				// 相同位置且相同大小，则取消合并
				mergedCells.delete(currentKey)
			} else {
				// 相同位置但大小不同，删除旧合并并创建新合并
				mergedCells.delete(currentKey)
				// 检查新区域是否有其他合并单元格
				for (let i = r; i < r + rs; i++) {
					for (let j = c; j < c + cs; j++) {
						if (i === r && j === c) continue
						const otherMerge = findMergedCell(i, j)
						if (otherMerge) {
							mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
						}
					}
				}
				// 创建新合并
				mergedCells.set(currentKey, {rs, cs})
			}
		} else {
			// 如果是新位置，检查新区域内是否有已存在的合并单元格
			for (let i = r; i < r + rs; i++) {
				for (let j = c; j < c + cs; j++) {
					const otherMerge = findMergedCell(i, j)
					if (otherMerge) {
						mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
					}
				}
			}
			// 创建新合并
			mergedCells.set(currentKey, {rs, cs})
		}

		sheet.config.merged = getMergedCells()
	}

	// 批量设置合并单元格
	const setMergeCells = (cellMap, isReplace = true) => {
		if (isReplace) {
			mergedCells = cellMap
		} else {
			mergedCells = new Map([...mergedCells, ...cellMap])
		}

		sheet.config.merged = getMergedCells()
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

			for (let i = cell.r; i <= cell.r + rs; i++) {
				rh += sheet.hooks.resizeHook.getRowHeight(i)
			}

			for (let i = cell.c; i <= cell.c + cs; i++) {
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
		mergedCells.delete(`${r}-${c}`)
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
				r <= mergedRow + value.rs &&
				c >= mergedCol &&
				c <= mergedCol + value.cs
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

	const init = (reactiveSheet) => {
		sheet = reactiveSheet
		setTimeout(() => console.log('installed useMerge'), 16)
		return {
			getCellStyle,
			getMergedCells,
			setMerge,
			setMergeCells,
			findMergedCell,
			clearMergedCells,
			removeMergedCell,
		}
	}

	return {
		init,
	}
}
