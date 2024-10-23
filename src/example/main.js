import {createApp} from 'vue'
import {createPinia} from 'pinia'
import {router} from '@/router'
import {directives} from '@/directive/index'

import App from './App.vue'
import akvts from '../index.js'
import 'virtual:uno.css'

const app = createApp(App)
const pinia = createPinia()

app.use(akvts)
app.use(router)
app.use(pinia)

directives(app)

async function initApp() {
	const [ElementPlus, zhCn, ElementPlusIconsVue] = await Promise.all([
		import('element-plus'),
		import('element-plus/dist/locale/zh-cn.mjs'),
		import('@element-plus/icons-vue'),
	])
	// 默认主题
	await import('element-plus/dist/index.css')
	await import('@/styles/element/index.scss')
	app.use(ElementPlus, {
		locale: zhCn.default,
	})

	for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
		app.component(key, component)
	}

	await import('@/styles/main.scss')
	// app.use(VueMarkdownEditor)
	app.mount('#app')

	document.title = import.meta.env.VITE_TITLE
}

initApp()
