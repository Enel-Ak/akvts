import {createApp} from 'vue'
import {createPinia} from 'pinia'
import {router} from '@/router'
import {directives} from '@/directive/index'

import App from './App.vue'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import akvts from '../index.js'
import '@/styles/main.scss'

import {useSystemTheme} from '@/hooks/useSystemTheme'

const app = createApp(App)
const pinia = createPinia()

app.use(akvts)
app.use(router)
app.use(pinia)

directives(app)

app.use(ElementPlus, {
	locale: zhCn,
})

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
	app.component(key, component)
}

async function initApp() {
	app.mount('#app')
	useSystemTheme(false)
	document.title = import.meta.env.VITE_TITLE
}

initApp()
