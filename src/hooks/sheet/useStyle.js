export const useStyle = (cellStyle, zoom) => {
	let style = {}
	let line = `1pt solid #000`

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

	// 加粗
	const bold = (value) => {
		return value === true || value === 1 ? 'bold' : 'normal'
	}

	// 下划线
	const underline = (value) => {
		return value === true || value === 1 ? 'underline' : 'normal'
	}

	// 斜体
	const italic = (value) => {
		return value === true || value === 1 ? 'italic' : 'normal'
	}

	// 删除线
	const strikethrough = (value) => {
		return value === true || value === 1 ? 'line-through' : 'normal'
	}

	Object.entries(cellStyle).forEach(([key, value]) => {
		switch (key) {
			case 'ff':
				style['font-family'] = value
				break
			case 'fs':
				style['font-size'] = value * zoom + 'px'
				break
			case 'fc':
				style['color'] = value
				break
			case 'bg':
				if (value !== '#ffffff' && value !== '#181818') {
					style['border-color'] = value
				}
				style['background-color'] = value
				break
			case 'align':
				style['align-items'] = alignItems(value)
				style['text-align'] = value
				break
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
			case 'btc':
				style['border-top-color'] = value + ' !important'
				break
			case 'brc':
				style['border-right-color'] = value + ' !important'
				break
			case 'blc':
				style['border-left-color'] = value + ' !important'
				break
			case 'bbc':
				style['border-bottom-color'] = value + ' !important'
				break
			case 'bold':
				style['font-weight'] = bold(value)
				break
			case 'un':
				style['text-decoration'] = underline(value)
				break
			case 'it':
				style['font-style'] = italic(value)
				break
			case 'st':
				style['text-decoration'] = strikethrough(value)
				break
			default:
				style[key] = value
				break
		}
	})

	return style
}
