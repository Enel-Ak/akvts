const totalHeight = (data) => {
	let h = 0
	for (let i = 0; i < data.rowCount; i++) {
		const rowHeight = data.rowHeights[i]
		h += rowHeight || data.rowHeight
	}
	return h
}

const totalWidth = (data) => {
	let w = 0
	for (let i = 0; i < data.colCount; i++) {
		const colWidth = data.colWidths[i]
		w += colWidth || data.colWidth
	}
	return w
}

self.onmessage = (event) => {
	try {
		const {type, data} = event.data

		const height = totalHeight(data)
		const width = totalWidth(data)

		self.postMessage({
			type,
			data: {
				totalHeight: height,
				totalWidth: width,
			},
		})
	} catch (error) {
		self.postMessage({})
	}
}
