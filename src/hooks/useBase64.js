import pako from 'pako'
const sendCompressed = (obj) => {
	const json = JSON.stringify(obj)
	const binary = pako.deflate(json)
	const base64 = btoa(String.fromCharCode(...binary))
	return base64
}

const decodeCompressed = (base64) => {
	const binary = atob(base64)
	const inflated = pako.inflate(binary, {to: 'string'})
	return JSON.parse(inflated)
}

export default {sendCompressed, decodeCompressed}
