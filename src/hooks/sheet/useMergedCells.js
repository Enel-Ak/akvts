import {useStyle} from './useStyle'
export const useMergedCells = (config) => {
	// 基础配置
	const {sheet, useResizeHook, renderRange} = config

	// 存储合并单元格信息
	let mergedCells = new Map()

	// 添加合并单元格
	const addMergedCell = (rowIndex, colIndex, rowSpan, colSpan) => {
		const currentKey = `${rowIndex}-${colIndex}`
		const existingMerge = mergedCells.get(currentKey)

		// 检查是否是相同位置的框选
		if (existingMerge) {
			// 如果是相同位置，检查大小是否相同
			if (existingMerge.rowSpan === rowSpan && existingMerge.colSpan === colSpan) {
				// 相同位置且相同大小，则取消合并
				mergedCells.delete(currentKey)
			} else {
				// 相同位置但大小不同，删除旧合并并创建新合并
				mergedCells.delete(currentKey)
				// 检查新区域是否有其他合并单元格
				for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
					for (let c = colIndex; c < colIndex + colSpan; c++) {
						if (r === rowIndex && c === colIndex) continue
						const otherMerge = findMergedCell(r, c)
						if (otherMerge) {
							mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
						}
					}
				}
				// 创建新合并
				mergedCells.set(currentKey, {rowSpan, colSpan})
			}
		} else {
			// 如果是新位置，检查新区域内是否有已存在的合并单元格
			for (let r = rowIndex; r < rowIndex + rowSpan; r++) {
				for (let c = colIndex; c < colIndex + colSpan; c++) {
					const otherMerge = findMergedCell(r, c)
					if (otherMerge) {
						mergedCells.delete(`${otherMerge.row}-${otherMerge.col}`)
					}
				}
			}
			// 创建新合并
			mergedCells.set(currentKey, {rowSpan, colSpan})
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
	const setMergedCells = (cellMap) => {
		mergedCells = cellMap
		sheet.config.mergedCells = getMergedCells()
	}

	// 获取单元格样式
	const getCellStyle = (cell) => {
		const key = `${cell.rowIndex}-${cell.colIndex}`
		const merged = mergedCells.get(key)

		// cellStyle
		const style = useStyle(sheet.config.cellStyle[key])

		// 1. 检查是否是合并单元格的起始位置
		if (merged) {
			let rowHeight = 0
			let colWidth = 0
			const {rowSpan, colSpan} = merged

			for (let i = cell.rowIndex; i < cell.rowIndex + rowSpan; i++) {
				rowHeight += useResizeHook.getRowHeight(i)
			}

			for (let i = cell.colIndex; i < cell.colIndex + colSpan; i++) {
				colWidth += useResizeHook.getColWidth(i)
			}

			return {
				height: `${rowHeight}px`,
				width: `${colWidth}px`,
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
			...style,
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

	const init = () => {
		sheet.config.mergedCells = getMergedCells()
	}

	return {
		init,
		getCellStyle,
		getMergedCells,
		setMergedCells,
		addMergedCell,
		findMergedCell,
		clearMergedCells,
		removeMergedCell,
	}
}
