const useStringLength = (input) => {
	let totalLength = 0
	let str = input.replace(/\s/g, '')
	for (let i = 0; i < str.length; i++) {
		// 如果字符的 Unicode 编码大于等于 0x4E00 且小于等于 0x9FFF，表示是中文字符
		if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fff) {
			totalLength += 2
		} else {
			totalLength += 1
		}
	}

	return totalLength
}

const useSubstring = (input, length) => {
	let totalLength = 0
	let str = input.replace(/\s/g, '')
	let result = ''
	for (let i = 0; i < str.length; i++) {
		if (totalLength >= length) {
			break
		}
		if (str.charCodeAt(i) >= 0x4e00 && str.charCodeAt(i) <= 0x9fff) {
			totalLength += 2
		} else {
			totalLength += 1
		}
		result += str[i]
	}

	return result
}

export {useStringLength, useSubstring}
