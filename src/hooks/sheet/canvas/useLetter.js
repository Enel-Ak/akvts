// 将列索引转换为字母 (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, ...)
const convertIndexToLetter = (index) => {
	if (index < 0) return ''

	let title = ''
	let n = index

	while (n >= 0) {
		title = String.fromCharCode(65 + (n % 26)) + title
		n = Math.floor(n / 26) - 1
	}

	return title
}

const useLetter = (ctx, width, height, sheet, renderData) => {
	if (!renderData || !renderData.visibleRangeRef || !sheet) return

	const {visibleRangeRef, scrollLeft, dpr} = renderData
	const {visible} = visibleRangeRef

	if (!visible) return

	const {startCol, endCol} = visible

	// 获取缩放比例
	const zoom = sheet.config.zoom || 1
	const letterHeight = 25 * zoom // 字母行高度
	const numberWidth = 35 * zoom // 序号列宽度 - 需要为序号列预留空间

	// 计算起始偏移量
	let offsetLeft = 0
	for (let i = 0; i < startCol; i++) {
		offsetLeft += sheet.hooks?.resizeHook?.getColWidth(i) || sheet.config.colWidth * zoom
	}

	// 调整偏移量以匹配滚动位置,并加上序号列宽度
	const adjustedOffsetLeft = offsetLeft - scrollLeft + numberWidth

	// 绘制字母背景 (从序号列右侧开始)
	ctx.save()
	ctx.fillStyle = '#f5f5f5'
	ctx.fillRect(numberWidth * dpr, 0, width, letterHeight * dpr)

	// 绘制字母文本
	ctx.font = `${22 * zoom}px Arial`
	ctx.fillStyle = '#666'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'

	let currentX = adjustedOffsetLeft
	for (let col = startCol; col < endCol; col++) {
		const colWidth = sheet.hooks?.resizeHook?.getColWidth(col) || sheet.config.colWidth * zoom

		// 绘制列字母
		const colLetter = convertIndexToLetter(col)
		const textX = (currentX + colWidth / 2) * dpr
		const textY = (letterHeight / 2) * dpr

		ctx.fillText(colLetter, textX, textY)

		// 绘制分隔线
		ctx.strokeStyle = '#e0e0e0'
		ctx.lineWidth = 1
		ctx.beginPath()
		ctx.moveTo((currentX + colWidth) * dpr + 0.5, 0)
		ctx.lineTo((currentX + colWidth) * dpr + 0.5, letterHeight * dpr)
		ctx.stroke()

		currentX += colWidth
	}

	// 绘制底部边框 (从序号列右侧开始)
	ctx.strokeStyle = '#d0d0d0'
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(numberWidth * dpr, letterHeight * dpr + 0.5)
	ctx.lineTo(width, letterHeight * dpr + 0.5)
	ctx.stroke()

	ctx.restore()
}

export default useLetter
