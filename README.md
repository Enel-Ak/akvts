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
  plugins: [
    vue(),
    // UnoCss 必要配置
    UnoCSS({
      presets: [
      presetIcons(),
      ],
      include: [
        // 默认扫描 src 目录
        /\.js$/, // 扫描 .js 文件
      ],
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
import App from './App.vue'
import router from './router'
import akvts from 'akvts' // 引入 akvts
import 'virtual:uno.css' // 引入 uno.css

const app = createApp(App)

async function initApp() {
	const [ElementPlus, zhCn, ElementPlusIconsVue, Directive] = await Promise.all([
		import('element-plus'),
		import('element-plus/dist/locale/zh-cn.mjs'),
		import('@element-plus/icons-vue'),
		import('akvts/src/directive'), // 引入框架指令, 框架组件内部使用了一些指令
		import('akvts/src/styles/main.scss'), // 引入框架全局样式
		import('akvts/dist/style.css'), // 引入组件样式
	])

	app.use(ElementPlus, {
		locale: zhCn.default,
	})

	for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
		app.component(key, component)
	}

	Directive.directives(app) // 使用框架指令
	app.use(router)
	app.use(akvts) // 使用框架
	app.mount('#app')

	document.title = import.meta.env.VITE_TITLE
}

initApp()
```
