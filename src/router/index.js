import {createRouter, createWebHistory} from 'vue-router'
import routes from 'virtual:generated-pages'

export const router = createRouter({
	// 基于浏览器 URL 的 hash 路由模式 /#/home
	// history: createWebHashHistory(),
	// 使用 createWebHistory 需要服务配置所有的路由请求都返回首页, 再由前端代码进行路由的匹配和处理
	history: createWebHistory(),
	routes: routes,
})

console.log('routes', routes)

router.beforeEach((to, from, next) => {
	next()
})

export default router
