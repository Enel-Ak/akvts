<script setup>
import {computed, onBeforeUnmount, onMounted, watch, ref} from 'vue'
import {useRouter, useRoute} from 'vue-router'

const emits = defineEmits(['clickItem'])
const props = defineProps({
	collapse: Boolean,
	items: Object,
	defaultActive: {
		type: String,
		default: '',
	},
	defaultOpeneds: {
		type: Array,
		default: [],
	},
	beforeRouter: {
		type: Function,
		default: () => true,
	},
	keys: {
		type: Array,
		default: ['id', 'label'],
	},
})

const route = useRoute()
const router = useRouter()
const navRef = ref()
const navItems = ref(props.items)
const active = ref(props.defaultActive)
const isCollapse = computed(() => props.collapse)

const onClickItem = (item) => {
	console.log('Navigation Click:', item)
	const isContinue = props.beforeRouter(item)

	if (isContinue) {
		emits('clickItem', item)
		if (item.path) {
			active.value = item[props.keys[0]]
			router.push({
				path: item.path,
				query: {
					_l: item[props.keys[1]],
				},
			})
		}
	}
}

watch(
	() => props.items,
	(newVal) => {
		navItems.value = newVal
	},
	{deep: true}
)

watch(
	() => route,
	(to) => {
		const id = (arr) => {
			for (let i of arr) {
				if (i.label === to.query._l) {
					return i.id
				}
				if (i.children) {
					return id(i.children)
				}
			}
		}
		active.value = id(navItems.value)
	},
	{deep: true, immediate: true}
)

onMounted(() => {})

onBeforeUnmount(() => {
	navItems.value = []
})
</script>
<template>
	<el-aside width="170px" class="aside" :class="{collapse: isCollapse}">
		<el-menu
			ref="navRef"
			v-bind="$attrs"
			text-color="var(--z-bg)"
			active-text-color="var(--z-nav-font-active)"
			background-color="var(--z-main)"
			:collapse="isCollapse"
			:default-active="active"
			:default-openeds="defaultOpeneds"
		>
			<template v-for="item of navItems">
				<el-menu-item
					v-if="
						(!item.children || item.children.length === 0) &&
						(item.hasOwnProperty('enable') ? item.enable : true)
					"
					:index="item[props.keys[0]]"
					@click="onClickItem(item)"
				>
					<el-icon>
						<Icons :icon-name="item.icon" color="var(--z-nav-font-color)"></Icons>
					</el-icon>

					<template #title> {{ item[props.keys[1]] }} </template>
				</el-menu-item>

				<el-sub-menu
					v-if="
						item.children &&
						item.children.length > 0 &&
						(item.hasOwnProperty('enable') ? item.enable : true)
					"
					:index="item[props.keys[0]]"
				>
					<template #title>
						<Icons
							:icon-name="item.icon"
							color="var(--z-nav-font-color)"
							style="margin-left: 4px; margin-right: 7px"
						></Icons>
						<span>{{ item[props.keys[1]] }}</span>
					</template>

					<template v-for="subItem of item.children">
						<el-menu-item
							v-if="!subItem.children || subItem.children.length === 0"
							:index="subItem[props.keys[0]]"
							@click="onClickItem(subItem)"
						>
							<template #title>
								<span class="subItem-menu">{{ subItem[props.keys[1]] }}</span>
							</template>
						</el-menu-item>

						<el-sub-menu
							v-if="subItem.children && subItem.children.length > 0"
							:index="subItem[props.keys[0]]"
						>
							<template #title>
								<span>{{ subItem[props.keys[1]] }}</span>
							</template>

							<template v-for="subSubItem of subItem.children">
								<el-menu-item
									:index="subSubItem[props.keys[0]]"
									@click="onClickItem(subSubItem)"
								>
									<template #title> {{ subSubItem[props.keys[1]] }} </template>
								</el-menu-item>
							</template>
						</el-sub-menu>
					</template>
				</el-sub-menu>
			</template>
		</el-menu>
	</el-aside>
</template>
<style scoped lang="scss">
@keyframes opacityA {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
@keyframes opacityB {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
.aside {
	animation: opacityA 0.15s 0.3s ease-in-out forwards;
	background-color: var(--z-main);
	opacity: 0;

	&.collapse {
		animation: opacityB 0.15s 0.3s ease-in-out forwards;
		opacity: 0;
		width: torem(60px);

		:deep(.el-menu--collapse) {
			width: 60px;
		}

		:deep(.el-menu-item .el-menu-tooltip__trigger),
		:deep(.el-sub-menu__title) {
			padding: 0 torem(18px);
		}
	}

	:deep(.el-menu) {
		border-right: none;

		.el-menu {
			overflow: hidden;
		}

		.el-sub-menu > .el-menu > .el-menu-item {
			padding-left: 50px;
		}

		.el-menu > li > div,
		.el-menu > li > ul li {
			padding-left: calc(
				var(--el-menu-base-level-padding) + var(--el-menu-level) *
					var(--el-menu-level-padding) + 10px
			);
		}
	}
	:deep(.el-sub-menu__icon-arrow) {
		margin-top: -7px;
	}
}
</style>
