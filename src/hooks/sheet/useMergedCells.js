import {useStyle} from './useStyle'
export const useMergedCells = (config) => {
	// 基础配置
	const {sheet, useResizeHook, renderRange, rowHeight, colWidth} = config

	// 存储合并单元格信息
	let mergedCells = new Map()

	// 添加合并单元格
	const setMergeCell = (rowIndex, colIndex, rowspan, colspan) => {
		const currentKey = `${rowIndex}-${colIndex}`
		const existingMerge = mergedCells.get(currentKey)

		// 检查是否是相同位置的框选
		if (existingMerge) {
			// 如果是相同位置，检查大小是否相同
			if (existingMerge.rowspan === rowspan && existingMerge.colspan === colspan) {
				// 相同位置且相同大小，则取消合并
				mergedCells.delete(currentKey)
			} else {
				// 相同位置但大小不同，删除旧合并并创建新合并
				mergedCells.delete(currentKey)
				// 检查新区域是否有其他合并单元格
				for (let r = rowIndex; r < rowIndex + rowspan; r++) {
					for (let c = colIndex; c < colIndex + colspan; c++) {
						if (r === rowIndex && c === colIndex) continue
						const otherMerge = findMergedCell(r, c)
						if (otherMerge) {
							mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
						}
					}
				}
				// 创建新合并
				mergedCells.set(currentKey, {rowspan, colspan})
			}
		} else {
			// 如果是新位置，检查新区域内是否有已存在的合并单元格
			for (let r = rowIndex; r < rowIndex + rowspan; r++) {
				for (let c = colIndex; c < colIndex + colspan; c++) {
					const otherMerge = findMergedCell(r, c)
					if (otherMerge) {
						mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
					}
				}
			}
			// 创建新合并
			mergedCells.set(currentKey, {rowspan, colspan})
		}

		console.log('添加合并单元格:', mergedCells)
		sheet.config.mergedCells = getMergedCells()
		renderRange()
	}

	// 获取所有合并单元格
	const getMergedCells = () => {
		const result = {}
		for (const [key, value] of mergedCells.entries()) {
			result[key] = value
		}
		return result
	}

	// 设置合并单元格
	const setMergeCells = (cellMap, isReplace = true) => {
		if (isReplace) {
			mergedCells = cellMap
		} else {
			mergedCells = new Map([...mergedCells, ...cellMap])
		}

		sheet.config.mergedCells = getMergedCells()
	}

	// 获取单元格样式
	const getCellStyle = (cell) => {
		const key = `${cell.rowIndex}-${cell.colIndex}`
		const merged = mergedCells.get(key)

		// cellStyle
		const style = useStyle(sheet.config.cellStyle[key], sheet.config.zoom)

		// 1. 检查是否是合并单元格的起始位置
		if (merged) {
			let rh = 0
			let cw = 0
			const {rowspan, colspan} = merged

			for (let i = cell.rowIndex; i < cell.rowIndex + rowspan; i++) {
				rh += useResizeHook.getRowHeight(i)
			}

			for (let i = cell.colIndex; i < cell.colIndex + colspan; i++) {
				cw += useResizeHook.getColWidth(i)
			}
			// 合并单元格
			return {
				height: `${rh || rowHeight}px`,
				width: `${cw || colWidth}px`,
				position: 'absolute',
				top: 0,
				left: 0,
				...style,
			}
		}

		// 2. 检查是否在合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)

			if (
				cell.rowIndex >= mergedRow &&
				cell.rowIndex < mergedRow + value.rowspan &&
				cell.colIndex >= mergedCol &&
				cell.colIndex < mergedCol + value.colspan
			) {
				// 在合并单元格内
				return {
					height: `${useResizeHook.getRowHeight(cell.rowIndex)}px`,
					width: `${useResizeHook.getColWidth(cell.colIndex)}px`,
					opacity: 0,
					visibility: 'hidden',
					pointerEvents: 'none',
				}
			}
		}

		// 3. 普通单元格样式
		return {
			height: `${useResizeHook.getRowHeight(cell.rowIndex)}px`,
			width: `${useResizeHook.getColWidth(cell.colIndex)}px`,
			...style,
		}
	}

	// 清除合并单元格
	const clearMergedCells = () => {
		sheet.config.mergedCells = {}
		mergedCells.clear()
	}

	// 删除指定的合并单元格
	const removeMergedCell = (rowIndex, colIndex) => {
		mergedCells.delete(`${rowIndex}-${colIndex}`)
	}

	const findMergedCell = (rowIndex, colIndex) => {
		// 1. 检查是否是合并单元格的起始位置
		const key = `${rowIndex}-${colIndex}`
		if (mergedCells.has(key)) {
			return {
				row: rowIndex,
				col: colIndex,
				...mergedCells.get(key),
			}
		}

		// 2. 检查是否在其他合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)
			if (
				rowIndex >= mergedRow &&
				rowIndex < mergedRow + value.rowspan &&
				colIndex >= mergedCol &&
				colIndex < mergedCol + value.colspan
			) {
				return {
					row: mergedRow,
					col: mergedCol,
					...value,
				}
			}
		}

		return null
	}

	const init = () => {
		sheet.config.mergedCells = getMergedCells()
	}

	return {
		init,
		getCellStyle,
		getMergedCells,
		setMergeCells,
		setMergeCell,
		findMergedCell,
		clearMergedCells,
		removeMergedCell,
	}
}
