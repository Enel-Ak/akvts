import Container from './components/Container.vue'
import Block from './components/Block.vue'
import Form from './components/Form.vue'
import FormItem from './components/FormItem.vue'

const components = {Container, Block, Form, FormItem}

export default {
	install(app) {
		Object.entries(components).forEach(([name, component]) => {
			app.component(name, component)
		})
	},
}
export {Container, Block, Form, FormItem}
