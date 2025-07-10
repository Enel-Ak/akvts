import {defineStore} from 'pinia'

export const useKeepAlive = defineStore('useKeepAlive', {
	state: () => {
		return {
			include: [],
		}
	},
	getters: {
		getInclude: (state) => state.include,
	},
	actions: {
		addInclude(name) {
			if (!name) return
			const componentName = name.toLowerCase()
			if (!this.include.includes(componentName)) {
				this.include.push(componentName)
			}
		},
		removeInclude(name) {
			if (!name) return
			const componentName = name.toLowerCase()
			const index = this.include.indexOf(componentName)
			if (index > -1) {
				this.include.splice(index, 1)
			}
		},
		clearIncludes() {
			this.include = []
		},
	},
})
