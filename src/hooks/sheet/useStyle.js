export const useStyle = (cellStyle) => {
	let style = {}
	if (!cellStyle) return style

	// 对齐
	const alignItems = (align) => {
		const map = {
			left: 'flex-start',
			center: 'center',
			right: 'flex-end',
		}
		return map[align]
	}

	// 边框
	const border = (position) => {
		const map = {
			all: 'border',
			top: 'border-top',
			left: 'border-left',
			right: 'border-right',
			bottom: 'border-bottom',
		}
		return map[position]
	}

	Object.entries(cellStyle).forEach(([key, value]) => {
		switch (key) {
			case 'a':
				style['align-items'] = alignItems(value)
				style['text-align'] = value
				break
			case 'b':
				if (value === 'cross') {
					style[border('all')] = '2px solid #000'
				}

				if (value === 'top') {
					style[border('top')] = '2px solid #000'
					style[border('bottom')] = '2px solid #000'
					style[border('right')] = '2px solid #000'
				}

				if (value === 'left') {
					style[border('left')] = '2px solid #000'
					style[border('right')] = '2px solid #000'
					style[border('bottom')] = '2px solid #000'
				}

				if (value === 'all') {
					style[border('right')] = '2px solid #000'
					style[border('bottom')] = '2px solid #000'
				}

				break
			default:
				style[key] = value
				break
		}
	})

	return style
}
