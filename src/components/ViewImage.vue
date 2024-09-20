<script setup>
import {watch} from 'vue'

const emits = defineEmits(['close'])
const props = defineProps({
	src: {
		type: String,
		default: '',
	},
	alt: {
		type: String,
		default: '',
	},
	closeOnClickModal: {
		type: Boolean,
		default: true,
	},
	closeOnPressEscape: {
		type: Boolean,
		default: true,
	},
})

const onClose = (e) => {
	const viewImage = document.querySelector('.view-image-component')
	if (viewImage) {
		viewImage.classList.add('hide')
		setTimeout(() => {
			viewImage.remove()
			emits('close')
		}, 500)
	}
}

const init = () => {
	const viewImage = document.createElement('div')
	const imageLayer = document.createElement('div')
	const image = document.createElement('img')
	const close = document.createElement('div')

	image.src = props.src
	image.alt = props.alt
	close.innerHTML = '&times; <span>关闭</span>'

	viewImage.classList.add('view-image-component')
	imageLayer.classList.add('image')
	image.classList.add('shadow-24')
	close.classList.add('close')

	image.addEventListener('click', (e) => {
		e.stopPropagation()
	})

	close.addEventListener('click', onClose)

	if (props.closeOnClickModal) {
		viewImage.addEventListener('click', onClose)
	}

	if (props.closeOnPressEscape) {
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				onClose(e)
			}
		})
	}

	imageLayer.appendChild(close)
	imageLayer.appendChild(image)
	viewImage.appendChild(imageLayer)
	document.body.appendChild(viewImage)

	setTimeout(() => {
		viewImage.classList.add('visible')
	}, 16.7)
}

watch(
	() => props.src,
	(value) => {
		if (value) {
			init()
		}
	},
	{
		deep: true,
	}
)
</script>
<template></template>
<style lang="scss">
@keyframes scaleImage {
	0% {
		// opacity: 0;
		transform: scale(0);
	}
	30% {
		transform: scale(1.1);
	}
	60% {
		transform: scale(0.9);
	}
	90% {
		transform: scale(1);
	}
	100% {
		// opacity: 1;
		transform: scale(1);
	}
}
.view-image-component {
	background: rgba($color: var(--z-theme-rgb), $alpha: 0.95);
	height: 100%;
	left: 0;
	opacity: 0;
	position: fixed;
	top: 0;
	transition: all 0.15s linear;
	width: 100%;
	z-index: -1;

	&.visible {
		opacity: 1;
		z-index: 9999;
		img {
			animation: scaleImage 0.3s linear forwards;
		}
	}

	&.hide {
		opacity: 0;
		z-index: 9999;
		img {
			scale: 0;
		}
	}

	.image {
		height: inherit;
		position: absolute;
		width: inherit;

		img {
			border-radius: torem(5px);
			border: 3px solid var(--z-nav-hover);
			height: 80%;
			margin: auto;
			object-fit: contain;
			overflow: hidden;
			// opacity: 0;
			position: absolute;
			right: 0;
			top: 0;
			left: 0;
			bottom: 0;
			transform: scale(0);
			transition: all 0.15s linear;
		}
	}

	.close {
		align-items: center;
		cursor: pointer;
		color: var(--z-font-color);
		display: flex;
		font-size: torem(16px);
		flex-wrap: nowrap;
		height: torem(40px);
		justify-content: center;
		overflow: hidden;
		position: absolute;
		right: torem(10px);
		transition: all 0.15s linear;
		top: torem(6px);
		width: torem(80px);

		span {
			font-size: torem(16px);
			margin-left: torem(5px);
		}

		&:hover {
			transform: scale(1.1);
		}
	}

	img {
		height: torem(100px);
	}
}
</style>
