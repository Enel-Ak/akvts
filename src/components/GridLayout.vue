<script setup>
import {computed, nextTick, onMounted, onUnmounted, ref, watch, toRaw} from 'vue'
import {GridStack} from 'gridstack'
import 'gridstack/dist/gridstack.min.css'

const emits = defineEmits(['clickItem', 'change'])
const props = defineProps({
	props: {
		type: Array,
		default: () => [
			{
				prop: 'default',
				x: 0,
				y: 0,
				w: 4,
				h: 4,
				option: {},
				config: {},
				content: 'Item 1',
			},
		],
	},
	overflow: {
		type: Array,
		default: () => ['hidden', 'hidden'], // x, y
	},
})

const grid = ref()
const gridProps = computed(() => props.props)
const previousProps = ref([])
const activeItem = ref(null)

// 比较两个数组，找出新增、删除和更新的项目
const diffProps = (newProps, oldProps) => {
	const oldMap = new Map(oldProps.map((item) => [item.prop, item]))
	const newMap = new Map(newProps.map((item) => [item.prop, item]))

	const added = newProps.filter((item) => !oldMap.has(item.prop))
	const removed = oldProps.filter((item) => !newMap.has(item.prop))
	const updated = newProps.filter((item) => {
		const oldItem = oldMap.get(item.prop)
		return (
			oldItem &&
			(oldItem.x !== item.x ||
				oldItem.y !== item.y ||
				oldItem.w !== item.w ||
				oldItem.h !== item.h ||
				JSON.stringify(oldItem.option) !== JSON.stringify(item.option) ||
				JSON.stringify(oldItem.config) !== JSON.stringify(item.config) ||
				oldItem.content !== item.content)
		)
	})

	return {added, removed, updated}
}

// 更新 GridStack 而不重新初始化
const updateGridStack = (newProps, oldProps) => {
	if (!grid.value) return

	const {added, removed, updated} = diffProps(newProps, oldProps)

	// 移除不存在的项目
	removed.forEach((item) => {
		const element = document.querySelector(`[gs-id="${item.prop}"]`)
		if (element) {
			grid.value.removeWidget(element, false)
		}
	})

	// 更新现有项目的位置和大小
	updated.forEach((item) => {
		const element = document.querySelector(`[gs-id="${item.prop}"]`)
		if (element) {
			grid.value.update(element, {
				x: item.x,
				y: item.y,
				w: item.w,
				h: item.h,
			})
		}
	})

	// 等待 DOM 更新后添加新项目
	nextTick(() => {
		added.forEach((item) => {
			const element = document.querySelector(`[gs-id="${item.prop}"]`)
			if (element) {
				grid.value.makeWidget(element)
			}
		})

		// 重新整理布局
		grid.value.compact()
	})
}

watch(
	gridProps,
	(newProps, oldProps) => {
		if (grid.value && oldProps) {
			updateGridStack(newProps, previousProps.value)
		}
		previousProps.value = [...newProps]
	},
	{deep: true}
)

const onClickItem = (item) => {
	if (activeItem.value?.prop === item.prop) {
		activeItem.value = null
		emits('clickItem', null)
	} else {
		activeItem.value = item
		emits('clickItem', item)
	}
}

const changeGridStack = (event, items) => {
	emits(
		'change',
		event,
		items.map((item) => toRaw(item))
	)
}

onMounted(() => {
	grid.value = GridStack.init()
	grid.value.on('change', changeGridStack)
	previousProps.value = [...gridProps.value]
})

onUnmounted(() => {
	grid.value.off('change', changeGridStack)
})

defineExpose({
	getGrid: () => grid.value,
	updateLayout: () => {
		if (grid.value) {
			grid.value.compact()
		}
	},
})
</script>
<template>
	<div class="grid-component">
		<div class="grid-stack">
			<div
				v-for="prop in gridProps"
				:key="prop.prop"
				:gs-id="prop.prop"
				:gs-x="prop.x"
				:gs-y="prop.y"
				:gs-w="prop.w"
				:gs-h="prop.h"
				class="grid-stack-item"
			>
				<div
					class="grid-stack-item-content"
					:class="{active: activeItem?.prop === prop.prop}"
					:style="{
						overflowX: props.overflow[0],
						overflowY: props.overflow[1],
					}"
					@click="onClickItem(prop)"
				>
					<slot :name="`grid-${prop.prop}`" :item="prop">
						{{ prop.content }}
					</slot>
				</div>
			</div>
		</div>
	</div>
</template>
<style lang="css" scoped>
.grid-stack {
	border-radius: 5px;
	border: 1px solid var(--z-line);
	background: var(--z-bg-secondary);
}
.grid-stack-item-content {
	border-radius: 5px;
	background-color: var(--z-theme);
	padding: 0 10px;
	transition: all 0.3s ease;

	&.active {
		box-shadow: 0 0 0px 3px rgba(var(--z-main-rgb), 0.7);
	}
}
</style>
