import Container from './components/Container.vue'
import Block from './components/Block.vue'

const components = {Container, Block}

export default {
	install(app) {
		Object.entries(components).forEach(([name, component]) => {
			app.component(name, component)
		})
	},
}
export {Container, Block}
