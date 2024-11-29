<script setup>
import {ref} from 'vue'
const emits = defineEmits(['clickItem'])
const props = defineProps({
	data: {
		type: Array,
		default: () => [],
	},
	expand: {
		type: Array,
		default: () => [],
	},
	height: {
		type: String,
		default: 'inherit',
	},
	enableTopShadow: {
		type: Boolean,
		default: false,
	},
})
const collapseActive = ref(props.expand)
const active = ref(props.data[0].children[0].name)

const onClickCollapseItem = (item) => {
	active.value = item.name
	emits('clickItem', item)
}
</script>
<template>
	<el-scrollbar :height="height" :class="{shadow: enableTopShadow}" class="collapse-component">
		<el-collapse v-model="collapseActive" v-bind="$attrs" class="collapse">
			<el-collapse-item :name="item.name" v-for="item of data">
				<template #title>
					<slot :name="item.name">
						<el-icon class="icon" :class="item.icon"></el-icon>
						{{ item.label }}
					</slot>
				</template>
				<ul>
					<li
						v-for="child of item.children"
						:class="{active: child.name === active}"
						@click="onClickCollapseItem(child)"
					>
						<slot :name="child.name">{{ child.label }}</slot>
					</li>
				</ul>
			</el-collapse-item>
		</el-collapse>
	</el-scrollbar>
</template>
<style scoped lang="scss">
.collapse-component {
	&.shadow::before {
		content: '';
		border-radius: 100%;
		border-bottom: 1px solid var(--z-line);
		box-shadow: 0 0 7px 1px rgba(0, 0, 0, 0.7);
		background-color: var(--z-bg);
		height: 0;
		left: torem(2px);
		position: absolute;
		top: 0;
		width: calc(100% - torem(4px));
		z-index: 1;
	}

	&.shadow::after {
		content: '';
		bottom: 0;
		border-radius: 100%;
		border-bottom: 1px solid var(--z-line);
		box-shadow: 0 0 7px 1px rgba(0, 0, 0, 0.7);
		background-color: var(--z-bg);
		height: 0;
		left: torem(2px);
		position: absolute;

		width: calc(100% - torem(4px));
		z-index: 1;
	}

	.collapse {
		border: 1px solid var(--z-line);
		// margin-right: torem(10px);
		// margin-left: torem(10px);

		:deep(button) {
			padding-left: torem(10px);
		}
		:deep(.el-collapse-item__header) {
			background-color: var(--z-bg-secondary);
			border-bottom-color: var(--z-line);
			color: var(--z-font-color);
			transition: border 0.15s 0.2s linear;
			&.is-active {
				border-bottom: transparent;
			}
		}
		:deep(.el-collapse-item__wrap) {
			background-color: var(--z-theme);
			border-bottom-color: var(--z-line);
		}
		:deep(.el-collapse-item__content) {
			padding-bottom: 0;
		}

		li {
			border-top: 1px solid var(--z-line);
			background-color: var(--z-theme);
			cursor: pointer;
			color: var(--z-font-color);
			height: torem(40px);
			line-height: torem(40px);
			padding-left: torem(40px);
			transition: all 0.15s ease-in-out;
			&:hover {
				background-color: rgba($color: var(--z-nav-hover-rgb), $alpha: 0.05);
			}
			&.active {
				background-color: rgba($color: var(--z-nav-font-active-rgb), $alpha: 1);
				color: var(--z-font-color-secondary);
				font-weight: 500;
			}
		}
	}
}
</style>
