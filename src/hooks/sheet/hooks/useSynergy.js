import {useAirSheetStore} from '@/hooks/sheet/store/useAirSheet'
import {useSignalr, useSignalrStop} from '@/hooks/useSignalr'

export const useSynergy = () => {
	let sheetKey = null
	let sheet = null

	const connection = async ({key, path, token} = {}) => {
		if (!key || !path || !token) {
			console.error('链接失败')
			return
		}
		console.log(123)
		useSignalr(key, path, token)
	}

	const init = (key) => {
		sheetKey = key
		sheet = useAirSheetStore().getSheet(key)
		setTimeout(() => {
			console.log('installed useSynergy')
		}, 16)
		return {connection}
	}

	return {
		init,
	}
}
