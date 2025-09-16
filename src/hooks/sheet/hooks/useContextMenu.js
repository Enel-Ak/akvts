import {ref} from 'vue'
import {useAirSheetStore} from '../store/useAirSheet'

export const useContextMenu = () => {
	const sheetStore = useAirSheetStore()
	let sheetKey = null
	let sheet = null
	let container = null
	const contextMenuVisible = ref(false)
	const contextMenuStyle = ref({
		left: '0px',
		top: '0px',
		display: 'none',
	})

	// 处理右键菜单
	const handleContextMenu = (e) => {
		e.preventDefault() // 阻止默认的右键菜单

		if (!container) return

		// 获取容器的位置信息
		const rect = container.getBoundingClientRect()

		// 计算相对于容器的位置，需要考虑滚动位置
		const x = e.clientX - rect.left + container.scrollLeft
		const y = e.clientY - rect.top + container.scrollTop

		// 获取菜单的尺寸（如果已经显示）
		const menu = container.querySelector('.context-menu')
		const menuWidth = menu ? menu.offsetWidth : 120 // 默认最小宽度
		const menuHeight = menu ? menu.offsetHeight : 150 // 预估高度

		// 确保菜单不会超出容器边界
		let finalX = x
		let finalY = y

		// 检查右边界
		if (x + menuWidth > container.scrollWidth) {
			finalX = x - menuWidth
		}

		// 检查下边界
		if (y + menuHeight > container.scrollHeight) {
			finalY = y - menuHeight
		}

		// 确保不会出现负值
		finalX = Math.max(0, finalX)
		finalY = Math.max(0, finalY)

		// 更新菜单位置和显示状态
		contextMenuStyle.value = {
			left: `${finalX}px`,
			top: `${finalY + 10}px`,
			display: 'block',
		}
		contextMenuVisible.value = true

		// 添加全局点击事件来关闭菜单
		const closeMenu = (e) => {
			const menu = container.querySelector('.context-menu')
			if ((menu && !menu.contains(e.target)) || e.target.closest('.menu-item')) {
				contextMenuVisible.value = false
				contextMenuStyle.value.display = 'none'
				document.removeEventListener('click', closeMenu)
			}
		}

		// 延迟添加事件监听，避免立即触发
		setTimeout(() => {
			document.addEventListener('click', closeMenu)
		}, 0)
	}

	const destroy = () => {
		if (container) {
			container.removeEventListener('contextmenu', handleContextMenu)
		}
	}

	const refreshSheet = (id) => {
		sheet = sheetStore.getSheet(id)
	}

	const init = (key, containerId) => {
		sheetKey = key
		sheet = sheetStore.getSheet(key)

		setTimeout(() => {
			container = document.querySelector(`#${containerId}`)
			if (!container) {
				return
			}
			container.addEventListener('contextmenu', handleContextMenu)
			console.log('installed useContextMenu')
		}, 16)

		return {
			destroy,
			contextMenuVisible,
			contextMenuStyle,

			refreshSheet,
		}
	}

	return {
		init,
	}
}
