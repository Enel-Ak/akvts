<script setup>
const achart = {
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

const charts = [
	{
		prop: 'default',
		x: 0,
		y: 0,
		w: 4,
		h: 4,
		title: '柱状图',
		option: achart,
		content: 'Item 1',
	},
	{
		prop: 'chart2',
		x: 4,
		y: 0,
		w: 5,
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
		option: achart,
		content: 'Item 1',
	},
]
</script>
<template>
	<div class="grid grid-cols-4 gap-4">
		<GridLayout :props="charts">
			<template #[`grid-${chart.prop}`] v-for="chart of charts">
				<Block
					:title="chart.title"
					:border="false"
					:inherit="true"
					:enableExpandContent="false"
					:enable-close-button="false"
				>
					<Charts :option="chart.option" />
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
