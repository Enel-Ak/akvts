export const useBufferToMap = (buffer, isArray = false) => {
	const decoder = new TextDecoder()
	const view = new DataView(buffer)
	let offset = 0

	const size = view.getUint32(offset)
	offset += 4

	const map = new Map()

	for (let i = 0; i < size; i++) {
		// 读 key
		const keyLen = view.getUint32(offset)
		offset += 4
		const keyBytes = new Uint8Array(buffer, offset, keyLen)
		offset += keyLen
		const key = decoder.decode(keyBytes)

		// 读 value
		const valueLen = view.getUint32(offset)
		offset += 4
		const valueBytes = new Uint8Array(buffer, offset, valueLen)
		offset += valueLen
		const value = decoder.decode(valueBytes)

		map.set(Number(key), isArray ? [value] : value)
	}

	return map
}

export const useMapToBuffer = (map) => {
	const encoder = new TextEncoder()

	// 先把每个 key/value 编码成 Uint8Array
	const entries = []
	let totalLength = 4 // 存储条目数用 4 字节
	for (const [k, v] of map) {
		const keyBytes = encoder.encode(k)
		const valueBytes = encoder.encode(v)
		entries.push({keyBytes, valueBytes})
		totalLength += 4 + keyBytes.length + 4 + valueBytes.length
	}

	// 分配 ArrayBuffer
	const buffer = new ArrayBuffer(totalLength)
	const view = new DataView(buffer)
	let offset = 0

	// 写入条目数
	view.setUint32(offset, map.size)
	offset += 4

	// 写入每个 key/value
	for (const {keyBytes, valueBytes} of entries) {
		view.setUint32(offset, keyBytes.length)
		offset += 4
		new Uint8Array(buffer, offset, keyBytes.length).set(keyBytes)
		offset += keyBytes.length

		view.setUint32(offset, valueBytes.length)
		offset += 4
		new Uint8Array(buffer, offset, valueBytes.length).set(valueBytes)
		offset += valueBytes.length
	}

	return buffer
}

export const useStringArrayToBuffer = (arr) => {
	const encoder = new TextEncoder()

	let totalLength = 4 // 先写条目数
	const encoded = arr.map((str) => {
		const bytes = encoder.encode(str)
		totalLength += 4 + bytes.length // 每个字符串存长度 + 数据
		return bytes
	})

	const buffer = new ArrayBuffer(totalLength)
	const view = new DataView(buffer)
	let offset = 0

	view.setUint32(offset, arr.length)
	offset += 4

	for (const bytes of encoded) {
		if (bytes) {
			view.setUint32(offset, bytes.length)
			offset += 4
			new Uint8Array(buffer, offset, bytes.length).set(bytes)
			offset += bytes.length
		}
	}

	return buffer
}

export const useBufferToStringArray = (buffer) => {
	const decoder = new TextDecoder()
	const view = new DataView(buffer)
	let offset = 0

	const size = view.getUint32(offset)
	offset += 4

	const arr = []
	for (let i = 0; i < size; i++) {
		const len = view.getUint32(offset)
		offset += 4
		const bytes = new Uint8Array(buffer, offset, len)
		offset += len
		arr.push(decoder.decode(bytes))
	}

	return arr
}
