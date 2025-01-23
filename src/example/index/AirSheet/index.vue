<script setup>
import {onMounted, ref} from 'vue'

const tableRef = ref()
const config = {
	celldata: [
		['A1', 'B1', 'C1', 'D1', 'E1'],
		['A2', 'B2', 'C2', 'D2', 'E2'],
		['A3', 'B3', 'C3', 'D3', 'E3'],
		['A4', 'B4', 'C4', 'D4', 'E4'],
		['A5', 'B5', 'C5', 'D5', 'E5'],
	],
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
const config2 = {
	celldata: [
		['A1', 'B1', 'C1', 'D1', 'E1'],
		['A2', 'B2', 'C2', 'D2', 'E2'],
		['A3', 'B3', 'C3', 'D3', 'E3'],
		['A4', 'B4', 'C4', 'D4', 'E4'],
		['A5', 'B5', 'C5', 'D5', 'E5'],
	],
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
	tableRef.value.mergeCells(0, 0, 2, 2)
	tableRef.value.mergeCells(1, 3, 3, 3)
})
</script>
<template>
	<div style="height: 100%" class="df">
		<AirSheet ref="tableRef" v-model="config"></AirSheet>
		<AirSheet v-model="config2" :row-count="100" :col-count="26"></AirSheet>
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
