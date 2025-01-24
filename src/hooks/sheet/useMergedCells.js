export const useMergedCells = (config) => {
	// 基础配置
	const {useResizeHook} = config

	// 存储合并单元格信息
	const mergedCells = new Map()

	// 添加合并单元格
	const addMergedCell = (rowIndex, colIndex, rowSpan, colSpan) => {
		mergedCells.set(`${rowIndex}-${colIndex}`, {
			rowSpan,
			colSpan,
		})
		console.log('添加合并单元格:', mergedCells)
	}

	// 获取所有合并单元格
	const getMergedCells = () => {
		const result = {}
		for (const [key, value] of mergedCells.entries()) {
			result[key] = value
		}
		return result
	}

	// 获取单元格样式
	const getCellStyle = (cell, config) => {
		const key = `${cell.rowIndex}-${cell.colIndex}`
		const merged = mergedCells.get(key)

		// // 计算到当前行的总高度（包括之前所有行的实际高度）
		// let totalOffsetTop = 0
		// for (let i = 0; i < cell.rowIndex; i++) {
		// 	totalOffsetTop += useResizeHook.getRowHeight(i)
		// }

		// // 计算到当前列的总宽度
		// let totalOffsetLeft = 0
		// for (let i = 0; i < cell.colIndex; i++) {
		// 	totalOffsetLeft += useResizeHook.getColWidth(i)
		// }

		// // 计算合并单元格的总高度和总宽度
		// let totalHeight = 0
		// let totalWidth = 0
		// if (merged) {
		// 	for (let i = cell.rowIndex; i < cell.rowIndex + merged.rowSpan; i++) {
		// 		totalHeight += useResizeHook.getRowHeight(i)
		// 	}
		// 	for (let i = cell.colIndex; i < cell.colIndex + merged.colSpan; i++) {
		// 		totalWidth += useResizeHook.getColWidth(i)
		// 	}
		// }

		// 1. 检查是否是合并单元格的起始位置
		if (merged) {
			const {rowSpan, colSpan} = merged
			return {
				height: `${cell.rowHeight * rowSpan}px`,
				width: `${cell.colWidth * colSpan}px`,
				position: 'absolute',
				top: 0,
				left: 0,
			}
		}

		// 2. 检查是否在合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)

			if (
				cell.rowIndex >= mergedRow &&
				cell.rowIndex < mergedRow + value.rowSpan &&
				cell.colIndex >= mergedCol &&
				cell.colIndex < mergedCol + value.colSpan
			) {
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
		}
	}

	// 清除合并单元格
	const clearMergedCells = () => {
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
				rowIndex < mergedRow + value.rowSpan &&
				colIndex >= mergedCol &&
				colIndex < mergedCol + value.colSpan
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

	return {
		getCellStyle,
		getMergedCells,
		addMergedCell,
		findMergedCell,
		clearMergedCells,
		removeMergedCell,
	}
}
