import Container from './components/Container.vue'
import Block from './components/Block.vue'
import Form from './components/Form.vue'
import FormItem from './components/FormItem.vue'
import TableV2 from './components/TableV2.vue'
import Cascade from './components/Cascade.vue'
import Dialog from './components/Dialog.vue'

const components = {Container, Block, Form, FormItem, TableV2, Cascade, Dialog}

export default {
	install(app) {
		Object.entries(components).forEach(([name, component]) => {
			app.component(name, component)
		})
	},
}
export {Container, Block, Form, FormItem, TableV2, Cascade, Dialog}
