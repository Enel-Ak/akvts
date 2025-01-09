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
})

const route = useRoute()
const router = useRouter()
const navRef = ref()
const navItems = ref(props.items)
const active = ref(props.defaultActive)
const badges = ref(props.badges)
const isCollapse = computed(() => props.collapse)

let currentScrollTop = 0
let targetScrollTop = 0
let animationFrameId = null

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
	const targetElement = document.querySelector(`[data-nav-id="${active.value}"]`)
	const referenceElement = targetElement?.closest('.container-aside')

	if (targetElement && referenceElement) {
		const targetRect = targetElement.getBoundingClientRect()
		const referenceRect = referenceElement.getBoundingClientRect()
		const relativeTop = targetRect.top - referenceRect.top

		// 设置目标滚动位置
		targetScrollTop = relativeTop

		// 计算当前滚动位置与目标位置的差距
		const distance = targetScrollTop - currentScrollTop

		// 如果差距足够小，直接到达目标位置
		if (Math.abs(distance) < 0.5) {
			currentScrollTop = targetScrollTop
			referenceElement.scrollTop = currentScrollTop
			cancelAnimationFrame(animationFrameId)
			return
		}

		// 使用缓动函数计算新的滚动位置
		currentScrollTop += distance * 0.15 // 这里的 0.15 是缓动系数，可以调整来改变动画速度

		// 应用新的滚动位置
		referenceElement.scrollTop = currentScrollTop

		// 继续动画
		animationFrameId = requestAnimationFrame(animation)
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
		nextTick(() => requestAnimationFrame(animation))
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
