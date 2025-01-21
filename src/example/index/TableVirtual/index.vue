<script setup>
import {onMounted} from 'vue'

const config = {
	cells: [
		['A1', 'B1', 'C1', 'D1', 'E1'],
		['A2', 'B2', 'C2', 'D2', 'E2'],
		['A3', 'B3', 'C3', 'D3', 'E3'],
		['A4', 'B4', 'C4', 'D4', 'E4'],
		['A5', 'B5', 'C5', 'D5', 'E5'],
	],
}

onMounted(() => {})
</script>
<template>
	<div style="height: 100%" class="df">
		<TableVirtual v-model="config"></TableVirtual>
		<TableVirtual v-model="config"></TableVirtual>
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
