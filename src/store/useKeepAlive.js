import {defineStore} from 'pinia'

export const useKeepAlive = defineStore('useKeepAlive', {
	state: () => {
		return {
			include: [],
			exclude: [],
		}
	},
	getters: {
		getInclude: (state) => state.include,
		getExclude: (state) => state.exclude,
	},
	actions: {
		setInclude(name) {
			if (this.include.includes(name)) {
				return
			}
			this.exclude = this.exclude.filter((item) => item !== name)
			this.include.push(name)
		},
		setExclude(name) {
			this.include = this.include.filter((item) => item !== name)
			this.exclude.push(name)
		},
	},
})
