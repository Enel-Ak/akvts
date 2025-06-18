<script setup>
import {nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch} from 'vue'
import {init} from 'echarts'

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
})

const id = `chart-${Math.random().toString(36).slice(2)}`
const chartRef = ref()
const chartHeight = ref(typeof props.height === 'number' ? `${props.height}px` : props.height)
const chartWidth = ref(typeof props.width === 'number' ? `${props.width}px` : props.width)
let chart = null
let observer = null
let observerTimer = null

const setConfig = () => {}

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
			chart.setOption(props.option)
		}
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
					chart.setOption(newVal)
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
</script>
<template>
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
</template>
<style scoped lang="scss">
.charts {
	width: 100%;
	height: 100%;
}
</style>
