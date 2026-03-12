<script setup>
import {ref} from 'vue'

const panelRef = ref()
const panels = ref([
	{
		name: 'Panel 1',
		items: [{name: 'Item 1', value: 'Value 1'}],
		panels: [{name: 'Sub Panel 1', items: [], panels: []}],
	},
	{name: 'Panel 2', items: []},
	{name: 'Panel 3', items: []},
])
const buttons = ref([
	{
		name: '添加业务表',
		action: (panel) => {
			console.log('Button 1 clicked', panel)
			if (!panel.items) {
				panel.items = []
			}
			panel.items.push({name: '请选择业务表', value: '数据量：10000'})
		},
	},
	{
		name: '添加板块',
		action: (panel) => {
			console.log('Button 2 clicked', panel)
			if (!panel.panels) {
				panel.panels = []
			}
			panel.panels.unshift({name: ''})
		},
	},
])
setTimeout(() => {
	panels.value.push({name: 'Panel 4'})
}, 2000)
</script>
<template>
	<div class="h-full">
		<el-button
			@click="
				() => {
					panels.unshift({name: 'New Panel', items: [], panels: []})
				}
			"
			>新增</el-button
		>
		<el-button @click="panelRef.enabledCustom(true)">编辑</el-button>
		<el-button @click="panelRef.enabledCustom(false)">取消</el-button>
		<CustomizedPanel ref="panelRef" v-model="panels" :buttons="buttons"> </CustomizedPanel>
	</div>
</template>
<style scoped lang="scss"></style>
