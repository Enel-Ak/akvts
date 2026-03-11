<script setup>
const pros = defineProps({
	panel: {
		type: Object,
		required: true,
	},
	buttons: {
		type: Array,
		default: () => [], // { name: 'Button 1', action: () => {}}
	},
})

const emits = defineEmits(['clickbutton'])
</script>
<template>
	<div class="panel">
		<div class="panel-name">
			<el-input v-model="panel.name" placeholder="请输入模块名称"></el-input>
		</div>
		<div class="panel-items">
			<div v-for="item in panel?.items" :key="item.name" class="panel-item">
				{{ item.name }}
			</div>
		</div>
		<div class="btns">
			<el-button
				v-for="button in buttons"
				:key="button.name"
				size="small"
				@click="
					() => {
						button.action(panel)
						emits('clickbutton', {button, panel})
					}
				"
			>
				{{ button.name }}
			</el-button>
		</div>

		<CustomizedPanelItem
			v-for="subPanel in panel?.panels"
			:key="subPanel.name"
			:panel="subPanel"
			:buttons="buttons"
		/>
	</div>
</template>
<style scoped lang="scss">
.panel {
	border-radius: 8px;
	border: 1px solid var(--z-line);
	margin-top: 10px;
	padding: 10px;
}
.panel-item {
	align-items: center;
	display: flex;
	justify-content: space-between;
}
</style>
