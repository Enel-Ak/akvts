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
const emits = defineEmits(['onDeletelPanel', 'clickItem'])

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
				@click.stop="onDeletelPanel"
			/>
		</div>
		<div class="panel-items">
			<div
				v-for="(item, index) in panel?.items"
				:key="item.id"
				class="panel-item"
				@click="emits('clickItem', item)"
			>
				<span>{{ item.name }}</span>
				<span class="flx mg-right-10">{{ item.value || '-' }}</span>
				<span class="delete-icon">
					<Icons
						name="Clear2"
						color="var(--z-danger)"
						@click.stop="
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
			@clickItem="(subItem) => emits('clickItem', subItem)"
		/>
	</div>
	<div v-else class="panel readonly">
		<div class="panel-name">{{ panel.name || '未命名' }}</div>
		<div class="panel-items">
			<div v-for="(item, index) in panel?.items" :key="item.id" class="panel-item">
				<span>{{ item?.name || '-' }}</span>
				<span class="flx mg-right-10">
					{{ item?.value }}
					<LoadingTransition
						v-if="item?.value === null || item?.value === ''"
						:static="true"
						text=""
					/>
				</span>
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
	position: relative;

	&.readonly {
		border-left: 4px solid var(--z-main);
	}
}
.panel-name {
	align-items: center;
	display: flex;
	font-size: 14px;
	font-weight: 500;
}
.panel-item {
	align-items: center;
	border-radius: 4px;
	border: 1px solid var(--z-line);
	background-color: rgba(var(--z-bg-secondary-rgb), 0.5);
	display: flex;
	line-height: 1.5;
	justify-content: space-between;
	margin-top: 10px;
	padding: 10px;

	span:nth-child(1) {
		padding-right: 10px;
	}

	span:nth-child(2) {
		align-items: center;
		color: var(--z-main);
		display: flex;
		font-weight: 500;
		justify-content: flex-end;
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
