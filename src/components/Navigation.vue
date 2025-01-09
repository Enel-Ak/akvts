<script setup>
import {computed, onBeforeUnmount, onMounted, watch, ref, nextTick} from 'vue'
import {useRouter, useRoute} from 'vue-router'

const emits = defineEmits(['clickItem', 'update:modelValue'])
const props = defineProps({
	modelValue: {
		type: String,
		default: '',
	},
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
	badges: {
		type: Object,
		default: {},
	},
	containerClass: {
		type: String,
		default: 'container-aside',
	},
	speed: {
		type: Number,
		default: 0.05,
	},
})

const route = useRoute()
const router = useRouter()
const navRef = ref()
const navItems = ref(props.items)
const active = ref(props.defaultActive)
const badges = ref(props.badges)
const isCollapse = computed(() => props.collapse)

let currentScrollTop = 0
let animationFrameId = null
let isfirst = true

const onClickItem = (item) => {
	console.log('Navigation Click:', item)
	const isContinue = props.beforeRouter(item)

	if (isContinue) {
		emits('update:modelValue', item[props.keys[0]])
		emits('clickItem', item)
		if (item.path) {
			active.value = item[props.keys[0]]
			router.push({
				path: item.path,
			})
		}
	}
}

const animation = () => {
	const target = document.querySelector(`[data-nav-id="${active.value}"]`)
	const container = target?.closest('.' + props.containerClass)

	if (target && container) {
		// 获取目标元素在容器中的位置
		const targetRect = target.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()

		// 计算目标元素顶部相对于容器顶部的实际偏移量
		const targetScrollTop = targetRect.top - containerRect.top + container.scrollTop

		// 如果是第一次，初始化当前滚动位置
		if (currentScrollTop === 0) {
			currentScrollTop = container.scrollTop
		}

		// 计算距离
		const distance = targetScrollTop - currentScrollTop

		// 如果距离很小，直接到达目标位置
		if (Math.abs(distance) < 1) {
			container.scrollTop = targetScrollTop
			cancelAnimationFrame(animationFrameId)
			return
		}

		// 缓动效果
		currentScrollTop += distance * props.speed

		// 应用滚动
		container.scrollTop = currentScrollTop

		// 继续动画
		animationFrameId = requestAnimationFrame(animation)
	}
}

// 重置滚动位置
const resetScroll = () => {
	currentScrollTop = 0
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
	}
}

// 修改 delayAnimation
const delayAnimation = () => {
	setTimeout(
		() => {
			isfirst = false
			resetScroll()
			requestAnimationFrame(animation)
		},
		isfirst ? 256 : 0
	)
}

watch(
	() => props.items,
	(newVal) => {
		navItems.value = newVal
	},
	{deep: true}
)

watch(
	() => props.badges,
	(newVal) => {
		badges.value = newVal
	},
	{deep: true}
)

watch(
	() => props.modelValue,
	(newVal) => {
		active.value = newVal
		nextTick(() => delayAnimation())
	},
	{immediate: true}
)

onMounted(() => {})

onBeforeUnmount(() => {
	navItems.value = []
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
	}
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
					:data-nav-id="item[props.keys[0]]"
					@click="onClickItem(item)"
				>
					<el-icon>
						<Icons
							:svg="item.iconSvg"
							:icon-name="item.icon"
							color="var(--z-nav-font-color)"
						></Icons>
					</el-icon>

					<template #title>
						<el-badge
							:value="badges?.[item[props.keys[1]]]"
							:hidden="badges?.[item[props.keys[1]]] === 0"
							:offset="[26, 27]"
							:max="99"
						>
							{{ item[props.keys[1]] }}
						</el-badge>
					</template>
				</el-menu-item>

				<el-sub-menu
					v-if="
						item.children &&
						item.children.length > 0 &&
						(item.hasOwnProperty('enable') ? item.enable : true)
					"
					:index="item[props.keys[0]]"
					:data-nav-id="item[props.keys[0]]"
				>
					<template #title>
						<Icons
							:svg="item.iconSvg"
							:icon-name="item.icon"
							color="var(--z-nav-font-color)"
							style="margin-left: 3px; margin-right: 8px"
						></Icons>
						<span>{{ item[props.keys[1]] }}</span>
					</template>

					<template v-for="subItem of item.children">
						<el-menu-item
							v-if="!subItem.children || subItem.children.length === 0"
							:index="subItem[props.keys[0]]"
							:data-nav-id="subItem[props.keys[0]]"
							@click="onClickItem(subItem)"
						>
							<template #title>
								<span class="subItem-menu">
									<el-badge
										:value="badges?.[subItem[props.keys[1]]]"
										:hidden="badges?.[subItem[props.keys[1]]] === 0"
										:offset="[26, 24]"
										:max="99"
										class="subitem-menu"
									>
										{{ subItem[props.keys[1]] }}
									</el-badge>
								</span>
							</template>
						</el-menu-item>

						<el-sub-menu
							v-if="subItem.children && subItem.children.length > 0"
							:index="subItem[props.keys[0]]"
							:data-nav-id="subItem[props.keys[0]]"
						>
							<template #title>
								<span>
									<el-badge
										:value="badges?.[subItem[props.keys[1]]]"
										:hidden="badges?.[subItem[props.keys[1]]] === 0"
										:offset="[26, 27]"
										:max="99"
									>
										{{ subItem[props.keys[1]] }}
									</el-badge>
								</span>
							</template>

							<template v-for="subSubItem of subItem.children">
								<el-menu-item
									:index="subSubItem[props.keys[0]]"
									@click="onClickItem(subSubItem)"
								>
									<template #title>
										<el-badge
											:value="badges?.[subSubItem[props.keys[1]]]"
											:hidden="badges?.[subSubItem[props.keys[1]]] === 0"
											:offset="[26, 27]"
											:max="99"
										>
											{{ subSubItem[props.keys[1]] }}
										</el-badge>
									</template>
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
