<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import CustomizedPanelItem from './CustomizedPanelItem.vue'
import useMasonryWall from '@/hooks/useMasonryWall'

const props = defineProps({
	modelValue: {
		type: Array,
		default: () => [],
		/**
		 * [
		 *      {
		 *          name: 'Item 1',
		 *          panels:[
		 *              {name: 'Sub Panel 1', panels: [], items: []},
		 *              {name: 'Sub Panel 2', panels: [], items: []},
		 *          ]
		 *          items:[{name:'table', value:0}]
		 *      }
		 * ],
		 */
	},
	height: {
		type: [String, Number],
		default: 'calc(100% - 30px)',
	},

	buttons: {
		type: Array,
		default: () => [], // { name: 'Button 1', action: () => {}}
	},
	options: {
		type: Object,
		default: () => ({minColWidth: 310, gap: 10}), // 其他配置项
	},
})

const emits = defineEmits(['update:modelValue', 'clickItem'])

const customRef = ref(null)

const panelHeight = computed(() => {
	if (typeof props.height === 'number') {
		return `${props.height}px`
	}
	return props.height
})
const enabledCustom = ref(true) // 启用定制功能的状态

const onDeletePanel = (item, index) => {
	const newValue = [...props.modelValue]
	newValue.splice(index, 1)
	emits('update:modelValue', newValue)
}

const onDeleteItem = (childItem, index) => {
	childItem.splice(index, 1)
	emits('update:modelValue', [...props.modelValue])
}

onMounted(() => {
	useMasonryWall(customRef, props.options)
})

onBeforeUnmount(() => {
	if (customRef.value) {
		customRef.value.destroy()
	}
})

defineExpose({
	enabledCustom: (bool) => (enabledCustom.value = bool),
	refresh: () => {
		useMasonryWall(customRef, props.options)
	},
})
</script>
<template>
	<div ref="customRef" class="customized-panel" :style="{height: panelHeight}">
		<template v-if="enabledCustom">
			<!-- 定制功能的内容 -->
			<div v-for="(item, index) of modelValue" :key="item.index" class="item">
				<div class="handle"></div>
				<div class="panel-name">
					<el-input v-model="item.name" placeholder="请输入面板名称"></el-input>
					<Icons
						name="Clear2"
						color="var(--z-danger)"
						class="delete-icon mg-left-5"
						@click="onDeletePanel(item, index)"
					/>
				</div>

				<div class="panel-items">
					<div
						v-for="(childItem, index) in item?.items"
						:key="item.name"
						class="panel-item"
						@click="emits('clickItem', childItem)"
					>
						<span>{{ childItem.name }}</span>
						<span class="flx mg-right-10">
							{{ childItem.value || '-' }}
						</span>
						<span class="delete-icon">
							<Icons
								name="Clear2"
								color="var(--z-danger)"
								@click="onDeleteItem(item?.items, index)"
							/>
						</span>
					</div>
				</div>

				<slot :name="`edit-${item.name}`" :item="item">
					<CustomizedPanelItem
						v-for="(panel, index) in item?.panels"
						:panel="panel"
						:buttons="buttons"
						@onDeletelPanel="
							() => {
								item.panels.splice(index, 1)
							}
						"
						@clickItem="(subItem) => emits('clickItem', subItem)"
					/>
				</slot>

				<div class="btns">
					<el-button
						v-for="button in buttons"
						:key="button.name"
						size="small"
						type="primary"
						@click="
							() => {
								button.action(item)
							}
						"
					>
						{{ button.name }}
					</el-button>
				</div>
			</div>
		</template>
		<template v-else>
			<div v-for="(item, index) in modelValue" :key="index" class="item">
				<slot :name="item.name">
					<div class="panel-name">
						<div>{{ item.name }}</div>
					</div>
					<div class="panel-items">
						<div
							v-for="(childItem, index) in item?.items"
							:key="item.name"
							class="panel-item"
						>
							<span>{{ childItem.name }}</span>
							<span class="flx mg-right-10">
								{{ childItem.value }}
								<LoadingTransition v-if="!childItem.value" :static="true" text="" />
							</span>
						</div>
					</div>
					<slot :name="`${item.name}`" :item="item">
						<CustomizedPanelItem
							v-for="(panel, index) in item?.panels"
							:panel="panel"
							:disabled="true"
						/>
					</slot>
				</slot>
			</div>
		</template>
		<slot name="default"></slot>
	</div>
</template>
<style scoped lang="scss">
.customized-panel {
	background-color: #f0f0f0;
	border: 1px solid #ccc;
	border-radius: 8px;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	overflow: hidden;
	overflow-y: auto;
	padding: 10px;
	width: 100%;
	user-select: none;

	.item {
		border-radius: 8px;
		background-color: var(--z-theme);
		break-inside: avoid;
		margin-bottom: 10px;
		padding: 10px;
		transition: box-shadow 0.3s ease;
		overflow: hidden;
		position: relative;

		&:hover {
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		}

		.handle {
			cursor: move;
			height: 10px;
			left: 0;
			position: absolute;
			top: 0;
			width: 100%;
			&:hover {
				border-top: 4px solid rgba(var(--z-main-rgb), 1);
			}
		}
	}
}
.panel-name {
	align-items: center;
	cursor: pointer;
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
		align-items: center;
		color: var(--z-main);
		display: flex;
		font-weight: 500;
		justify-content: flex-end;
		text-align: right;
	}
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
