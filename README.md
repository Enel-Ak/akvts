# Akvts UI

## 安装

`npm isntall akvts --save-dev`

## vite.config.js 配置

`import { defineConfig } from 'vite'
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
})`
