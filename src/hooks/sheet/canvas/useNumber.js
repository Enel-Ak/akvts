const useNumber = (ctx, width, height, sheet, renderData) => {
	if (!renderData || !renderData.visibleRangeRef || !sheet) return

	const {visibleRangeRef, scrollTop, dpr} = renderData
	const {visible} = visibleRangeRef

	if (!visible) return

	const {startRow, endRow} = visible

	// 获取缩放比例
	const zoom = sheet.config.zoom || 1
	const numberWidth = 35 * zoom // 序号列宽度
	const letterHeight = 25 * zoom // 字母行高度 - 需要为字母行预留空间

	// 计算起始偏移量
	let offsetTop = 0
	for (let i = 0; i < startRow; i++) {
		offsetTop += sheet.hooks?.resizeHook?.getRowHeight(i) || sheet.config.rowHeight * zoom
	}

	// 调整偏移量以匹配滚动位置,并加上字母行高度
	const adjustedOffsetTop = offsetTop - scrollTop + letterHeight

	// 绘制序号背景 (从字母行下方开始)
	ctx.save()
	ctx.fillStyle = '#f5f5f5'
	ctx.fillRect(0, letterHeight * dpr, numberWidth * dpr, height)

	// 绘制序号文本
	ctx.font = `${22 * zoom}px Arial`
	ctx.fillStyle = '#666'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'

	let currentY = adjustedOffsetTop
	for (let row = startRow; row < endRow; row++) {
		const rowHeight =
			sheet.hooks?.resizeHook?.getRowHeight(row) || sheet.config.rowHeight * zoom

		// 绘制行号
		const rowNumber = row + 1
		const textX = (numberWidth / 2) * dpr
		const textY = (currentY + rowHeight / 2) * dpr

		ctx.fillText(String(rowNumber), textX, textY)

		// 绘制分隔线
		ctx.strokeStyle = '#e0e0e0'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo(0, (currentY + rowHeight) * dpr + 0.5)
		ctx.lineTo(numberWidth * dpr, (currentY + rowHeight) * dpr + 0.5)
		ctx.stroke()

		currentY += rowHeight
	}

	// 绘制右侧边框 (从字母行下方开始)
	ctx.strokeStyle = '#d0d0d0'
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(numberWidth * dpr + 0.5, letterHeight * dpr)
	ctx.lineTo(numberWidth * dpr + 0.5, height)
	ctx.stroke()

	ctx.restore()
}

export default useNumber
