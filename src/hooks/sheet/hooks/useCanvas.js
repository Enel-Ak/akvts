import {ref, computed, onMounted, onUnmounted, nextTick} from 'vue'

/**
 * Canvas-based spreadsheet rendering composable
 * Replaces DOM-based cell rendering with high-performance canvas rendering
 */
export const useCanvas = (options = {}) => {
	// Configuration from parent component
	const {
		sheet,
		visibleRangeRef,
		offsetTop,
		offsetLeft,
		scrollTop,
		scrollLeft,
		viewportWidth,
		viewportHeight,
		canvasRef,
		onCellClick,
		onCellDoubleClick,
		onCellBlur,
		getCellClass,
		getOffsetStyle,
		isMergedCellStart,
	} = options

	// Canvas context
	const canvasContext = ref(null)

	// Canvas rendering state
	const isRendering = ref(false)
	const renderQueue = ref([])
	const devicePixelRatio = ref(window.devicePixelRatio || 1)

	// Cell styling cache
	const styleCache = new Map()
	const textMetricsCache = new Map()

	// Mouse interaction state
	const mousePosition = ref({x: 0, y: 0})
	const hoveredCell = ref(null)
	const isDragging = ref(false)

	/**
	 * Initialize canvas with proper dimensions and context
	 */
	const initCanvas = () => {
		if (!canvasRef?.value) return

		const canvas = canvasRef.value
		const ctx = canvas.getContext('2d')

		// Set up high-DPI rendering
		const rect = canvas.getBoundingClientRect()
		const dpr = devicePixelRatio.value

		canvas.width = rect.width * dpr
		canvas.height = rect.height * dpr
		canvas.style.width = rect.width + 'px'
		canvas.style.height = rect.height + 'px'

		ctx.scale(dpr, dpr)
		canvasContext.value = ctx

		// Set default text properties
		ctx.textBaseline = 'middle'
		ctx.textAlign = 'left'
	}

	/**
	 * Calculate cell position from canvas coordinates
	 */
	const getCellFromCoordinates = (x, y) => {
		if (!visibleRangeRef.value?.visible) return null

		const {startRow, startCol} = visibleRangeRef.value.visible
		let currentY = 0
		let currentX = 0

		// Find row
		let targetRow = startRow
		for (let row = startRow; row < sheet.config.rowCount; row++) {
			const rowHeight = sheet.hooks.resizeHook.getRowHeight(row)
			if (currentY + rowHeight > y) {
				targetRow = row
				break
			}
			currentY += rowHeight
		}

		// Find column
		let targetCol = startCol
		for (let col = startCol; col < sheet.config.colCount; col++) {
			const colWidth = sheet.hooks.resizeHook.getColWidth(col)
			if (currentX + colWidth > x) {
				targetCol = col
				break
			}
			currentX += colWidth
		}

		return {
			rowIndex: targetRow,
			colIndex: targetCol,
			x: currentX,
			y: currentY,
			width: sheet.hooks.resizeHook.getColWidth(targetCol),
			height: sheet.hooks.resizeHook.getRowHeight(targetRow),
		}
	}

	/**
	 * Get cached or calculate text metrics
	 */
	const getTextMetrics = (text, font) => {
		const key = `${text}-${font}`
		if (textMetricsCache.has(key)) {
			return textMetricsCache.get(key)
		}

		const ctx = canvasContext.value
		if (!ctx) return {width: 0, height: 0}

		ctx.font = font
		const metrics = ctx.measureText(text)
		const result = {
			width: metrics.width,
			height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
		}

		textMetricsCache.set(key, result)
		return result
	}

	/**
	 * Apply cell styles to canvas context
	 */
	const applyCellStyle = (ctx, cell, style) => {
		const zoom = sheet.config.zoom || 1
		const fontSize = (style?.fs || 13) * zoom
		const fontFamily = style?.ff || 'FZSSJW, sans-serif'
		const fontWeight = style?.bold ? 'bold' : 'normal'
		const fontStyle = style?.it ? 'italic' : 'normal'

		ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
		ctx.fillStyle = style?.fc || '#000000'
		ctx.textAlign = style?.align || 'left'

		return {fontSize, fontFamily, fontWeight, fontStyle}
	}

	/**
	 * Draw cell background and borders
	 */
	const drawCellBackground = (ctx, x, y, width, height, style) => {
		// Background color
		if (style?.bg) {
			ctx.fillStyle = style.bg
			ctx.fillRect(x, y, width, height)
		}

		// Borders
		ctx.strokeStyle = style?.borderColor || '#e0e0e0'
		ctx.lineWidth = 1

		if (style?.bt || style?.border) {
			ctx.beginPath()
			ctx.moveTo(x, y)
			ctx.lineTo(x + width, y)
			ctx.stroke()
		}

		if (style?.bb || style?.border) {
			ctx.beginPath()
			ctx.moveTo(x, y + height)
			ctx.lineTo(x + width, y + height)
			ctx.stroke()
		}

		if (style?.bl || style?.border) {
			ctx.beginPath()
			ctx.moveTo(x, y)
			ctx.lineTo(x, y + height)
			ctx.stroke()
		}

		if (style?.br || style?.border) {
			ctx.beginPath()
			ctx.moveTo(x + width, y)
			ctx.lineTo(x + width, y + height)
			ctx.stroke()
		}
	}

	/**
	 * Draw cell text content
	 */
	const drawCellText = (ctx, text, x, y, width, height, style) => {
		if (!text) return

		const padding = 4
		const textX = x + padding
		const textY = y + height / 2

		// Apply text styles
		applyCellStyle(ctx, null, style)

		// Handle text alignment
		let alignedX = textX
		if (style?.align === 'center') {
			alignedX = x + width / 2
			ctx.textAlign = 'center'
		} else if (style?.align === 'right') {
			alignedX = x + width - padding
			ctx.textAlign = 'right'
		}

		// Clip text to cell bounds
		ctx.save()
		ctx.beginPath()
		ctx.rect(x, y, width, height)
		ctx.clip()

		ctx.fillText(text, alignedX, textY)

		// Draw text decorations
		if (style?.un) {
			// underline
			const metrics = ctx.measureText(text)
			ctx.beginPath()
			ctx.moveTo(alignedX, textY + 2)
			ctx.lineTo(alignedX + metrics.width, textY + 2)
			ctx.stroke()
		}

		if (style?.st) {
			// strikethrough
			const metrics = ctx.measureText(text)
			ctx.beginPath()
			ctx.moveTo(alignedX, textY)
			ctx.lineTo(alignedX + metrics.width, textY)
			ctx.stroke()
		}

		ctx.restore()
	}

	/**
	 * Render a single cell
	 */
	const renderCell = (ctx, cell, x, y) => {
		const {rowIndex, colIndex, value, rowHeight, colWidth} = cell
		const cellKey = `${rowIndex}-${colIndex}`

		// Get cell style
		const cellStyle = sheet.config.cellStyle[cellKey] || {}
		const isLocked = sheet.config.lockCells[cellKey]
		const hasFormula = sheet.config.cellFormula[cellKey]

		// Draw background and borders
		drawCellBackground(ctx, x, y, colWidth, rowHeight, cellStyle)

		// Format and draw text
		const formattedValue = sheet.hooks.editHook.formattedValue(value, cell)
		drawCellText(ctx, formattedValue, x, y, colWidth, rowHeight, cellStyle)

		// Visual indicators for locked/formula cells
		if (isLocked) {
			ctx.fillStyle = 'rgba(255, 0, 0, 0.1)'
			ctx.fillRect(x, y, colWidth, rowHeight)
		}

		if (hasFormula) {
			ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'
			ctx.fillRect(x, y, colWidth, rowHeight)
		}
	}

	/**
	 * Main render function
	 */
	const render = () => {
		if (!canvasContext.value || !visibleRangeRef.value?.visible || isRendering.value) {
			return
		}

		isRendering.value = true
		const ctx = canvasContext.value
		const {startRow, endRow, startCol, endCol} = visibleRangeRef.value.visible

		// Clear canvas
		ctx.clearRect(
			0,
			0,
			canvasRef.value.width / devicePixelRatio.value,
			canvasRef.value.height / devicePixelRatio.value
		)

		let currentY = 0

		// Render visible cells
		for (let row = startRow; row < Math.min(endRow, sheet.config.rowCount); row++) {
			const rowHeight = sheet.hooks.resizeHook.getRowHeight(row)
			let currentX = 0

			for (let col = startCol; col < Math.min(endCol, sheet.config.colCount); col++) {
				const colWidth = sheet.hooks.resizeHook.getColWidth(col)

				// Check for merged cells
				const mergedCell = sheet.hooks.mergeHook.findMergedCell(row, col)
				let value = ''

				if (mergedCell) {
					if (mergedCell.row === row && mergedCell.col === col) {
						value = sheet.celldata.get(row)?.[col] || ''
					}
				} else {
					value = sheet.celldata.get(row)?.[col] || ''
				}

				const cell = {
					rowIndex: row,
					colIndex: col,
					value,
					rowHeight,
					colWidth,
				}

				renderCell(ctx, cell, currentX, currentY)
				currentX += colWidth
			}

			currentY += rowHeight
		}

		isRendering.value = false
	}

	/**
	 * Handle mouse events on canvas
	 */
	const handleMouseEvent = (event, eventType) => {
		const rect = canvasRef.value.getBoundingClientRect()
		const x = event.clientX - rect.left
		const y = event.clientY - rect.top

		const cell = getCellFromCoordinates(x, y)
		if (!cell) return

		const cellData = {
			rowIndex: cell.rowIndex,
			colIndex: cell.colIndex,
			value: sheet.celldata.get(cell.rowIndex)?.[cell.colIndex] || '',
			rowHeight: cell.height,
			colWidth: cell.width,
		}

		switch (eventType) {
			case 'click':
				onCellClick?.(event, cellData)
				break
			case 'dblclick':
				onCellDoubleClick?.(event, cellData)
				break
			case 'mousemove':
				hoveredCell.value = cellData
				mousePosition.value = {x, y}
				break
		}
	}

	/**
	 * Setup canvas and event listeners
	 */
	const setupCanvas = () => {
		if (!canvasRef?.value) return

		initCanvas()

		// Mouse event listeners
		canvasRef.value.addEventListener('click', (e) => handleMouseEvent(e, 'click'))
		canvasRef.value.addEventListener('dblclick', (e) => handleMouseEvent(e, 'dblclick'))
		canvasRef.value.addEventListener('mousemove', (e) => handleMouseEvent(e, 'mousemove'))

		// Resize observer
		const resizeObserver = new ResizeObserver(() => {
			initCanvas()
			render()
		})
		resizeObserver.observe(canvasRef.value)

		// Initial render
		nextTick(() => render())
	}

	/**
	 * Draw selection overlay
	 */
	const drawSelection = (ctx, selection) => {
		if (!selection) return

		const {startRow, startCol, endRow, endCol} = selection
		let selectionX = 0
		let selectionY = 0
		let selectionWidth = 0
		let selectionHeight = 0

		// Calculate selection bounds
		const {startRow: visibleStartRow, startCol: visibleStartCol} = visibleRangeRef.value.visible

		// Calculate Y position and height
		for (let row = visibleStartRow; row <= Math.max(startRow, endRow); row++) {
			const rowHeight = sheet.hooks.resizeHook.getRowHeight(row)
			if (row < startRow) {
				selectionY += rowHeight
			} else if (row <= endRow) {
				selectionHeight += rowHeight
			}
		}

		// Calculate X position and width
		for (let col = visibleStartCol; col <= Math.max(startCol, endCol); col++) {
			const colWidth = sheet.hooks.resizeHook.getColWidth(col)
			if (col < startCol) {
				selectionX += colWidth
			} else if (col <= endCol) {
				selectionWidth += colWidth
			}
		}

		// Draw selection background
		ctx.fillStyle = 'rgba(0, 123, 255, 0.1)'
		ctx.fillRect(selectionX, selectionY, selectionWidth, selectionHeight)

		// Draw selection border
		ctx.strokeStyle = '#007bff'
		ctx.lineWidth = 2
		ctx.strokeRect(selectionX, selectionY, selectionWidth, selectionHeight)
	}

	/**
	 * Draw merged cell
	 */
	const drawMergedCell = (ctx, cell, x, y, mergedInfo) => {
		const {rowspan, colspan} = mergedInfo
		let totalWidth = 0
		let totalHeight = 0

		// Calculate merged cell dimensions
		for (let i = 0; i < colspan; i++) {
			totalWidth += sheet.hooks.resizeHook.getColWidth(cell.colIndex + i)
		}

		for (let i = 0; i < rowspan; i++) {
			totalHeight += sheet.hooks.resizeHook.getRowHeight(cell.rowIndex + i)
		}

		const cellKey = `${cell.rowIndex}-${cell.colIndex}`
		const cellStyle = sheet.config.cellStyle[cellKey] || {}

		// Draw merged cell background and borders
		drawCellBackground(ctx, x, y, totalWidth, totalHeight, cellStyle)

		// Draw merged cell text
		const formattedValue = sheet.hooks.editHook.formattedValue(cell.value, cell)
		drawCellText(ctx, formattedValue, x, y, totalWidth, totalHeight, cellStyle)
	}

	/**
	 * Enhanced render function with selection and merged cells
	 */
	const renderEnhanced = (selection = null) => {
		if (!canvasContext.value || !visibleRangeRef.value?.visible || isRendering.value) {
			return
		}

		isRendering.value = true
		const ctx = canvasContext.value
		const {startRow, endRow, startCol, endCol} = visibleRangeRef.value.visible

		// Clear canvas
		ctx.clearRect(
			0,
			0,
			canvasRef.value.width / devicePixelRatio.value,
			canvasRef.value.height / devicePixelRatio.value
		)

		let currentY = 0
		const renderedMergedCells = new Set()

		// Render visible cells
		for (let row = startRow; row < Math.min(endRow, sheet.config.rowCount); row++) {
			const rowHeight = sheet.hooks.resizeHook.getRowHeight(row)
			let currentX = 0

			for (let col = startCol; col < Math.min(endCol, sheet.config.colCount); col++) {
				const colWidth = sheet.hooks.resizeHook.getColWidth(col)
				const cellKey = `${row}-${col}`

				// Skip if this cell is part of an already rendered merged cell
				if (renderedMergedCells.has(cellKey)) {
					currentX += colWidth
					continue
				}

				// Check for merged cells
				const mergedCell = sheet.hooks.mergeHook.findMergedCell(row, col)
				let value = ''

				if (mergedCell && mergedCell.row === row && mergedCell.col === col) {
					// This is the start of a merged cell
					value = sheet.celldata.get(row)?.[col] || ''
					const mergedInfo = sheet.config.mergedCells[cellKey]

					if (mergedInfo) {
						drawMergedCell(
							ctx,
							{rowIndex: row, colIndex: col, value},
							currentX,
							currentY,
							mergedInfo
						)

						// Mark all cells in this merged range as rendered
						for (let mr = 0; mr < mergedInfo.rowspan; mr++) {
							for (let mc = 0; mc < mergedInfo.colspan; mc++) {
								renderedMergedCells.add(`${row + mr}-${col + mc}`)
							}
						}
					}
				} else if (!mergedCell) {
					// Regular cell
					value = sheet.celldata.get(row)?.[col] || ''
					const cell = {
						rowIndex: row,
						colIndex: col,
						value,
						rowHeight,
						colWidth,
					}
					renderCell(ctx, cell, currentX, currentY)
				}

				currentX += colWidth
			}

			currentY += rowHeight
		}

		// Draw selection overlay
		if (selection) {
			drawSelection(ctx, selection)
		}

		isRendering.value = false
	}

	/**
	 * Update render method to use enhanced version
	 */
	const render = (selection = null) => {
		renderEnhanced(selection)
	}

	/**
	 * Handle row height changes
	 */
	const updateRowHeight = (rowIndex, newHeight) => {
		sheet.hooks.resizeHook.setRowHeight(rowIndex, newHeight)
		render()
	}

	/**
	 * Handle column width changes
	 */
	const updateColWidth = (colIndex, newWidth) => {
		sheet.hooks.resizeHook.setColWidth(colIndex, newWidth)
		render()
	}

	/**
	 * Public API
	 */
	return {
		canvasRef,
		render,
		setupCanvas,
		getCellFromCoordinates,
		hoveredCell,
		mousePosition,
		isRendering,
		updateRowHeight,
		updateColWidth,
		drawSelection,
		drawMergedCell,
	}
}
