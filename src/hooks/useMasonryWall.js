import {onMounted, onBeforeUnmount, watchEffect, unref} from 'vue'

// A simple masonry (waterfall) layout hook.
// containerArg can be a raw DOM element or a ref pointing to one.
// options: { columns?(number), minColWidth?(number), gap?(number) }
// Usage example:
// const containerRef = ref(null)
// useMasonryWall(containerRef, { minColWidth: 250, gap: 12 })

export default function useMasonryWall(containerArg, options = {}) {
	// helper to read reactive options, with defaults
	const getOpts = () => {
		const o = unref(options) || {}
		return {
			columns: o.columns || 0,
			minColWidth: o.minColWidth || 200,
			gap: o.gap || 10,
		}
	}

	let ro
	let mo
	let childRO // ResizeObserver for tracking child height changes

	// calculate and assign absolute positions to children
	const layoutMasonry = (el, {columns, minColWidth, gap}) => {
		if (!el) return
		const w = el.clientWidth
		let colCount = columns > 0 ? columns : Math.floor(w / minColWidth)
		if (colCount < 1) colCount = 1
		const colWidth = (w - gap * (colCount - 1)) / colCount

		// prepare container
		el.style.position = 'relative'
		// force reflow to ensure accurate offsetHeight measurements
		const reflow = el.offsetHeight // trigger reflow

		const heights = new Array(colCount).fill(0)

		Array.from(el.children).forEach((child) => {
			child.style.position = 'absolute'
			child.style.width = colWidth - 10 + 'px'
			// force reflow for this child
			const childReflow = child.offsetHeight
			// measure after width applied; use offsetHeight
			const minCol = heights.indexOf(Math.min(...heights))
			const top = heights[minCol]
			const left = (colWidth - 5 + gap) * minCol
			child.style.transform = `translate(${left}px,${top}px)`
			heights[minCol] += child.offsetHeight + gap
		})

		// adjust container height to contain all columns
		// const maxHeight = Math.max(...heights)
		// if (maxHeight > 0) {
		// 	el.style.height = maxHeight + 'px'
		// }
	}

	// alias for backward concept
	const applyToItems = layoutMasonry

	const init = (el, opts) => {
		if (!el) return
		layoutMasonry(el, opts)

		// clean up old ResizeObserver for children
		if (childRO) childRO.disconnect()

		// watch for container resize
		ro = new ResizeObserver(() => {
			setTimeout(() => layoutMasonry(el, opts), 50)
		})
		ro.observe(el)

		// watch for added/removed children
		mo = new MutationObserver(() => layoutMasonry(el, opts))
		mo.observe(el, {childList: true})

		// watch for child height changes
		childRO = new ResizeObserver(() => {
			// debounce to avoid excessive recalculations
			setTimeout(() => layoutMasonry(el, opts), 50)
		})
		Array.from(el.children).forEach((child) => {
			childRO.observe(child)
		})
	}

	const destroy = () => {
		ro?.disconnect()
		mo?.disconnect()
		childRO?.disconnect()
	}

	// react to container and option changes
	watchEffect((onInvalidate) => {
		const el = unref(containerArg)
		if (el) {
			const opts = getOpts()
			init(el, opts)
		}
		onInvalidate(destroy)
	})

	onBeforeUnmount(() => {
		destroy()
	})
}
