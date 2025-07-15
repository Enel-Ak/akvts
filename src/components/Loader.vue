<script setup>
import {useGlobal} from '@/store/useGlobal'
import {computed, ref, watch} from 'vue'

const props = defineProps({
	enable: {type: Boolean, default: false},
	text: {type: String, default: '加载中...'},
	zIndex: {type: [Number, String], default: 9999},
})
const global = useGlobal()
const loading = computed(() => {
	return global.getLoadEnd
})
const enableGlobal = computed(() => useGlobal().getEnbaleLoader)

const loaderBarRef = ref()
const width = ref(0)
let startAutomatic = false
let automaticTimer = null

const barWidth = computed(() => {
	const {req, res, err} = global.getLoadingStatus
	const w = (((res + err) / req) * 100) | 0
	if (req > 0 && w > width.value) {
		width.value = w
		if (loaderBarRef.value.classList.contains('hide')) {
			loaderBarRef.value.classList.remove('hide')
		}
		if (w >= 100) {
			clearTimeout(automaticTimer)
			setTimeout(() => {
				startAutomatic = false
				loaderBarRef.value.classList.add('hide')
				width.value = 0
			}, 201)
		}
	}
	return width.value
})

const automatic = () => {
	automaticTimer = setTimeout(() => {
		if (width.value < 99) {
			width.value++
		}
		automatic()
	}, 256)
}

watch(
	() => global.loader,
	() => {
		if (!startAutomatic) {
			automatic()
			startAutomatic = true
		}
	},
	{deep: true}
)
</script>
<template>
	<div
		v-if="enableGlobal"
		ref="loaderBarRef"
		class="loader-bar"
		:style="{width: barWidth + '%'}"
	></div>
	<div
		v-if="enableGlobal"
		class="loader-mask"
		:class="{active: !loading || enable || width !== 0}"
	>
		<div class="loader" v-if="global.getLoadingStatus.req >= 1 || enable || width !== 0">
			<div class="tip">{{ text }} {{ barWidth | 0 }}%</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.loader-mask {
	background-color: rgba($color: var(--z-theme-rgb), $alpha: 0.2);
	height: 100%;
	left: 0;
	opacity: 0;
	position: fixed;
	top: 0;
	transition: all 0.3s ease-in-out;
	width: 100%;
	z-index: -1;

	&.active {
		opacity: 1;
		z-index: v-bind(zIndex);
	}
}

.loader {
	width: torem(120px);
	height: torem(22px);
	border-radius: 20px;
	color: var(--z-nav-hover);
	border: 2px solid;
	position: fixed;
	margin: auto;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: v-bind(zIndex);

	.tip {
		align-items: center;
		display: flex;
		position: absolute;
		top: torem(-20px);
		// animation: lt1 2s infinite;
	}
}

.loader::before {
	content: '';
	position: absolute;
	margin: 2px;
	inset: 0 100% 0 0;
	border-radius: inherit;
	background: currentColor;
	animation: l6 2s infinite;
}

.loader-bar {
	background-color: var(--z-nav-hover);
	height: torem(3px);
	left: 0;
	position: fixed;
	top: 0px;
	transition: all 0.1s linear;
	z-index: v-bind(zIndex);

	&.hide {
		opacity: 0;
		z-index: -1;
	}
}

@keyframes l6 {
	100% {
		inset: 0;
	}
}

@keyframes lt1 {
	0% {
		transform: translateX(0);
	}
	50% {
		transform: translateX(100%);
	}
	100% {
		transform: translateX(0);
	}
}
</style>
