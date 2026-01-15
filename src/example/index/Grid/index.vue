<script setup name="grid">
import {ref, toRaw} from 'vue'
const achart = {
	tooltip: {
		trigger: 'axis',
		axisPointer: {
			type: 'shadow',
		},
	},
	grid: {
		top: 10,
		bottom: 20,
		left: 35,
		right: 10,
	},
	xAxis: {
		type: 'category',
		data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
	},
	yAxis: {
		type: 'value',
	},
	series: [
		{
			data: [120, 200, 150, 80, 70, 110, 130],
			type: 'bar',
		},
	],
}

const bchart = {
	title: {
		text: 'Referer of a Website',
		subtext: 'Fake Data',
		left: 'center',
	},
	tooltip: {
		trigger: 'item',
	},
	legend: {
		orient: 'vertical',
		left: 'left',
	},
	series: [
		{
			name: 'Access From',
			type: 'pie',
			radius: '50%',
			data: [
				{value: 1048, name: 'Search Engine'},
				{value: 735, name: 'Direct'},
				{value: 580, name: 'Email'},
				{value: 484, name: 'Union Ads'},
				{value: 300, name: 'Video Ads'},
			],
			emphasis: {
				itemStyle: {
					shadowBlur: 10,
					shadowOffsetX: 0,
					shadowColor: 'rgba(0, 0, 0, 0.5)',
				},
			},
		},
	],
}

const charts = ref([
	{
		prop: 'default',
		x: 0,
		y: 0,
		w: 3,
		h: 3,
		title: '柱状图',
		option: achart,
		content: 'Item 1',
	},
	{
		prop: 'chart2',
		x: 4,
		y: 0,
		w: 3,
		h: 5,
		title: '饼图',
		option: bchart,
		content: 'Item 1',
	},
	{
		prop: 'chart3',
		x: 9,
		y: 0,
		w: 3,
		h: 3,
		title: '柱状图',
		option: achart.value,
		content: 'Item 1',
	},
])
const gridLayoutRef = ref()
const chartRefMap = new Map()
setTimeout(() => {
	charts.value.push({
		prop: 'chart4',
		x: 12,
		y: 0,
		w: 3,
		h: 3,
		title: '柱状图',
		option: achart,
		content: 'Item 1',
	})
	console.log(111, chartRefMap)

	chartRefMap.get('chart2').setOption({
		tooltip: {
			trigger: 'axis',
			axisPointer: {
				type: 'shadow',
			},
		},
		grid: {
			top: 10,
			bottom: 20,
			left: 35,
			right: 10,
		},
		xAxis: {
			type: 'category',
			data: ['1', '2', '3', '4', '5', 'Sat', 'Sun'],
		},
		yAxis: {
			type: 'value',
		},
		series: [
			{
				data: [120, 5, 1504, 80, 54, 110, 130],
				type: 'bar',
			},
		],
	})

	// console.log(111, gridLayoutRef.value.getConfig())
	// achart.value.series[0].itemStyle = {color: '#ff0000'}
	// charts.value[0].obj.setOption({
	// 	tooltip: {
	// 		trigger: 'axis',
	// 		axisPointer: {
	// 			type: 'shadow',
	// 		},
	// 	},
	// 	grid: {
	// 		top: 10,
	// 		bottom: 20,
	// 		left: 35,
	// 		right: 10,
	// 	},
	// 	xAxis: {
	// 		type: 'category',
	// 		data: ['1', '2', '3', '4', '5', 'Sat', 'Sun'],
	// 	},
	// 	yAxis: {
	// 		type: 'value',
	// 	},
	// 	series: [
	// 		{
	// 			data: [120, 5, 1504, 80, 54, 110, 130],
	// 			type: 'bar',
	// 		},
	// 	],
	// })
}, 2000)

const onClickItem = (chart, option) => {
	console.log(chart, option)
}
</script>
<template>
	<div class="grid grid-cols-4 gap-4">
		<GridLayout ref="gridLayoutRef" :props="charts" @click-item="(gridItem) => {}">
			<template #[`grid-${chart.prop}`] v-for="(chart, index) of charts">
				<Block
					:title="chart.title"
					:border="false"
					:inherit="true"
					:enableExpandContent="false"
					:enable-close-button="false"
				>
					<!-- <Charts
						:ref="(el) => chartRefMap.set(chart.prop, toRaw(el))"
						:loading="false"
						:option="chart.option"
						@click-item="onClickItem"
					/> -->
					<TableV2 :height="250"></TableV2>
				</Block>
			</template>
		</GridLayout>
	</div>
</template>
<route>
    {
        meta: {
            title: '工作通知',
        },
    }
</route>
