# Akvts UI

## 安装

`npm isntall akvts --save-dev`

## vite.config.js 配置

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import pages from 'vite-plugin-pages'
import path from 'path'
import UnoCSS from 'unocss/vite' // 必要配置
import presetIcons from '@unocss/preset-icons' // 必要配置
import ElementPlus from 'unplugin-element-plus/vite'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(\_\_dirname, './src'),
    },
  },
	css: {
		preprocessorOptions: {
			scss: {
				// 必要配置
				additionalData: `
					@use 'akvts/src/styles/lib/_mixin.scss' as *;
				`,
			},
		},
	},
  plugins: [
    vue(),
    // UnoCss 必要配置
    UnoCSS({
      presets: [
      presetIcons(),
      ],
      content: {
				pipeline: {
					include: [
						// 默认扫描 src 目录
						/\.js$/, // 扫描 .js 文件, 必要配置
						/\.vue$/, // 扫描 .vue 文件
					],
				},
				},
    }),
    ElementPlus({
      useSource: true,
    }),
    pages({
      dirs: 'src/views',
      exclude: ['**/components/*.vue'],
    }),
  ],
})
```

## main.js 配置

```javascript
import {createApp} from 'vue'
import {createPinia} from 'pinia' // 引入Pinia
import './api/axios' // 引入全局axios配置
import App from './App.vue'
import router from './router'

import akvts from 'akvts' // 引入 akvts
import 'akvts/src/styles/main.scss'
import 'akvts/dist/style.css'
import 'akvts/src/styles/element/index.scss'

import 'virtual:uno.css' // 引入 uno.css

const app = createApp(App)
const pinia = createPinia()

async function initApp() {
	const [ElementPlus, zhCn, ElementPlusIconsVue, Directive] = await Promise.all([
		import('element-plus'),
		import('element-plus/dist/locale/zh-cn.mjs'),
		import('@element-plus/icons-vue'),
		import('akvts/src/directive'), // 引入框架指令, 框架组件内部使用了一些指令
	])

	app.use(ElementPlus, {
		locale: zhCn.default,
	})

	for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
		app.component(key, component)
	}

	Directive.directives(app) // 使用框架指令
	app.use(pinia)
	app.use(router)
	app.use(akvts) // 使用框架
	app.mount('#app')

	document.title = import.meta.env.VITE_TITLE
}

initApp()
```

## axios.js 配置

```javascript
import axios from 'axios'

// 通过 .env配置全局接口, 也可以自行配置公共接口文件, 但要保证baseURL的配置, 因为组件内部会使用 axios
axios.defaults.baseURL = import.meta.env.VITE_GLOBAL_API_URL
axios.defaults.headers['Content-Type'] = 'application/json'
axios.defaults.timeout = Number(import.meta.env.VITE_PORT) * 1000 // 通过 .env 超时

axios.interceptors.request.use((config) => {
	return config
})

axios.interceptors.response.use(
	(response) => {
		return response
	},
	(error) => {
		return Promise.reject(error)
	}
)

export default axios
```
