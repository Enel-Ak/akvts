export const directives = (app) => {
	const keyboard = (keycode, dom, fn) => {
		console.log('Directive keyboard:', keycode)
		if (typeof fn !== 'function') {
			return
		}
		dom.addEventListener('keydown', (e) => {
			if (e.key === keycode) {
				console.log('Directive Key Code:', e.key)
				fn(e)
				dom.removeEventListener('keydown', fn)
			}
		})
	}

	// escape 指令
	app.directive('escape', {
		mounted(el, binding, vnode, prevVnode) {
			keyboard('Escape', el, binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			el.removeEventListener('keydown', binding.value)
		},
	})

	// enter 指令
	app.directive('enter', {
		mounted(el, binding, vnode, prevVnode) {
			keyboard('Enter', el, binding.value)
		},
		unmounted(el, binding, vnode, prevVnode) {
			el.removeEventListener('keydown', binding.value)
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
			document.removeEventListener('keydown', el, binding.value)
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
