<script setup>
import {onMounted, onUnmounted} from 'vue'
import {GridStack} from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

const props = defineProps({
	props: {
		type: Array,
		default: () => [
			{
				prop: 'default',
				x: 0,
				y: 0,
				w: 4,
				h: 4,
				content: 'Item 1',
			},
		],
	},
	overflow: {
		type: Array,
		default: () => ['hidden', 'hidden'], // x, y
	},
})

onMounted(() => {
	GridStack.init()
})
</script>
<template>
	<div class="grid-component">
		<div class="grid-stack">
			<div
				v-for="prop in props.props"
				:gs-x="prop.x"
				:gs-y="prop.y"
				:gs-w="prop.w"
				:gs-h="prop.h"
				class="grid-stack-item"
			>
				<div
					class="grid-stack-item-content"
					:style="{
						overflowX: props.overflow[0],
						overflowY: props.overflow[1],
					}"
				>
					<slot :name="`grid-${prop.prop}`" :item="prop">
						{{ prop.content }}
					</slot>
				</div>
			</div>
		</div>
	</div>
</template>
<style lang="css" scoped>
.grid-stack {
	border-radius: 5px;
	border: 1px solid var(--z-line);
	background: var(--z-bg-secondary);
}
.grid-stack-item-content {
	border-radius: 5px;
	background-color: var(--z-theme);
	padding: 0 10px;
}
</style>
