import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import pages from 'vite-plugin-pages'
import path from 'path'
// import UnoCSS from 'unocss/vite'
// import presetIcons from '@unocss/preset-icons'
import ElementPlus from 'unplugin-element-plus/vite'
import viteCompression from 'vite-plugin-compression'

export default ({mode}) => {
	const env = loadEnv(mode, process.cwd())
	return defineConfig({
		base: env.VITE_PUBLIC_PATH,
		define: {
			'process.env': env,
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		css: {
			preprocessorOptions: {
				scss: {
					api: 'modern-compiler', // or 'modern'
					additionalData: `
						@use '@/styles/lib/_mixin.scss' as *;
					`,
				},
			},
		},
		server: {
			host: '0.0.0.0',
			port: Number(env.VITE_PORT),
		},
		plugins: [
			vue(),
			// UnoCSS({
			// 	presets: [
			// 		presetIcons({
			// 			extraProperties: {
			// 				display: 'inline-block',
			// 				'vertical-align': 'middle',
			// 				// ...
			// 			},
			// 		}),
			// 	],
			// }),
			ElementPlus({
				useSource: true,
			}),
			viteCompression({
				verbose: true,
				disable: false,
				threshold: 10240,
				algorithm: 'gzip',
				ext: '.gz',
			}),
			pages({
				dirs: 'src/example',
				exclude: ['**/components/*.vue'],
			}),
		],
		build: {
			lib: {
				entry: path.resolve(__dirname, 'src/index.js'), // 组件入口
				name: 'akvts', // 库名称
				fileName: (format) => `akvts.${format}.js`, // 打包后的文件名
			},
			rollupOptions: {
				external: ['vue', 'vue-router', 'axios', 'pinia'],
				output: {
					globals: {
						vue: 'Vue',
						'vue-router': 'VueRouter',
						axios: 'axios',
						pinia: 'Pinia',
					},
					exports: 'named',
				},
			},
			terserOptions: {
				format: {
					beautify: false, // 不美化输出
					comments: false, // 移除注释
				},
				compress: {
					//生产环境时移除console
					drop_console: true,
					drop_debugger: true,
				},
			},
		},
	})
}
