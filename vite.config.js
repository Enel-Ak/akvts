import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.js'), // 组件入口
      name: 'AkvtsUi',                     // 库名称
      fileName: (format) => `akvtsui.${format}.js`, // 打包后的文件名
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        }
      }
    }
  }
})
