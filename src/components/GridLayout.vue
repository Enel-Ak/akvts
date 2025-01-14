<script setup>
import {onMounted} from 'vue'
import {GridStack} from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

onMounted(() => {
	GridStack.init()
})
</script>
<template>
	<div class="grid-component">
		<div class="grid-stack">
			<div class="grid-stack-item">
				<div class="grid-stack-item-content">Item 1</div>
			</div>
			<div class="grid-stack-item" gs-w="2">
				<div class="grid-stack-item-content">Item 2 wider</div>
			</div>
		</div>
	</div>
</template>
<style lang="css" scoped>
.grid-stack {
	background: #fafad2;
}
.grid-stack-item-content {
	background-color: #18bc9c;
}
</style>
