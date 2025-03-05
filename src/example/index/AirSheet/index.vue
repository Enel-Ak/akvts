<script setup name="airsheet">
import {onMounted, ref} from 'vue'

const sheetRef = ref()
const config = ref({
	config: {
		// showToolbar: false,
		// edit: false,
		freezeCount: {
			row: 1,
			col: 1,
		},
		cellKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
		cellStyle: {},
	},
	celldata: Array.from({length: 300000}, (_, r) => {
		return Array.from({length: 10}, (_, c) => {
			return `R${r + 1}-C${c + 1}`
		})
	}),
	// celldata: [],
})

const config2 = {
	celldata: Array.from({length: 100}, (_, index) => {
		return Array.from({length: 24}, (_, index) => {
			return `R${index + 1}-C${index + 1}`
		})
	}),
	fns: [
		// {
		// 	label: '测试',
		// 	type: 'primary',
		// 	click: (row, rowData) => {
		// 		console.log(row, rowData)
		// 	},
		// },
	],
}

const fns = [
	// {
	// 	label: '操作',
	// 	click: (row, rowData) => {
	// 		console.log(row, rowData)
	// 	},
	// },
]

onMounted(() => {
	// sheetRef.value.setCellBackground(0, 0, 1, 1, '#f00')
	// sheetRef.value.setMergeCell(5, 4, 4, 4)
	// sheetRef.value.setMergeCell(1, 5, 4, 4)
	// sheetRef.value.setCellValue(0, 0, 'hello')

	config.value.config.cellStyle = {
		'1-1': {
			bg: '#f00',
		},
	}
	config.value.config.mergedCells = {
		'1-3': {
			rowspan: 2,
			colspan: 2,
		},
	}
	// config.value.celldata[0][0] = '123'

	setTimeout(() => {
		// sheetRef.value.setMergeCell(0, 0, 2, 4)
		// sheetRef.value.setRange(0, 0, 2, 4)
		// config.value.celldata[0][0] = '123'
		// config.value.celldata[0][0] = '123'
		// sheetRef.value.airToLucky().then((res) => {
		// 	console.log(99, res)
		// })
		// sheetRef.value
		// 	.luckyToAir(
		// 		{
		// 			merge: {
		// 				'4_4': {r: 4, c: 4, rs: 2, cs: 2},
		// 			},
		// 		},
		// 		[
		// 			{r: 0, c: 0, v: {v: '123'}},
		// 			{r: 0, c: 1, v: {v: '3123'}},
		// 		]
		// 	)
		// 	.then((res) => {
		// 		console.log(99, res)
		// 		config.value.config = res.config
		// 		config.value.celldata = res.celldata
		// 	})
	}, 5000)
	// sheetRef.value.mergeCells(1, 3, 3, 3)
})

const onClick = () => {
	console.log(sheetRef.value.getSheet())
}
</script>
<template>
	<div style="height: 100%" class="df">
		<!-- <button @click="onClick">获取数据</button> -->
		<AirSheet ref="sheetRef" v-model="config" :fns="fns"></AirSheet>
		<!-- <AirSheet v-model="config2" :row-count="999" :col-count="120"></AirSheet> -->
	</div>
</template>
<route>
	{
		meta: {
			title: 'AirSheet',
		},
	}
</route>
<style scoped lang="scss"></style>
