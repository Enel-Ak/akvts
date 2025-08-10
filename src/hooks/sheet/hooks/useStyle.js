export const useStyle = () => {
	let sheet = null
	let style = {}
	let line = `1pt solid #000`

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

	const getStyle = () => {
		return Object.entries(sheet.config.cellStyle || {}).forEach(([key, value]) => {
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
					const cs = sheet.config.cellStyle[`${cell.rowIndex}-${cell.colIndex}`]
					if (
						value !== '#ffffff' &&
						value !== '#181818' &&
						value !== '#000000' &&
						!(
							cs?.bb ||
							cs?.bl ||
							cs?.br ||
							cs?.bt ||
							cs?.btc ||
							cs?.bbc ||
							cs?.blc ||
							cs?.brc
						)
					) {
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
	}

	const init = (reactiveSheet) => {
		sheet = reactiveSheet
		setTimeout(() => console.log('installed useStyle'), 16)
		return {
			getStyle,
		}
	}

	return {
		init,
	}
}
