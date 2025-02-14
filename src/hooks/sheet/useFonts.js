class FontLoader {
	constructor() {
		this.loadedFonts = new Set()
	}

	async loadFont(fontFamily, fontUrl, options = {}) {
		if (this.loadedFonts.has(fontFamily)) {
			return Promise.resolve()
		}

		try {
			const font = new FontFace(fontFamily, `url(${fontUrl})`, options)
			const loadedFont = await font.load()
			document.fonts.add(loadedFont)
			this.loadedFonts.add(fontFamily)
			return loadedFont
		} catch (error) {
			console.error(`Failed to load font ${fontFamily}:`, error)
			throw error
		}
	}
}
