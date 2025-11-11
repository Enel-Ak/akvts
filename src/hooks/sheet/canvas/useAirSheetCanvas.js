import {useAirSheetStore} from '../store/useAirSheet'
import useNumber from './useNumber'
import useLetter from './useLetter'
import useCells, {clearMergeIndexCache} from './useCells'
import {useCanvasResize} from './useCanvasResize'

export const useAirSheetCanvas = () => {
	const sheetStore = useAirSheetStore()
	let sheet = null
	let canvas = null
	let ctx = null
	let renderData = null // 存储最新的渲染数据
	let canvasResize = null // Canvas resize 功能

	// 动态渲染方法 - 基于可见范围渲染单元格
	const render = (visibleRangeRef, scrollTop, scrollLeft, selectedCell = null) => {
		if (!canvas || !ctx || !sheet || !visibleRangeRef) return

		requestAnimationFrame(() => {
			const dpr = window.devicePixelRatio || 1

			// 清空画布
			ctx.clearRect(0, 0, canvas.width, canvas.height)

			// 绘制白色背景
			ctx.fillStyle = '#fff'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// 保存渲染数据供其他方法使用
			renderData = {
				visibleRangeRef,
				scrollTop,
				scrollLeft,
				dpr,
				selectedCell, // 添加选中单元格信息
			}

			// 调用各个渲染方法
			useCells(ctx, canvas.width, canvas.height, sheet, renderData)
			useNumber(ctx, canvas.width, canvas.height, sheet, renderData)
			useLetter(ctx, canvas.width, canvas.height, sheet, renderData)

			// 绘制左上角交叉区域 (序号列和字母行的交叉部分)
			const zoom = sheet.config.zoom || 1
			const numberWidth = 35 * zoom
			const letterHeight = 25 * zoom
			ctx.fillStyle = '#f5f5f5'
			ctx.fillRect(0, 0, numberWidth * dpr, letterHeight * dpr)

			// 绘制交叉区域的边框
			ctx.strokeStyle = '#d0d0d0'
			ctx.lineWidth = 1
			ctx.beginPath()
			// 右边框
			ctx.moveTo(numberWidth * dpr + 0.5, 0)
			ctx.lineTo(numberWidth * dpr + 0.5, letterHeight * dpr)
			// 底边框
			ctx.moveTo(0, letterHeight * dpr + 0.5)
			ctx.lineTo(numberWidth * dpr, letterHeight * dpr + 0.5)
			ctx.stroke()
		})
	}

	const resize = () => {
		if (!canvas) return
		requestAnimationFrame(() => {
			const dpr = window.devicePixelRatio || 1
			const parentNode = canvas.parentNode
			const width = parentNode.offsetWidth - 10
			const height = parentNode.offsetHeight - 10

			canvas.width = width * dpr
			canvas.height = height * dpr
			canvas.style.width = `${width}px`
			canvas.style.height = `${height}px`

			ctx.fillStyle = '#fff'
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			// 如果有渲染数据,重新渲染
			if (renderData) {
				useCells(ctx, canvas.width, canvas.height, sheet, renderData)
				useNumber(ctx, canvas.width, canvas.height, sheet, renderData)
				useLetter(ctx, canvas.width, canvas.height, sheet, renderData)

				// 绘制左上角交叉区域
				const zoom = sheet.config.zoom || 1
				const numberWidth = 35 * zoom
				const letterHeight = 25 * zoom
				ctx.fillStyle = '#f5f5f5'
				ctx.fillRect(0, 0, numberWidth * dpr, letterHeight * dpr)

				// 绘制交叉区域的边框
				ctx.strokeStyle = '#d0d0d0'
				ctx.lineWidth = 1
				ctx.beginPath()
				// 右边框
				ctx.moveTo(numberWidth * dpr + 0.5, 0)
				ctx.lineTo(numberWidth * dpr + 0.5, letterHeight * dpr)
				// 底边框
				ctx.moveTo(0, letterHeight * dpr + 0.5)
				ctx.lineTo(numberWidth * dpr, letterHeight * dpr + 0.5)
				ctx.stroke()
			}
		})
	}

	const clear = () => {
		if (!canvas) return
		ctx.clearRect(0, 0, canvas.width, canvas.height)
	}

	// 获取当前的 visibleRange（供 canvasResize 使用）
	const getVisibleRange = () => {
		return renderData?.visibleRangeRef
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
		// 清空合并单元格索引缓存，因为切换到了新的 sheet
		clearMergeIndexCache()
	}

	const init = (canvasId, sheetId) => {
		canvas = document.querySelector(`#${canvasId}`)
		ctx = canvas?.getContext('2d')

		if (!canvas) {
			console.error('Canvas not found')
			return
		}

		sheet = sheetStore.getSheet(sheetId)
		clear()
		resize()

		// 初始化 Canvas resize 功能
		canvasResize = useCanvasResize()
		canvasResize.init(canvas, sheet)
	}

	const destroy = () => {
		if (canvasResize) {
			canvasResize.destroy()
			canvasResize = null
		}
		// 清空合并单元格索引缓存
		clearMergeIndexCache()
	}

	return {init, resize, render, clear, getVisibleRange, destroy, refreshSheet}
}

export default useAirSheetCanvas
