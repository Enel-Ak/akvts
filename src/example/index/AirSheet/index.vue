<script setup>
import {onMounted, ref} from 'vue'

const sheetRef = ref()
const config = {
	config: {
		cellStyle: {
			'0-0': {
				a: 'right',
			},
		},
	},
	celldata: Array.from({length: 600}, (_, r) => {
		return Array.from({length: 100}, (_, c) => {
			return `R${r + 1}-C${c + 1}`
		})
	}),
	// celldata: [],
}
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
	// sheetRef.value.setMergeCell(12, 4, 4, 4)
	// sheetRef.value.setMergeCell(16, 5, 4, 4)
	// // sheetRef.value.setCellValue(0, 0, 'hello')
	// setTimeout(() => {
	// 	sheetRef.value.setMergeCell(0, 0, 2, 4)
	// 	sheetRef.value.setRange(0, 0, 2, 4)
	// }, 1000)
	// sheetRef.value.mergeCells(1, 3, 3, 3)
})
</script>
<template>
	<div style="height: 100%" class="df">
		<AirSheet ref="sheetRef" v-model="config" :fns="fns"></AirSheet>

		<!-- <AirSheet v-model="config2" :row-count="999" :col-count="120"></AirSheet> -->
	</div>
</template>
<route>
	{
		meta: {
			title: '虚拟表',
		},
	}
</route>
<style scoped lang="scss"></style>
