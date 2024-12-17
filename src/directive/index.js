export const directives = (app) => {
	// resize 指令
	app.directive('resize', {
		mounted(el, binding, vnode, prevVnode) {
			window.addEventListener('resize', binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			window.removeEventListener('resize', binding.value)
		},
	})

	// 按键指令
	app.directive('action', {
		mounted(el, binding) {
			const arg = binding.arg.charAt(0).toUpperCase() + binding.arg.slice(1)

			const handler = (event) => {
				if (event.key === arg && el.contains(event.target)) {
					console.log('Directive action', arg)
					binding.value(event)
				}
			}

			el.__keyHandler__ = handler
			el.setAttribute('action', binding.arg)
			document.addEventListener('keydown', handler)
		},
		unmounted(el, binding) {
			// 移除事件监听
			el.removeAttribute('action')
			document.removeEventListener('keydown', el.__keyHandler__)
		},
	})

	// 粘贴
	app.directive('paste', {
		mounted(el, binding) {
			const handler = (e) => {
				if (typeof binding.value === 'function') {
					const items = e.clipboardData?.items
					const files = []
					for (const item of items || []) {
						files.push(item.getAsFile())
					}
					console.log('Directive Paste:', files)
					binding.value(files, el)
				}
			}
			el.__pasteHandler = handler
			el.addEventListener('paste', handler)
		},
		unmounted(el, binding) {
			el.removeEventListener('paste', el.__pasteHandler)
		},
	})

	// 禁止鼠标滚轮指令
	app.directive('mousewheel', {
		mounted(el, binding) {
			const handler = (e) => {
				e.preventDefault()
			}
			el.__mousewheelHandler = handler

			el.querySelector('input')?.addEventListener('wheel', handler)
		},
		unmounted(el, binding) {
			el.querySelector('input')?.removeEventListener('wheel', el.__mousewheelHandler)
		},
	})

	// 设置主滚动条位置
	app.directive('scroll', {
		mounted(el, binding) {
			const handler = (e) => {
				const mainScroll = document.querySelector('.main-scrollbar>.el-scrollbar__wrap')
				if (typeof binding.value === 'number') {
					mainScroll.scrollTop = binding.value
				} else {
					const isBottom =
						mainScroll.scrollTop + mainScroll.clientHeight === mainScroll.scrollHeight
					if (!isBottom) {
						console.log('Directive Scroll:', mainScroll.scrollHeight)
						mainScroll.scrollTop = mainScroll.scrollHeight
					}
				}
			}
			el.__scrollHandler = handler
			el.addEventListener('click', handler)
		},
		unmounted(el, binding) {
			el.removeEventListener('click', el.__scrollHandler)
		},
	})
}
