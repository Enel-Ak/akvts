const updateLabelTitle = (obj) => {
	if (!obj.path || !obj.title) {
		console.error('缺少必要参数, path 或 title')
		return
	}
	window.dispatchEvent(
		new CustomEvent('updateLabelTitle', {
			detail: obj,
		})
	)
}

export {updateLabelTitle}
