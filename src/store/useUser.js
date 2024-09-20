import {defineStore} from 'pinia'

export const useUser = defineStore('useUser', {
	state: () => {
		return {
			userInfo: null,
		}
	},
	getters: {
		getUserInfo: (state) => state.userInfo,
	},
	actions: {
		setUserInfo(userInfo) {
			this.userInfo = userInfo
		},
	},
})
