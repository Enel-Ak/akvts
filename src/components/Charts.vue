<script setup>
import {onMounted, ref, watch} from 'vue'
import * as echarts from 'echarts'

const props = defineProps({
	option: {
		type: Object,
		default: () => ({}),
	},
	height: {
		type: [Number, String],
		default: 300,
	},
})

const id = `chart-${Math.random().toString(36).slice(2)}`
const charts = ref(null)
const chartHeight = ref(typeof props.height === 'number' ? `${props.height}px` : props.height)
const _option = ref(props.option)

watch(
	() => props.option,
	(newVal) => {
		charts.value.setOption(newVal)
	},
	{deep: true}
)

onMounted(() => {
	charts.value = echarts.init(document.getElementById(id))
	charts.value.setOption(_option.value)
})
</script>
<template>
	<div class="eCharts" :id="id" :style="{height: chartHeight}"></div>
</template>
<style scoped lang="scss">
.eCharts {
	height: 100%;
	width: 100%;
}
</style>
