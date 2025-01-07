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

const deleteLabel = (obj) => {
	if (!obj.path) {
		console.error('缺少必要参数, path')
		return
	}
	window.dispatchEvent(
		new CustomEvent('deleteLabel', {
			detail: obj,
		})
	)
}

export {updateLabelTitle, deleteLabel}
