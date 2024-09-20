import {useGlobal} from '@/store/useGlobal.js'

export const usePermission = (str) => {
	const global = useGlobal()
	if (global) {
		const cams = global.getPermissions
		for (let i = 0; i < cams?.length; i++) {
			const [key, value] = cams[i]
			if (str === key) {
				return value
			}
		}
	}
	return false
}
