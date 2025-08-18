import {useAirSheetStore} from '../store/useAirSheet'
export const useStyle = () => {
	const sheetStore = useAirSheetStore()
	let sheet = null

	const defaultLine = `1pt solid #000`

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

	const getStyle = (cellstyle) => {
		let style = {}
		Object.entries(cellstyle || {}).forEach(([key, value]) => {
			switch (key) {
				case 'ff':
					style['font-family'] = value
					break
				case 'fs':
					style['font-size'] = value * sheet.config.zoom + 'px'
					break
				case 'fc':
					style['color'] = value
					break
				case 'bg':
					if (
						value !== '#ffffff' &&
						value !== '#181818' &&
						value !== '#000000' &&
						!(
							style?.bb ||
							style?.bl ||
							style?.br ||
							style?.bt ||
							style?.btc ||
							style?.bbc ||
							style?.blc ||
							style?.brc
						)
					) {
						style['border-color'] = value
					}
					style['background-color'] = value
					break
				case 'align':
					const flexAlign =
						value === 'left' ? 'flex-start' : value === 'right' ? 'flex-end' : 'center'
					style['align-items'] = flexAlign
					style['text-align'] = value
					break
				case 'bt':
					style['border-top'] = defaultLine
					break
				case 'bl':
					style['border-left'] = defaultLine
					break
				case 'br':
					style['border-right'] = defaultLine
					break
				case 'bb':
					style['border-bottom'] = defaultLine
					break
				case 'btc':
					style['border-top-color'] = value //+ ' !important'
					break
				case 'brc':
					style['border-right-color'] = value // + ' !important'
					break
				case 'blc':
					style['border-left-color'] = value // + ' !important'
					break
				case 'bbc':
					style['border-bottom-color'] = value //+ ' !important'
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

	const init = (key) => {
		sheet = sheetStore.getSheet(key)
		setTimeout(() => console.log('installed useStyle'), 16)
		return {
			getStyle,
		}
	}

	return {
		init,
	}
}
