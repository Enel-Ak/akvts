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
				console.log('Added to cache:', componentName, this.include)
			}
		},
		removeInclude(name) {
			if (!name) return
			const componentName = name.toLowerCase()
			const index = this.include.indexOf(componentName)
			if (index > -1) {
				this.include.splice(index, 1)
				console.log('Removed from cache:', componentName, this.include)
			}
		},
		clearIncludes() {
			this.include = []
			console.log('Cleared all cache')
		},
	},
})
