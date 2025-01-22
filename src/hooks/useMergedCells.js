import {reactive} from 'vue'

// mergedCells.js
export const useMergedCells = () => {
	// 存储合并单元格信息
	const mergedCells = reactive(new Map())

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
	const getCellStyle = (cell, options) => {
		// 1. 检查是否是合并单元格的起始位置
		const key = `${cell.rowIndex}-${cell.colIndex}`
		if (mergedCells.has(key)) {
			const merged = mergedCells.get(key)
			return {
				height: `${merged.rowSpan * options.rowHeight}px`,
				width: `${merged.colSpan * options.colWidth}px`,
				position: 'fixed', // 改用fixed定位
				top: `${cell.rowIndex * options.rowHeight - options.offsetTop}px`,
				left: `${cell.colIndex * options.colWidth - options.offsetLeft}px`,
				zIndex: 2,
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
					height: `${options.rowHeight}px`,
					width: `${options.colWidth}px`,
					opacity: 0,
					visibility: 'hidden',
					pointerEvents: 'none',
				}
			}
		}

		// 3. 普通单元格样式
		return {
			height: `${options.rowHeight}px`,
			width: `${options.colWidth}px`,
		}
	}

	// 检查单元格是否需要渲染
	const shouldRenderCell = (rowIndex, colIndex) => {
		// 如果是合并单元格的起始位置，显示它
		const key = `${rowIndex}-${colIndex}`
		if (mergedCells.has(key)) {
			return true
		}

		// 检查是否在其他合并单元格范围内
		for (const [mergedKey, value] of mergedCells.entries()) {
			const [mergedRow, mergedCol] = mergedKey.split('-').map(Number)
			if (
				rowIndex >= mergedRow &&
				rowIndex < mergedRow + value.rowSpan &&
				colIndex >= mergedCol &&
				colIndex < mergedCol + value.colSpan
			) {
				return false
			}
		}
		console.log('shouldRenderCell:', rowIndex, colIndex)

		return true
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
		shouldRenderCell,
	}
}
