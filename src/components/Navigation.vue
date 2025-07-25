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
		default: 0.15,
	},
	enableBuffer: {
		type: Boolean,
		default: true,
	},
	direction: {
		type: String,
		default: 'vertical', // horizontal 水平 vertical 垂直
	},
	count: {
		type: Number,
		default: 10,
	},
})

const route = useRoute()
const router = useRouter()
const navRef = ref()
const navItems = ref(props.items)
const active = ref(props.defaultActive)
const activeIndex = ref(0)
const badges = ref(props.badges)
const isCollapse = computed(() => props.collapse)

let currentScrollTop = 0
let animationFrameId = null
let isfirst = true

const onClickItem = (item, idx = 0) => {
	const isContinue = props.beforeRouter(item)
	activeIndex.value = idx

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

		// 如果不启用缓动，直接设置滚动位置
		if (!props.enableBuffer) {
			container.scrollTop = targetScrollTop
			return
		}

		// 如果是第一次，初始化当前滚动位置
		if (currentScrollTop === 0) {
			currentScrollTop = container.scrollTop
		}

		// 计算距离
		const distance = targetScrollTop - currentScrollTop

		// 根据距离调整速度（不分方向）
		const speed = Math.min(props.speed, props.speed / (Math.abs(distance) * 0.01))

		// 如果距离很小，直接到达目标位置
		if (Math.abs(distance) < 1) {
			container.scrollTop = targetScrollTop
			cancelAnimationFrame(animationFrameId)
			return
		}

		// 缓动效果
		currentScrollTop += distance * speed

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

const getItemChild = (item) => {
	if (item.id === active.value.id) {
		console.log(111, item, active.value)
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
	<el-aside
		width="170px"
		class="aside"
		:class="{collapse: isCollapse, horizontal: direction === 'horizontal'}"
	>
		<el-menu
			v-if="direction === 'vertical'"
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
							:name="item.icon"
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
							:name="item.icon"
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

		<div v-if="direction === 'horizontal'" class="horizontal-menu">
			<div
				v-for="(item, index) of navItems"
				class="item"
				:style="{width: `${100 / props.count}%`}"
				:class="{active: item[props.keys[0]] === active}"
				@click="onClickItem(item, index)"
			>
				{{ item[props.keys[1]] }}
				{{ getItemChild(item) }}
			</div>
			<span
				class="bar"
				:style="{
					width: `${100 / props.count / 2}%`,
					left: `${activeIndex * (100 / props.count) + 100 / props.count / 4}%`,
				}"
			></span>
		</div>
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

	&.horizontal {
		align-items: center;
		background-color: var(--z-theme);
		display: flex;
		flex: 1;
		height: 100%;
		overflow: hidden;
	}

	.horizontal-menu {
		align-items: center;
		display: flex;
		flex: 1;
		justify-content: flex-start;
		height: 100%;
		position: relative;

		.bar {
			top: 0px;
			border-radius: 5px;
			background-color: var(--z-primary);
			height: 5px;
			position: absolute;
			transition: all 0.15s ease-in-out;
		}

		.item {
			align-items: center;
			border-left: 1px solid var(--z-line);
			border-right: 1px solid var(--z-line);
			cursor: pointer;
			display: flex;
			font-size: 14px;
			justify-content: center;
			height: 50%;
			position: relative;
			z-index: 2;

			&.active {
				font-weight: bold;
			}

			&:not(:first-child) {
				margin-left: -1px;
			}
		}
	}

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
			.el-badge {
				padding: 0 0 0 2px;
			}
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
