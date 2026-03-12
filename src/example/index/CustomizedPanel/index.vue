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
			panel.items.push({name: '请选择业务表', value: ''})
			panelRef.value.refresh()
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
			panelRef.value.refresh()
		},
	},
])
setTimeout(() => {
	panels.value.push({name: 'Panel 4'})
}, 2000)
const handleClickItem = (item) => {
	console.log('Clicked item:', item)
	setTimeout(() => {
		item.name = 'changed after click'
	}, 1000)
}
</script>
<template>
	<div class="h-full">
		<el-button
			@click="
				() => {
					panels.unshift({name: 'New Panel', items: [], panels: []})
					panelRef.refresh()
				}
			"
			>新增</el-button
		>
		<el-button @click="panelRef.enabledCustom(true)">编辑</el-button>
		<el-button @click="panelRef.enabledCustom(false)">取消</el-button>
		<CustomizedPanel
			ref="panelRef"
			v-model="panels"
			:buttons="buttons"
			@clickItem="handleClickItem"
		>
		</CustomizedPanel>
	</div>
</template>
<style scoped lang="scss"></style>
