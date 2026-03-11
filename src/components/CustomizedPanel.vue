<script setup>
import {computed, onMounted, ref} from 'vue'
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
})

const emits = defineEmits(['update:modelValue'])

const customRef = ref(null)

const panelHeight = computed(() => {
	if (typeof props.height === 'number') {
		return `${props.height}px`
	}
	return props.height
})
const enabledCustom = ref(true) // 启用定制功能的状态

onMounted(() => {
	useMasonryWall(customRef, {minColWidth: 240, gap: 10})
})

defineExpose({
	enabledCustom: (bool) => (enabledCustom.value = bool),
})
</script>
<template>
	<div ref="customRef" class="customized-panel" :style="{height: panelHeight}">
		<template v-if="enabledCustom">
			<!-- 定制功能的内容 -->
			<div v-for="item of modelValue" :key="item.name" class="item">
				<div class="panel-name">
					<el-input v-model="item.name" placeholder="请输入面板名称"></el-input>
				</div>
				<slot :name="`edit-${item.name}`" :item="item">
					<CustomizedPanelItem :panel="item" :buttons="buttons" />
				</slot>
			</div>
		</template>
		<template v-else>
			<div v-for="(item, index) in modelValue" :key="index" class="item">
				<slot :name="item.name">
					{{ item.name }}
				</slot>
			</div>
		</template>
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

	.item {
		border-radius: 8px;
		background-color: var(--z-theme);
		break-inside: avoid;
		margin-bottom: 10px;
		padding: 10px;
		transition: box-shadow 0.3s ease;

		&:hover {
			box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
		}
	}
}
</style>
