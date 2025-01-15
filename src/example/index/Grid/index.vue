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
</script>
<template>
	<div class="grid grid-cols-4 gap-4">
		<GridLayout>
			<template #grid-default>
				<Block
					title="柱状图1"
					:border="false"
					:inherit="true"
					:enableExpandContent="false"
					:enable-close-button="false"
				>
					<Charts :option="achart" />
				</Block>
			</template>
		</GridLayout>
	</div>
</template>
<route>
    {
        meta: {
            title: '',
        },
    }
</route>
