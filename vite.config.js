import {defineConfig, loadEnv} from 'vite'
import vue from '@vitejs/plugin-vue'
import pages from 'vite-plugin-pages'
import path from 'path'
import ElementPlus from 'unplugin-element-plus/vite'
import viteCompression from 'vite-plugin-compression'
import VueSetupExtend from 'vite-plugin-vue-setup-extend'
import {visualizer} from 'rollup-plugin-visualizer'

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
			VueSetupExtend(),
			ElementPlus({
				useSource: true,
			}),
			viteCompression({
				verbose: true,
				disable: false,
				threshold: 10240,
				algorithm: 'brotliCompress',
				ext: '.br',
			}),
			pages({
				dirs: 'src/example',
				exclude: ['**/components/*.vue'],
				extendRoute(route) {
					// 如果当前路由没有定义 meta，添加一个默认的 meta
					return {
						...route,
						meta: {
							title:
								route.meta?.modifiedTitle ||
								route.meta?.title ||
								route.meta?.childTitle ||
								'-未命名',
							// ...route.meta, // 保留原有的 meta
							ignoreLabel: route.meta?.ignoreLabel,
						},
					}
				},
			}),
			visualizer({
				filename: './dist/stats.html',
				open: true,
				gzipSize: true,
				brotliSize: true,
			}),
		],
		build: {
			minify: 'terser',
			assetsInlineLimit: 4096, // 将小于4kb的资源内联为base64
			assetsDir: 'assets',
			reportCompressedSize: true,
			chunkSizeWarningLimit: 500, // 降低警告阈值，更早发现大文件
			sourcemap: false,
			lib: {
				entry: path.resolve(__dirname, 'src/index.js'), // 组件入口
				name: 'akvts', // 库名称
				fileName: (format) => `index.${format}.js`, // 打包后的文件名改为index.es.js
				formats: ['es'], // 只保留ES模块格式，减少重复代码
			},
			rollupOptions: {
				external: [
					'vue',
					'vue-router',
					'axios',
					'pinia',
					'element-plus',
					'@element-plus/icons-vue',
					'lodash-es',
					'lodash',
					// 添加更多外部依赖
					'dayjs',
					'echarts',
					'sortablejs',
				],
				output: {
					globals: {
						vue: 'Vue',
						'vue-router': 'VueRouter',
						axios: 'axios',
						pinia: 'Pinia',
						'element-plus': 'ElementPlus',
						'@element-plus/icons-vue': 'ElementPlusIconsVue',
						'lodash-es': '_',
						dayjs: 'dayjs',
						echarts: 'echarts',
						sortablejs: 'Sortable',
					},
					exports: 'named',
					compact: true,
					// 优化CSS输出
					assetFileNames: (assetInfo) => {
						if (assetInfo.name.endsWith('.css')) {
							return 'style.css' // 直接输出到dist根目录
						}
						return 'assets/[name][extname]'
					},
					preserveModules: false, // 保留模块结构
					preserveModulesRoot: 'src', // 模块根目录
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
					pure_funcs: ['console.log'],
					passes: 2, // 多次优化
				},
				mangle: {
					toplevel: true, // 混淆顶级变量
				},
			},
		},
	})
}
