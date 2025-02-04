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
		let line = '1px solid #000'
		switch (key) {
			case 'a':
				style['align-items'] = alignItems(value)
				style['text-align'] = value
				break
			case 'b': {
				if (value === 'cross') {
					style[border('all')] = line
				} else if (value === 'top') {
					style[border('top')] = line
					style[border('bottom')] = line
					style[border('right')] = line
				} else if (value === 'left') {
					style[border('left')] = line
					style[border('right')] = line
					style[border('bottom')] = line
				} else if (value === 'all') {
					style[border('right')] = line
					style[border('bottom')] = line
				}
				break
			}
			case 'bt':
				style[border('top')] = line
				break
			case 'bl':
				style[border('left')] = line
				break
			case 'br':
				style[border('right')] = line
				break
			case 'bb':
				style[border('bottom')] = line
				break
			default:
				style[key] = value
				break
		}
	})

	return style
}
