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
	icons: {
		type: Array,
		default: () => [], // { name: 'IconName', path: 'icon-path', svg:'' }
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
const enabledCustom = ref(false) // 启用定制功能的状态

const onDeletePanel = (item, index) => {
	const newValue = [...props.modelValue]
	newValue.splice(index, 1)
	emits('update:modelValue', newValue)
}

const onDeleteItem = (childItem, index) => {
	childItem.splice(index, 1)
	emits('update:modelValue', [...props.modelValue])
}

let dragIndex = null
const dragOverIndex = ref(null)

const onDragStart = (index) => {
	dragIndex = index
}

const onDragOver = (index) => {
	if (dragOverIndex.value === index) return // 🔥 避免重复赋值
	if (index !== dragIndex) {
		dragOverIndex.value = index
	}
}

const onDragLeave = (index) => {
	// if (dragOverIndex.value === index) {
	// 	dragOverIndex.value = null
	// }
}

const onDrop = (index) => {
	if (dragIndex === null) return
	const list = [...props.modelValue]
	const [movedItem] = list.splice(dragIndex, 1)
	list.splice(index, 0, movedItem)
	emits('update:modelValue', list)

	dragIndex = null
	dragOverIndex.value = null
}

const onDropEnd = () => {
	dragIndex = null
	dragOverIndex.value = null
}

const getImage = (src) => {
	return new URL(`../assets/${src}`, import.meta.url).href
}

const iconPickerVisible = ref(false)
const iconPickerPosition = ref({top: 0, left: 0})
const currentEditingItem = ref(null)

const onChooseIcon = (event, item) => {
	event.stopPropagation()
	const rect = event.currentTarget.getBoundingClientRect()
	iconPickerPosition.value = {
		top: rect.bottom + 8,
		left: rect.left,
	}
	currentEditingItem.value = item
	iconPickerVisible.value = !iconPickerVisible.value
}

const onSelectIcon = (iconItem) => {
	if (currentEditingItem.value) {
		currentEditingItem.value.icon = iconItem.name
	}
	iconPickerVisible.value = false
}

const closeIconPicker = () => {
	iconPickerVisible.value = false
}

onMounted(() => {
	useMasonryWall(customRef, props.options)
	document.addEventListener('click', closeIconPicker)
})

onBeforeUnmount(() => {
	if (customRef.value) {
		customRef.value.destroy()
	}
	document.removeEventListener('click', closeIconPicker)
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
			<div
				v-for="(item, index) of modelValue"
				:key="item.id"
				:class="{'drag-over': dragOverIndex === index}"
				class="item"
				draggable="true"
				@dragstart="onDragStart(index)"
				@dragover.prevent="onDragOver(index)"
				@dragleave="onDragLeave(index)"
				@drop="onDrop(index)"
				@dragend="onDropEnd()"
			>
				<div class="handle"></div>
				<div class="panel-name">
					<div class="icon" @click="onChooseIcon($event, item)">
						<img
							v-if="item.icon"
							:src="getImage(icons.find((icon) => icon.name === item.icon)?.path)"
							:alt="item.alt"
							width="24"
							height="24"
						/>
						<span v-else class="placeholder-icon">图标</span>
					</div>
					<el-input v-model="item.name" placeholder="请输入面板名称"></el-input>
					<Icons
						name="Clear2"
						color="var(--z-danger)"
						class="delete-icon mg-left-5"
						@click.stop="onDeletePanel(item, index)"
					/>
				</div>

				<div class="panel-items">
					<div
						v-for="(childItem, index) in item?.items"
						:key="index"
						class="panel-item"
						@click="emits('clickItem', childItem)"
					>
						<span>{{ childItem?.name }}</span>
						<span class="flx mg-right-10">
							{{ childItem?.value || '-' }}
						</span>
						<span class="delete-icon">
							<Icons
								name="Clear2"
								color="var(--z-danger)"
								@click.stop="onDeleteItem(item?.items, index)"
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
			<div v-for="(item, index) in modelValue" :key="item.id" class="item">
				<slot :name="item.name">
					<div class="panel-name">
						<div class="icon">
							<img
								v-if="item.icon"
								:src="getImage(icons.find((icon) => icon.name === item.icon)?.path)"
								:alt="item.alt"
								width="24"
								height="24"
							/>
						</div>
						<div>
							{{ item.name }} <span>{{ item.count ? ` (${item.count})` : '' }}</span>
						</div>
					</div>
					<div class="panel-items">
						<div
							v-for="(childItem, index) in item?.items"
							:key="index"
							class="panel-item"
						>
							<span>{{ childItem?.name }}</span>
							<span class="flx">
								{{ childItem?.value }}
								<LoadingTransition
									v-if="childItem?.value === null || childItem?.value === ''"
									:static="true"
									text=""
									style="transform: translate(7px, 0)"
								/>
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
	<Teleport to="body">
		<div
			class="icons"
			v-show="iconPickerVisible"
			:style="{top: iconPickerPosition.top + 'px', left: iconPickerPosition.left + 'px'}"
			@click.stop
		>
			<div
				v-for="icon in icons"
				:key="icon.name"
				class="icon-item"
				:title="icon.name"
				@click="onSelectIcon(icon)"
			>
				<img :src="getImage(icon.path)" :alt="icon.name" width="24" height="24" />
			</div>
		</div>
	</Teleport>
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
	position: relative;
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

	.drag-over {
		transition: background-color 0.1s ease; /* 快速淡入淡出，不闪 */
		border: 2px dashed var(--z-main); /* 蓝色虚线 */
		opacity: 0.5;
		background-color: rgba(64, 158, 255, 0.1); /* 半透明高亮 */
	}

	.pointer-events {
		pointer-events: none; /* 禁止所有交互 */
	}
}
.panel-name {
	align-items: center;
	cursor: pointer;
	display: flex;
	font-size: 14px;
	font-weight: 500;

	span {
		color: var(--z-main);
	}

	.placeholder-icon {
		border-radius: 4px;
		border: 1px dashed var(--z-main);
		background-color: rgba(var(--z-main-rgb), 0.1);
		font-size: 8px;
		height: 24px;
		line-height: 24px;
		width: 24px;
	}
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
<style lang="scss">
.icons {
	background-color: var(--z-theme);
	border-radius: 8px;
	border: 1px solid var(--z-line);
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	max-height: 200px;
	overflow-y: auto;
	padding: 8px;
	position: fixed;
	width: 220px;
	z-index: 9999;

	.icon-item {
		align-items: center;
		border-radius: 6px;
		cursor: pointer;
		display: flex;
		justify-content: center;
		padding: 4px;
		transition: background-color 0.2s;

		&:hover {
			background-color: rgba(var(--z-main-rgb), 0.15);
		}
	}
}
</style>
