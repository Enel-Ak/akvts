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
	celldata: Array.from({length: 1000}, (_, r) => {
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
	setTimeout(() => {
		// sheetRef.value.setMergeCell(0, 0, 2, 4)
		// sheetRef.value.setRange(0, 0, 2, 4)
		// config.value.celldata[0][0] = '123'
	}, 1000)
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
