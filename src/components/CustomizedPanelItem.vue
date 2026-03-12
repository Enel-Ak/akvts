<script setup>
const props = defineProps({
	panel: {
		type: Object,
		required: true,
	},
	buttons: {
		type: Array,
		default: () => [], // { name: 'Button 1', action: () => {}}
	},
	disabled: {
		type: Boolean,
		default: false,
	},
})
const emits = defineEmits(['onDeletelPanel', 'onDeleteItem'])

const onDeletelPanel = () => {
	emits('onDeletelPanel', props.panel)
}
</script>
<template>
	<div v-if="!disabled" class="panel">
		<div class="panel-name">
			<el-input v-model="panel.name" placeholder="请输入板块名称"></el-input>
			<Icons
				name="Clear2"
				color="var(--z-danger)"
				class="delete-icon mg-left-5"
				@click="onDeletelPanel"
			/>
		</div>
		<div class="panel-items">
			<div v-for="(item, index) in panel?.items" :key="index" class="panel-item">
				<span>{{ item.name }}</span>
				<span class="flx mg-right-10">{{ item.value }}</span>
				<span class="delete-icon">
					<Icons
						name="Clear2"
						color="var(--z-danger)"
						@click="
							() => {
								panel.items.splice(index, 1)
							}
						"
					/>
				</span>
			</div>
		</div>
		<div class="btns">
			<el-button
				v-for="button in buttons"
				:key="button.name"
				size="small"
				type="primary"
				@click="
					() => {
						button.action(panel)
					}
				"
			>
				{{ button.name }}
			</el-button>
		</div>
		<CustomizedPanelItem
			v-for="(subPanel, index) in panel?.panels"
			:key="subPanel.name"
			:panel="subPanel"
			:buttons="buttons"
			@onDeletelPanel="
				() => {
					panel?.panels.splice(index, 1)
				}
			"
		/>
	</div>
	<div v-else class="panel readonly">
		<div class="panel-name">{{ panel.name }}</div>
		<div class="panel-items">
			<div v-for="(item, index) in panel?.items" :key="index" class="panel-item">
				<span>{{ item.name }}</span>
				<span class="flx mg-right-10">{{ item.value }}</span>
			</div>
		</div>
		<CustomizedPanelItem
			v-for="(subPanel, index) in panel?.panels"
			:key="subPanel.name"
			:panel="subPanel"
			:disabled="true"
		/>
	</div>
</template>
<style scoped lang="scss">
.panel {
	border-radius: 8px;
	border: 1px solid var(--z-line);
	margin-top: 10px;
	padding: 10px;

	&.readonly {
		border-left: 4px solid var(--z-main);
	}
}
.panel-name {
	align-items: center;
	display: flex;
}
.panel-item {
	align-items: center;
	border-radius: 4px;
	border: 1px solid var(--z-line);
	background-color: rgba(var(--z-bg-secondary-rgb), 0.5);
	display: flex;
	justify-content: space-between;
	margin-top: 10px;
	padding: 10px;

	span:nth-child(2) {
		color: var(--z-main);
		font-weight: 500;
		text-align: right;
	}
}
.delete-icon {
	cursor: pointer;
}
.btns {
	align-items: center;
	display: flex;
	margin-top: 10px;
	opacity: 1;
	transition: opacity 0.3s ease;
	> * {
		flex: 1;
	}
}
</style>
