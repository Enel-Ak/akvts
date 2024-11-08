import {defineStore} from 'pinia'

export const useGlobal = defineStore('useGlobal', {
	state: () => {
		return {
			permissions: null,
			theme: localStorage.getItem('theme') ?? 'light',
			// 不需要缓存的页面末尾加入-exclude
			exclude: /^((?!detail|Detail).)*$/,
			token: localStorage.getItem('token') ?? '',
			abort: new AbortController(),
			isNoPage: false,
			enbaleLoader: true,
			loader: {
				req: 0,
				res: 0,
				err: 0,
			},
			frame: null,
		}
	},
	getters: {
		getAbort: (state) => state.abort,
		GetToken: (state) => state.token,
		getEnbaleLoader: (state) => state.enbaleLoader,
		getLoadingStatus: (state) => state.loader,
		getLoadEnd: (state) => {
			const isEnd = state.loader.res + state.loader.err === state.loader.req
			console.log('loader:', JSON.parse(JSON.stringify(state.loader)), isEnd)
			if (isEnd) {
				state.loader.req = 0
				state.loader.res = 0
				state.loader.err = 0
			}
			return isEnd
		},
		getIsNoPage: (state) => state.isNoPage,
		getTheme: (state) => state.theme,
		getPermissions: (state) => state.permissions,
		getContainerFrame: (state) => state.frame,
	},
	actions: {
		cancelAbort() {
			this.abort?.abort()
			this.abort = null
			this.abort = new AbortController()
		},
		setPermissions(permissions) {
			this.permissions = permissions
		},
		setTheme(theme) {
			this.theme = theme
			localStorage.setItem('theme', theme)
		},
		setToken(token) {
			this.token = token
			localStorage.setItem('token', token)
		},
		setEnbaleLoader(bool) {
			this.enbaleLoader = bool
		},
		setLoader(type) {
			this.loader[type]++
		},
		setIsNoPaage(bool) {
			this.isNoPage = bool
		},
		setTheme(theme) {
			this.theme = theme
			document.body.setAttribute('class', theme)
			localStorage.setItem('theme', theme)
		},
		setContainerFrame(frame) {
			this.frame = frame
		},
	},
})
