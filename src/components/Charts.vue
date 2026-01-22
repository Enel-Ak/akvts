<script setup>
import {
	computed,
	nextTick,
	onActivated,
	onDeactivated,
	onMounted,
	onUnmounted,
	ref,
	watch,
} from 'vue'
import {init} from 'echarts'

const emits = defineEmits(['clickItem', 'completed', 'legendselectchanged', 'legendscroll'])
const chartEvents = ['legendselectchanged', 'legendscroll']

const props = defineProps({
	option: {
		type: Object,
		default: () => ({}),
	},
	width: {
		type: [Number, String],
		default: '100%',
	},
	height: {
		type: [Number, String],
		default: '100%',
	},
	delay: {
		type: Number,
		default: 16.7,
	},
	loading: {
		type: Boolean,
		default: false,
	},
})

const id = `chart-${Math.random().toString(36).slice(2)}`
const chartRef = ref()
const chartHeight = ref(typeof props.height === 'number' ? `${props.height}px` : props.height)
const chartWidth = ref(typeof props.width === 'number' ? `${props.width}px` : props.width)
const showLoading = computed(() => props.loading)
let chart = null
let observer = null
let observerTimer = null

const setConfig = () => {
	console.log(2)
	emits('clickItem', chart, props.option)
}

const initChart = async () => {
	if (!chartRef.value) return

	// 确保先销毁旧的实例
	if (chart) {
		chart.dispose()
	}

	// 等待 DOM 更新
	await nextTick()

	const chartDom = document.getElementById(id)
	if (!chartDom) return

	try {
		chart = init(chartDom)
		if (props.option && Object.keys(props.option).length > 0) {
			chart.setOption(props.option, true)

			chartEvents.forEach((event) => {
				chart.on(event, () => {
					emits(event, chart, props.option)
				})
			})
		}
		emits('completed', chart)
	} catch (err) {
		console.error('初始化图表失败:', err)
	}
}

const initObserver = () => {
	if (chartRef.value?.parentNode && !observer) {
		observer = new ResizeObserver((entries) => {
			if (observerTimer) {
				clearTimeout(observerTimer)
			}
			observerTimer = setTimeout(() => {
				chart.resize()
			}, props.delay)
		})
		observer.observe(chartRef.value.parentNode)
	}
}

const cleanUp = () => {
	if (observer) {
		observer.disconnect()
		observer = null
	}

	if (observerTimer) {
		clearTimeout(observerTimer)
		observerTimer = null
	}

	if (chart) {
		chart.dispose()
		chart = null
	}
}

watch(
	() => props.option,
	(newVal) => {
		if (newVal && Object.keys(newVal).length > 0) {
			nextTick(() => {
				if (chart) {
					chart.clear()
					chart.setOption(newVal, true)
				} else {
					initChart()
				}
			})
		}
	},
	{deep: true}
)

onMounted(() => {
	initChart()
	initObserver()
})

onActivated(() => {})

onDeactivated(() => {})

onUnmounted(() => {
	cleanUp()
})

defineExpose({
	getEchart: () => chart,
	setOption: (option, bool = true) => {
		if (chart) {
			chart.setOption(option, bool)
		}
	},
})
</script>
<template>
	<div class="charts-container">
		<div
			ref="chartRef"
			:id="id"
			:key="id"
			:style="{
				width: chartWidth,
				height: chartHeight,
			}"
			class="charts"
			@click="setConfig"
		></div>
		<div v-show="showLoading" class="loader-container">
			<div class="loader"></div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.charts-container {
	position: relative;
	width: 100%;
	height: 100%;
	.loader-container {
		align-items: center;
		justify-content: center;
		display: flex;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(var(--z-theme-rgb), 0.7);
	}

	.loader {
		width: fit-content;
		font-size: 42px;
		line-height: 1.5;
		font-family: system-ui, sans-serif;
		font-weight: bold;
		text-transform: uppercase;
		color: #0000;
		-webkit-text-stroke: 1px var(--z-primary);
		background:
			radial-gradient(1.13em at 50% 1.6em, var(--z-primary) 99%, #0000 101%) calc(50% - 1.6em)
				0/3.2em 100% text,
			radial-gradient(1.13em at 50% -0.8em, #0000 99%, var(--z-primary) 101%) 50% 0.8em/3.2em
				100% repeat-x text;
		animation: l9 2s linear infinite;
		transform: translateY(-30%);
	}
	.loader:before {
		content: '.....';
	}
	@keyframes l9 {
		to {
			background-position:
				calc(50% + 1.6em) 0,
				calc(50% + 3.2em) 0.8em;
		}
	}
}
.charts {
	width: 100%;
	height: 100%;
}
</style>
