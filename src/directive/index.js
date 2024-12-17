export const directives = (app) => {
	const keyboard = (keycode, el, fn) => {
		console.log('Directive keyboard:', keycode)
		if (typeof fn !== 'function') {
			return
		}

		const handleEvent = (e) => {
			if (e.key === keycode) {
				console.log('Directive Key Code:', e.key)
				fn(e)
				// document.removeEventListener('keydown', handleEvent)
			}
		}
		document.__pasteHandler = handleEvent
		document.addEventListener('keydown', handleEvent)
	}

	// escape 指令
	app.directive('escape', {
		mounted(el, binding, vnode, prevVnode) {
			keyboard('Escape', el, binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			document.removeEventListener('keydown', document.__pasteHandler)
		},
	})

	// enter 指令
	app.directive('enter', {
		mounted(el, binding, vnode, prevVnode) {
			keyboard('Enter', el, binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			document.removeEventListener('keydown', document.__pasteHandler)
		},
	})

	// resize 指令
	app.directive('resize', {
		mounted(el, binding, vnode, prevVnode) {
			window.addEventListener('resize', binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			window.removeEventListener('resize', binding.value)
		},
	})

	// 删除键
	app.directive('backspace', {
		mounted(el, binding, vnode, prevVnode) {
			keyboard('Backspace', el, binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			document.removeEventListener('keydown', document.__pasteHandler)
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
			document.addEventListener('keydown', handler)
		},
		unmounted(el, binding) {
			// 移除事件监听
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
