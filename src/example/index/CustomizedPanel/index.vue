<script setup>
import {ref} from 'vue'

const panelRef = ref()
const panels = ref([
	// {
	// 	id: '1',
	// 	name: 'Panel 1',
	// 	items: [{id: 'item-1-1', name: 'Item 1', value: 'Value 1'}],
	// 	panels: [{id: 'panel-1-1', name: 'Sub Panel 1', items: [], panels: []}],
	// },
	// {id: '2', name: 'Panel 2', items: []},
	// {id: '3', name: 'Panel 3', items: []},
])
const buttons = ref([
	{
		name: '添加业务表',
		action: (panel) => {
			console.log('Button 1 clicked', panel)
			if (!panel.items) {
				panel.items = []
			}
			panel.items.push(
				...[
					{name: '请选择业务表', value: null},
					{name: '请选择业务表', value: 1},
				]
			)
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
					panels.unshift({
						id: panels.length + 1,
						name: 'New Panel',
						items: [],
						panels: [],
					})
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
