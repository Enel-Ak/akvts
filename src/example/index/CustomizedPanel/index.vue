<script setup>
import {ref} from 'vue'

const panelRef = ref()
const panels = ref([{name: 'Panel 1'}, {name: 'Panel 2'}, {name: 'Panel 3'}])
const buttons = ref([
	{
		name: '添加业务表',
		action: (panel) => {
			console.log('Button 1 clicked', panel)
			if (!panel.items) {
				panel.items = []
			}

			panel.items.push({name: 'New Item'})
		},
	},
	{
		name: '添加板块',
		action: (panel) => {
			console.log('Button 2 clicked', panel)
			if (!panel.panels) {
				panel.panels = []
			}

			panel.panels.unshift({name: 'Sub Panel'})
		},
	},
])
setTimeout(() => {
	panels.value.push({name: 'Panel 4'})
	// panelRef.value.enabledCustom(false) // 禁用定制功能
}, 2000)
setTimeout(() => {
	panels.value.push({name: 'Panel 5'})
	// panelRef.value.enabledCustom(false) // 禁用定制功能
}, 5000)
setTimeout(() => {
	panels.value.push({name: 'Panel 6'})
	// panelRef.value.enabledCustom(false) // 禁用定制功能
}, 10000)
</script>
<template>
	<CustomizedPanel ref="panelRef" v-model="panels" :buttons="buttons"></CustomizedPanel>
</template>
<style scoped lang="scss"></style>
