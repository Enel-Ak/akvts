const useGird = (ctx, width, height, sheet, renderData) => {
	if (!renderData || !renderData.visibleRangeRef) {
		// 如果没有渲染数据,绘制默认网格
		const defaltColWidth = 200
		const defaltRowHeight = 45

		ctx.strokeStyle = '#eee'
		ctx.lineWidth = 1
		ctx.beginPath()

		for (let x = 0; x <= width; x += defaltColWidth) {
			ctx.moveTo(x + 0.5, 0)
			ctx.lineTo(x + 0.5, height)
		}

		for (let y = 0; y <= height; y += defaltRowHeight) {
			ctx.moveTo(0, y + 0.5)
			ctx.lineTo(width, y + 0.5)
		}

		ctx.stroke()
		return
	}

	const {visibleRangeRef, scrollTop, scrollLeft, dpr} = renderData
	const {visible} = visibleRangeRef

	if (!visible) return

	const {startRow, endRow, startCol, endCol} = visible

	// 获取缩放比例
	const zoom = sheet.config.zoom || 1
	const numberWidth = 35 * zoom // 序号列宽度
	const letterHeight = 25 * zoom // 字母行高度

	// 计算起始偏移量
	let offsetTop = 0
	for (let i = 0; i < startRow; i++) {
		offsetTop += sheet.hooks?.resizeHook?.getRowHeight(i) || sheet.config.rowHeight * zoom
	}

	let offsetLeft = 0
	for (let i = 0; i < startCol; i++) {
		offsetLeft += sheet.hooks?.resizeHook?.getColWidth(i) || sheet.config.colWidth * zoom
	}

	// 调整偏移量以匹配滚动位置,并加上序号列和字母行的偏移
	const adjustedOffsetTop = offsetTop - scrollTop + letterHeight
	const adjustedOffsetLeft = offsetLeft - scrollLeft + numberWidth

	// 获取合并单元格配置（优先使用 merged）
	const mergeConfig = sheet.config.merged || {}

	// 辅助函数：检查某个位置是否在合并单元格内部（不包括边界）
	const isInsideMergedCell = (row, col, checkType) => {
		for (const [key, merge] of Object.entries(mergeConfig)) {
			const [mergeRow, mergeCol] = key.split('-').map(Number)
			// rs 和 cs 从 1 开始，表示占据的单元格数量
			// 例如 rs=2 表示占据 2 个单元格（起始行 + 1 行）
			const rowSpan = merge.rs || 1
			const colSpan = merge.cs || 1

			if (checkType === 'horizontal') {
				// 检查水平线：如果这条线在合并单元格内部（不是底边），则跳过
				// row 是线的位置（在 row 和 row-1 之间的底边）
				if (
					row > mergeRow &&
					row < mergeRow + rowSpan &&
					col >= mergeCol &&
					col < mergeCol + colSpan
				) {
					return true
				}
			} else if (checkType === 'vertical') {
				// 检查垂直线：如果这条线在合并单元格内部（不是右边），则跳过
				// col 是线的位置（在 col 和 col-1 之间的右边）
				if (
					col > mergeCol &&
					col < mergeCol + colSpan &&
					row >= mergeRow &&
					row < mergeRow + rowSpan
				) {
					return true
				}
			}
		}
		return false
	}

	// 绘制网格线
	ctx.save()
	ctx.strokeStyle = '#e0e0e0'
	ctx.lineWidth = 1
	ctx.beginPath()

	// 绘制垂直线(列)
	let currentX = adjustedOffsetLeft
	for (let col = startCol; col < endCol; col++) {
		const colWidth = sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom
		const x = currentX + colWidth

		// 检查这条垂直线是否需要分段绘制（跳过合并单元格内部）
		let segmentStartY = 0
		let currentRowY = adjustedOffsetTop

		for (let row = startRow; row < endRow; row++) {
			const rowHeight =
				sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom

			// 检查当前单元格的右边界是否在合并单元格内部
			if (isInsideMergedCell(row, col, 'vertical')) {
				// 如果之前有累积的线段，先绘制
				if (segmentStartY < currentRowY * dpr) {
					ctx.moveTo(x * dpr + 0.5, segmentStartY)
					ctx.lineTo(x * dpr + 0.5, currentRowY * dpr + 0.5)
				}
				// 跳过这个单元格，更新起始点
				segmentStartY = (currentRowY + rowHeight) * dpr + 0.5
			}

			currentRowY += rowHeight
		}

		// 绘制最后一段
		if (segmentStartY < height) {
			ctx.moveTo(x * dpr + 0.5, segmentStartY)
			ctx.lineTo(x * dpr + 0.5, height)
		}

		currentX += colWidth
	}

	// 绘制水平线(行)
	let currentY = adjustedOffsetTop
	for (let row = startRow; row < endRow; row++) {
		const rowHeight =
			sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom
		const y = currentY + rowHeight

		// 检查这条水平线是否需要分段绘制（跳过合并单元格内部）
		let segmentStartX = 0
		let currentColX = adjustedOffsetLeft

		for (let col = startCol; col < endCol; col++) {
			const colWidth =
				sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom

			// 检查当前单元格的底边界是否在合并单元格内部
			if (isInsideMergedCell(row, col, 'horizontal')) {
				// 如果之前有累积的线段，先绘制
				if (segmentStartX < currentColX * dpr) {
					ctx.moveTo(segmentStartX, y * dpr + 0.5)
					ctx.lineTo(currentColX * dpr + 0.5, y * dpr + 0.5)
				}
				// 跳过这个单元格，更新起始点
				segmentStartX = (currentColX + colWidth) * dpr + 0.5
			}

			currentColX += colWidth
		}

		// 绘制最后一段
		if (segmentStartX < width) {
			ctx.moveTo(segmentStartX, y * dpr + 0.5)
			ctx.lineTo(width, y * dpr + 0.5)
		}

		currentY += rowHeight
	}

	ctx.stroke()
	ctx.restore()

	// 绘制单元格内容
	ctx.save()
	ctx.textAlign = 'left'
	ctx.textBaseline = 'middle'

	// 用于跟踪已绘制的合并单元格
	const drawnMergedCells = new Set()

	currentY = adjustedOffsetTop
	for (let row = startRow; row < endRow; row++) {
		const rowHeight =
			sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom
		currentX = adjustedOffsetLeft

		for (let col = startCol; col < endCol; col++) {
			const colWidth =
				sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom
			const cellKey = `${row}-${col}`

			// 检查是否在合并单元格内（但不是起始单元格）
			let isInMergedCell = false

			for (const [key, merge] of Object.entries(mergeConfig)) {
				const [mergeRow, mergeCol] = key.split('-').map(Number)
				// rs 和 cs 从 1 开始，表示占据的单元格数量
				const rowSpan = merge.rs || 1
				const colSpan = merge.cs || 1

				// 检查当前单元格是否在合并区域内
				if (
					row >= mergeRow &&
					row < mergeRow + rowSpan &&
					col >= mergeCol &&
					col < mergeCol + colSpan &&
					!(row === mergeRow && col === mergeCol) // 不是起始单元格
				) {
					isInMergedCell = true
					break
				}
			}

			// 如果在合并单元格内（非起始单元格），跳过绘制
			if (isInMergedCell) {
				currentX += colWidth
				continue
			}

			// 检查是否是合并单元格的起始单元格
			const mergeInfo = mergeConfig[cellKey]
			let cellWidth = colWidth
			let cellHeight = rowHeight

			if (mergeInfo && !drawnMergedCells.has(cellKey)) {
				// 计算合并单元格的总宽度和高度
				// rs 和 cs 从 1 开始，表示占据的单元格数量
				const rowSpan = mergeInfo.rs || 1
				const colSpan = mergeInfo.cs || 1

				cellWidth = 0
				for (let c = col; c < col + colSpan; c++) {
					cellWidth +=
						sheet.hooks?.resizeHook?.getColWidth(c) || sheet.config.colWidth * zoom
				}

				cellHeight = 0
				for (let r = row; r < row + rowSpan; r++) {
					cellHeight +=
						sheet.hooks?.resizeHook?.getRowHeight(r) || sheet.config.rowHeight * zoom
				}

				drawnMergedCells.add(cellKey)
			}

			// 获取单元格样式
			const cellStyle = sheet.config.styled?.[cellKey]

			// 绘制单元格背景
			if (cellStyle?.bg) {
				ctx.fillStyle = cellStyle.bg
				ctx.fillRect(currentX * dpr, currentY * dpr, cellWidth * dpr, cellHeight * dpr)
			}

			// 绘制锁定单元格的背景色
			if (sheet.config.locked?.[cellKey]) {
				ctx.fillStyle = 'rgba(255, 0, 0, 0.05)' // 淡红色背景
				ctx.fillRect(currentX * dpr, currentY * dpr, cellWidth * dpr, cellHeight * dpr)
			}

			// 绘制深度权限锁定的背景色
			const hasDeepPermission = Object.values(sheet.config.deepPermissions || {}).some(
				(perm) => {
					if (perm.type === 'row') {
						return perm.targets.includes(row)
					} else if (perm.type === 'column') {
						return perm.targets.includes(col)
					} else if (perm.type === 'cell') {
						return perm.targets.some((t) => t.r === row && t.c === col)
					}
					return false
				}
			)

			if (hasDeepPermission) {
				ctx.fillStyle = 'rgba(255, 165, 0, 0.1)' // 淡橙色背景
				ctx.fillRect(currentX * dpr, currentY * dpr, cellWidth * dpr, cellHeight * dpr)
			}

			// 获取单元格数据
			let cellValue = sheet.celldata?.get(row)?.[col]

			// 检查是否有公式
			const formulaInfo = sheet.config.formulaed?.[cellKey]
			if (formulaInfo) {
				// 如果有公式，显示公式结果（如果有）或公式本身
				cellValue =
					formulaInfo.result !== undefined ? formulaInfo.result : formulaInfo.formula
			}

			// 绘制单元格内容
			if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
				// 设置字体样式
				const fontSize = (cellStyle?.fs || 22) * zoom
				const fontFamily = cellStyle?.ff || 'Arial'
				const fontWeight = cellStyle?.bl ? 'bold' : 'normal'
				const fontStyle = cellStyle?.it ? 'italic' : 'normal'
				ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

				// 设置文本颜色
				ctx.fillStyle = cellStyle?.fc || '#333'

				// 设置文本对齐
				const align = cellStyle?.align || 'left'
				ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'

				const text = String(cellValue)
				const padding = 5 * zoom

				// 计算文本位置
				let textX
				if (align === 'center') {
					textX = (currentX + cellWidth / 2) * dpr
				} else if (align === 'right') {
					textX = (currentX + cellWidth - padding) * dpr
				} else {
					textX = (currentX + padding) * dpr
				}

				const textY = (currentY + cellHeight / 2) * dpr

				// 文本裁剪
				ctx.save()
				ctx.rect(currentX * dpr, currentY * dpr, cellWidth * dpr, cellHeight * dpr)
				ctx.clip()
				ctx.fillText(text, textX, textY)

				// 绘制删除线
				if (cellStyle?.st) {
					const textWidth = ctx.measureText(text).width
					const lineY = textY
					ctx.strokeStyle = cellStyle?.fc || '#333'
					ctx.lineWidth = 1
					ctx.beginPath()
					ctx.moveTo(textX - textWidth / 2, lineY)
					ctx.lineTo(textX + textWidth / 2, lineY)
					ctx.stroke()
				}

				// 绘制下划线
				if (cellStyle?.un) {
					const textWidth = ctx.measureText(text).width
					const lineY = textY + fontSize / 2
					ctx.strokeStyle = cellStyle?.fc || '#333'
					ctx.lineWidth = 1
					ctx.beginPath()
					ctx.moveTo(textX - textWidth / 2, lineY)
					ctx.lineTo(textX + textWidth / 2, lineY)
					ctx.stroke()
				}

				ctx.restore()
			}

			// 绘制公式引用标记（如果被其他单元格引用）
			if (sheet.config.formulaMap?.[cellKey]) {
				ctx.save()
				ctx.fillStyle = 'rgba(0, 128, 0, 0.2)' // 淡绿色角标
				ctx.beginPath()
				ctx.moveTo((currentX + cellWidth - 10 * zoom) * dpr, currentY * dpr)
				ctx.lineTo((currentX + cellWidth) * dpr, currentY * dpr)
				ctx.lineTo((currentX + cellWidth) * dpr, (currentY + 10 * zoom) * dpr)
				ctx.closePath()
				ctx.fill()
				ctx.restore()
			}

			currentX += colWidth
		}

		currentY += rowHeight
	}

	ctx.restore()

	// 绘制选中框
	if (renderData.selectedCell) {
		const {r, c, rr, cc} = renderData.selectedCell

		console.log('[选中框] 选中范围:', {r, c, rr, cc})

		// 检查选中区域是否与可见范围有交集
		const hasIntersection = r < endRow && rr >= startRow && c < endCol && cc >= startCol

		if (hasIntersection) {
			// 计算选中框的绝对位置（从第 0 行/列开始）
			let absoluteTop = 0
			for (let row = 0; row < r; row++) {
				absoluteTop +=
					sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom
			}

			let absoluteLeft = 0
			for (let col = 0; col < c; col++) {
				absoluteLeft +=
					sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom
			}

			// 转换为 canvas 坐标（减去滚动偏移，加上序号列和字母行的偏移）
			const selectionTop = absoluteTop - scrollTop + letterHeight
			const selectionLeft = absoluteLeft - scrollLeft + numberWidth

			// 计算选中区域的宽度和高度（完整范围，不只是可见部分）
			let selectionWidth = 0
			for (let col = c; col <= cc; col++) {
				selectionWidth +=
					sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom
			}

			let selectionHeight = 0
			for (let row = r; row <= rr; row++) {
				selectionHeight +=
					sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom
			}

			console.log('[选中框] 计算结果:', {
				absoluteTop,
				selectionTop,
				selectionHeight,
				占据行: `${r} 到 ${rr}`,
				行数: rr - r + 1,
			})

			// 绘制选中框
			ctx.save()
			ctx.strokeStyle = '#4285f4' // Google 蓝色
			const borderWidth = 2 * dpr
			ctx.lineWidth = borderWidth

			// 计算边框的偏移量，确保边框完全在可见区域内
			// 边框会向内和向外各延伸 borderWidth/2，所以需要留出空间
			const halfBorder = borderWidth / 2
			const drawX = selectionLeft * dpr + halfBorder
			const drawY = selectionTop * dpr + halfBorder
			const drawWidth = selectionWidth * dpr - borderWidth
			const drawHeight = selectionHeight * dpr - borderWidth

			// 绘制半透明背景（填充整个选中区域）
			ctx.fillStyle = 'rgba(66, 133, 244, 0.1)' // 10% 透明度的蓝色
			ctx.fillRect(
				selectionLeft * dpr,
				selectionTop * dpr,
				selectionWidth * dpr,
				selectionHeight * dpr
			)

			// 绘制边框（边框中心线在选中区域边缘，向内外各延伸一半）
			ctx.strokeRect(drawX, drawY, drawWidth, drawHeight)

			ctx.restore()
		}
	}
}

export default useGird
