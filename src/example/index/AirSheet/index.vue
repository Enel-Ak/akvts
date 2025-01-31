<script setup>
import {onMounted, ref} from 'vue'

const tableRef = ref()
const config = {
	celldata: Array.from({length: 100}, (_, r) => {
		return Array.from({length: 26}, (_, c) => {
			return `R${r + 1}-C${c + 1}`
		})
	}),
	fns: [
		{
			label: '测试',
			type: 'primary',
			click: (row, rowData) => {
				console.log(row, rowData)
			},
		},
	],
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

onMounted(() => {
	tableRef.value.setRange(0, 0, 0, 0)
	tableRef.value.setMergeCell(12, 4, 4, 4)
	tableRef.value.setMergeCell(16, 5, 4, 4)
	tableRef.value.setMergeCell(45, 7, 2, 4)

	// tableRef.value.mergeCells(1, 3, 3, 3)
})
</script>
<template>
	<div style="height: 100%" class="df">
		<AirSheet ref="tableRef" v-model="config"></AirSheet>

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
