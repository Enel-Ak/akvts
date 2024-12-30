<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue'
import Lock from './Lock.vue'

const props = defineProps({
	visible: {
		type: Boolean,
		default: true,
	},
	text: {
		type: String,
		default: 'Watermark',
	},
	color: {
		type: String,
		default: 'rgba(184, 184, 184, 0.5)',
	},
	fontSize: {
		type: String,
		default: '16px',
	},
	zIndex: {
		type: Number,
		default: 9999,
	},
	opacity: {
		type: Number,
		default: 0.3,
	},
	rotate: {
		type: Number,
		default: -15,
	},
	density: {
		type: Number,
		default: 2,
	},
	frequency: {
		type: Number,
		default: 1000,
	},
	enableUnLock: {
		type: Boolean,
		default: false,
	},
})

let canvas = null
let background = null
let lastTime = Date.now()
let isAnimating = false
const unLock = ref(0)
const watermarkText = computed(() => {
	const un = unLock.value ? '' : '\n\n 未激活'
	return props.text + `${props.enableUnLock ? un : ''}`
})

const init = () => {
	if (props.visible) {
		const now = Date.now()
		const elapsed = now - lastTime

		if (elapsed >= props.frequency && isAnimating) {
			lastTime = now

			const water = document.querySelector('.watermark')
			if (!canvas) {
				canvas = document.createElement('canvas')
				const lines = watermarkText.value.split('\n')
				const max = Math.max(...lines.map((line) => line.length))
				const angleInRadians = (props.rotate * Math.PI) / 180
				const sin = Math.abs(Math.sin(angleInRadians))
				const cos = Math.abs(Math.cos(angleInRadians))
				const width = max * 20
				const height = lines.length * props.fontSize.replace('px', '')

				const rotatedWidth = width * cos + height * sin
				const rotatedHeight = width * sin + height * cos

				canvas.width = rotatedWidth * props.density
				canvas.height = rotatedHeight * props.density

				const ctx = canvas.getContext('2d')

				ctx.font = `${props.fontSize} Arial`
				ctx.fillStyle = props.color
				ctx.rotate((props.rotate * Math.PI) / 180)

				const fontsize = parseInt(props.fontSize.replace('px', ''))
				for (let i = 0; i < lines.length; i++) {
					const textWidth = ctx.measureText(lines[i]).width
					const x = (rotatedWidth - textWidth) / 2
					const y =
						(rotatedHeight - (lines.length - 1) * fontsize) / 2 +
						(i + 1) * fontsize +
						Math.abs(props.rotate) +
						10
					ctx.fillText(lines[i], x, y)
				}

				background = `url(${canvas.toDataURL('image/png')}) repeat,url(${canvas.toDataURL(
					'image/png'
				)}) repeat ${canvas.width / 2}px ${(props.density - 1) * 15}px`
			}

			const next = (el) => {
				el.classList.add('watermark')
				el.style.background = background
				el.style.zIndex = props.zIndex
				el.style.opacity = props.opacity
			}

			if (!water) {
				const div = document.createElement('div')
				next(div)
				document.body.appendChild(div)
			} else {
				next(water)
			}
		}
	}

	requestAnimationFrame(init)
}
onMounted(() => {
	console.log('Watermark mounted', canvas, background, watermarkText.value)
	isAnimating = true
	init()
})
onUnmounted(() => {
	isAnimating = false
	cancelAnimationFrame(init)

	const el = document.querySelector('.watermark')
	el && el.remove()

	canvas = null
	background = null
	console.log('Watermark unmounted', watermarkText.value)
})
</script>
<template>
	<Lock v-model="unLock" class="watermark"></Lock>
</template>
<style lang="scss">
.watermark {
	height: 100%;
	left: 0;
	position: fixed;
	pointer-events: none;
	top: 0;
	width: 100%;
}
</style>
