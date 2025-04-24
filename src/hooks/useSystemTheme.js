import {ref} from 'vue'
import {useGlobal} from '@/store/useGlobal'
const currentTheme = ref('light')
export function useSystemTheme(init = true) {
	const updateThemeClass = (isDark) => {
		const body = document.body
		body.classList.remove(isDark ? 'light' : 'dark')
		body.classList.add(isDark ? 'dark' : 'light')
		currentTheme.value = isDark ? 'dark' : 'light'
		useGlobal().setTheme(isDark ? 'dark' : 'light')
	}

	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

	// 初始化设置
	if (init) updateThemeClass(mediaQuery.matches)

	// 响应系统主题变化
	const handleChange = (e) => {
		updateThemeClass(e.matches)
	}

	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handleChange)
	} else {
		// Safari 兼容
		mediaQuery.addListener(handleChange)
	}

	// 返回当前主题和清理函数
	return {
		cleanup: () => {
			if (mediaQuery.removeEventListener) {
				mediaQuery.removeEventListener('change', handleChange)
			} else {
				mediaQuery.removeListener(handleChange)
			}
		},
	}
}

export {currentTheme}
