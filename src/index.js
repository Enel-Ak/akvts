import Akvts from './components/Akvts.vue'
import Container from './components/Container.vue'
import Block from './components/Block.vue'
import Form from './components/Form.vue'
import FormItem from './components/FormItem.vue'
import TableV2 from './components/TableV2.vue'
import AirSheet from './components/AirSheet.vue'
import AirSheetPro from './components/AirSheetPro.vue'
import Cascade from './components/Cascade.vue'
import Dialog from './components/Dialog.vue'
import Attachment from './components/Attachment.vue'
import Charts from './components/Charts.vue'
import Collapse from './components/Collapse.vue'
import CustomEdge from './components/CustomEdge.vue'
import Drawer from './components/Drawer.vue'
import Flow from './components/Flow.vue'
import Import from './components/Import.vue'
import Labels from './components/Labels.vue'
import Loader from './components/Loader.vue'
import Pagination from './components/Pagination.vue'
import Record from './components/Record.vue'
import SelectTree from './components/SelectTree.vue'
import Toolbar from './components/Toolbar.vue'
import Transfer from './components/Transfer.vue'
import ViewImage from './components/ViewImage.vue'
import TreeV2 from './components/TreeV2.vue'
import Watermark from './components/Watermark.vue'
import Icons from './components/Icons.vue'
import LoadingTransition from './components/LoadingTransition.vue'
import Navigation from './components/Navigation.vue'
import GridLayout from './components/GridLayout.vue'
import FilePreview from './components/FilePreview.vue'

const components = {
	Akvts,
	Container,
	Block,
	Form,
	FormItem,
	TableV2,
	AirSheet,
	AirSheetPro,
	Cascade,
	Dialog,
	Attachment,
	Charts,
	Collapse,
	CustomEdge,
	Drawer,
	Flow,
	Import,
	Labels,
	Loader,
	Pagination,
	Record,
	SelectTree,
	Toolbar,
	Transfer,
	ViewImage,
	TreeV2,
	Watermark,
	Icons,
	LoadingTransition,
	Navigation,
	GridLayout,
	FilePreview,
}

export default {
	install(app) {
		Object.entries(components).forEach(([name, component]) => {
			app.component(name, component)
		})
	},
}
export {
	Akvts,
	Container,
	Block,
	Form,
	FormItem,
	TableV2,
	AirSheet,
	AirSheetPro,
	Cascade,
	Dialog,
	Attachment,
	Charts,
	Collapse,
	CustomEdge,
	Drawer,
	Flow,
	Import,
	Labels,
	Loader,
	Pagination,
	Record,
	SelectTree,
	Toolbar,
	Transfer,
	ViewImage,
	TreeV2,
	Watermark,
	Icons,
	LoadingTransition,
	Navigation,
	GridLayout,
	FilePreview,
}
