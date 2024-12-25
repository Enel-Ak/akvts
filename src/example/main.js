import {createApp} from 'vue'
import {createPinia} from 'pinia'
import {router} from '@/router'
import {directives} from '@/directive/index'

import App from './App.vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import akvts from '../index.js'

import 'element-plus/dist/index.css'
import '@/styles/element/index.scss'
import '@/styles/main.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(akvts)
app.use(router)
app.use(pinia)

directives(app)

app.use(ElementPlus, {
	locale: zhCn.default,
})

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component)
}

async function initApp() {
	app.mount('#app')
	document.title = import.meta.env.VITE_TITLE
}

initApp()
