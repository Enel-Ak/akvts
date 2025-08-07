<script setup>
import {computed, onBeforeUnmount, onMounted, watch, ref, nextTick, h, Teleport} from 'vue'
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
const flat = computed(() => {
	return navItems.value.reduce((pre, cur) => {
		if (cur.children && cur.children.length > 0) {
			pre.push(cur)
			pre.push(...cur.children)
		}
		return pre
	}, [])
})
const active = ref(props.defaultActive)
const activeIndex = ref(0)
const activeChild = ref(null)
const badges = ref(props.badges)
const isChildMenuAnimating = ref(false)
const isCollapse = computed(() => props.collapse)
const isOpen = ref(false)
// 多级菜单状态管理
const activeMultiLevelMenus = ref(new Map()) // 存储多级菜单的显示状态
const isClickHiding = ref(false)

let currentScrollTop = 0
let animationFrameId = null
let isfirst = true

const onClickItem = (item, idx = 0) => {
	const isContinue = props.beforeRouter(item)
	activeIndex.value = idx

	if (isContinue) {
		emits('update:modelValue', item[props.keys[0]])
		emits('clickItem', item)

		nextTick(() => {
			// 处理子菜单显示/隐藏逻辑
			if (item.children && item.children.length > 0) {
				// 如果点击的是同一个菜单项，则切换显示状态
				if (activeChild.value === item[props.keys[0]]) {
					// 隐藏子菜单动画
					hideChildMenu()
				} else {
					// 如果当前有其他菜单显示，先隐藏再显示新菜单
					if (activeChild.value && activeChild.value !== item[props.keys[0]]) {
						// 立即切换到新菜单，不需要等待隐藏动画
						activeChild.value = item[props.keys[0]]
					} else {
						// 显示子菜单动画
						showChildMenu(item[props.keys[0]])
					}
				}
			} else {
				// 如果没有子菜单，隐藏当前显示的子菜单
				if (activeChild.value) {
					hideChildMenu()
				}

				// 如果有路径，进行路由跳转
				if (item.path) {
					router.push({
						path: item.path,
					})
				}
			}
		})
	}
}

// 显示子菜单动画
const showChildMenu = (itemId) => {
	// 如果正在因点击而隐藏菜单，不执行显示操作
	if (isClickHiding.value) {
		return
	}

	// 如果要显示的菜单已经是当前活动菜单，直接返回
	if (activeChild.value === itemId && !isChildMenuAnimating.value) {
		return
	}

	// 立即设置新的活动菜单
	activeChild.value = itemId
	isChildMenuAnimating.value = true

	// 等待下一帧再结束动画
	nextTick(() => {
		isChildMenuAnimating.value = false
	})
}

// 隐藏子菜单动画
const hideChildMenu = () => {
	// 清空所有多级菜单
	clearAllMultiLevelMenus()

	// 立即清除活动菜单，避免状态冲突
	activeChild.value = null
	isChildMenuAnimating.value = true

	// 缩短动画时间，避免切换时的延迟问题
	isChildMenuAnimating.value = false
	isClickHiding.value = true

	// 延迟重置点击隐藏标志，防止立即重新显示
	setTimeout(() => {
		isClickHiding.value = false
	}, 200)
}

// 显示多级菜单
const showMultiLevelMenu = (menuId, level = 1) => {
	activeMultiLevelMenus.value.set(menuId, {level, visible: true})
}

// 隐藏多级菜单
const hideMultiLevelMenu = (menuId) => {
	activeMultiLevelMenus.value.delete(menuId)
	// 递归隐藏子菜单
	for (const [key, value] of activeMultiLevelMenus.value.entries()) {
		if (key.startsWith(menuId + '-')) {
			activeMultiLevelMenus.value.delete(key)
		}
	}
}

// 清空所有多级菜单
const clearAllMultiLevelMenus = () => {
	activeMultiLevelMenus.value.clear()
}

// 检查菜单是否会超出屏幕
const checkMenuOverflow = (rect, menuWidth = 200) => {
	const screenWidth = window.innerWidth
	const rightSpace = screenWidth - rect.right
	return rightSpace < menuWidth
}

const animation = () => {
	const target = document.querySelector(`[data-nav-id="${activeChild.value}"]`)
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

const getItemChild = (item, index, level = 1, parentId = '') => {
	const menuId = parentId ? `${parentId}-${item.id}` : item.id
	const shouldShow =
		level === 1 ? item.id === activeChild.value : activeMultiLevelMenus.value.has(menuId)

	if (shouldShow && item.children && !isOpen.value) {
		const getCurrentMenuPosition = () => {
			let menuElement
			if (level === 1) {
				// 一级菜单使用原来的选择器
				menuElement = document.querySelector(`.item[data-item-id="${item.id}"]`)
			} else {
				// 多级菜单使用新的选择器
				menuElement = document.querySelector(`[data-menu-id="${menuId}"]`)
			}

			if (menuElement) {
				const rect = menuElement.getBoundingClientRect()
				const menuWidth = 200 // 预估菜单宽度

				if (level === 1) {
					// 一级菜单在下方显示
					return {
						left: rect.left,
						top: rect.bottom,
						width: rect.width,
						isOverflow: false,
					}
				} else {
					// 二级及以上菜单在右侧或左侧显示
					const isOverflow = checkMenuOverflow(rect, menuWidth)

					return {
						left: isOverflow
							? rect.left - rect.width - menuWidth * 2 + 35
							: rect.left - menuWidth + 12,
						top: rect.top,
						width: menuWidth,
						isOverflow,
					}
				}
			}
			return {left: 0, top: 0, width: 200, isOverflow: false}
		}

		const position = getCurrentMenuPosition()

		// 处理鼠标移入事件
		const handleMouseEnter = (childItem) => {
			if (childItem.children && childItem.children.length > 0) {
				const childMenuId = `${menuId}-${childItem.id}`
				// 显示子菜单
				showMultiLevelMenu(childMenuId, level + 1)
			}
		}

		// 处理鼠标移出事件
		const handleMouseLeave = (childItem) => {
			if (childItem.children && childItem.children.length > 0) {
				const childMenuId = `${menuId}-${childItem.id}`
				// 设置延迟隐藏
				hideMultiLevelMenu(childMenuId)
			}
		}

		return h(
			'ul',
			{
				class: ['navigation-component-child', 'item-child'],
				style: {
					// 动态位置样式
					left: `${position.left}px`,
					top: level === 1 ? '0px' : `${position.top}px`,
					width: level === 1 ? `${position.width}px` : '100%',
					zIndex: 9999 + level,
					// 动画状态样式
					transform:
						isChildMenuAnimating.value && level === 1
							? 'scaleY(0) translateY(-10px)'
							: level === 1
							? 'scaleY(1) translateY(0)'
							: 'scale(1)',
					opacity: isChildMenuAnimating.value && level === 1 ? 0 : 1,
					// 保持原有的过渡效果
					transition: level === 1 ? 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
				},
				onMouseleave: level === 1 ? () => hideChildMenu() : undefined,
			},
			item.children.map((child) => {
				const childMenuId = `${menuId}-${child.id}`
				return h(
					'li',
					{
						class: 'item-child-item',
						key: child.id,
						'data-menu-id': childMenuId,
						onMouseenter: () => handleMouseEnter(child),
						onMouseleave: () => handleMouseLeave(child),
					},
					[
						h(
							'div',
							{
								class: ['child-content'],
								onClick: () => {
									if (!child.children || child.children.length === 0) {
										onClickItem(child, index)
									}
								},
							},
							child.label
						),
						// 递归渲染子菜单
						child.children && child.children.length > 0
							? getItemChild(child, index, level + 1, menuId)
							: null,
					]
				)
			})
		)
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
		const find = flat.value.find((item) => item[props.keys[0]] === newVal)

		let findIndex = 0
		if (find && find.pid) {
			const loops = (item) => {
				if (item.pid) {
					return loops(navItems.value.find((i) => i[props.keys[0]] === item.pid))
				}
				return item
			}
			const top = loops(find)
			findIndex = navItems.value.findIndex((item) => item[props.keys[0]] === top.id)

			active.value = top.id
		} else {
			findIndex = navItems.value.findIndex((item) => item[props.keys[0]] === newVal)
			active.value = newVal
		}
		activeIndex.value = findIndex

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
		:width="direction === 'horizontal' ? '100%' : '170px'"
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
				:data-item-id="item[props.keys[0]]"
				:style="{width: `${100 / props.count}%`}"
				:class="{active: item[props.keys[0]] === active}"
				@click="onClickItem(item, index)"
				@mouseenter="item.children ? showChildMenu(item.id) : false"
			>
				<span>{{ item[props.keys[1]] }}</span>
				<component :is="() => getItemChild(item, index)" />
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
		user-select: none;

		.bar {
			bottom: 0px;
			border-radius: 5px;
			background-color: var(--z-primary);
			height: 5px;
			position: absolute;
			transition: all 0.15s linear;
		}

		> .item {
			align-items: center;
			cursor: pointer;
			display: flex;
			font-size: 14px;
			justify-content: center;
			height: 100%;
			position: relative;
			z-index: 2;

			> span {
				align-items: center;
				display: flex;
				border-left: 1px solid var(--z-line);
				border-right: 1px solid var(--z-line);
				height: 50%;
				justify-content: center;
				transition: all 0.3s ease-in-out;
				width: 100%;
			}

			&.active {
				span {
					font-weight: bold;
				}
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
<style>
.navigation-component-child {
	background-color: rgba(var(--z-main-rgb), 0.05);
	border: 1px solid var(--z-line);
	border-top: none;
	position: fixed;
	z-index: 9999;
	padding: 55px 0 0 0;
	margin: 0;
	list-style: none;
	transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
	transform-origin: top center;
	user-select: none;
	cursor: pointer;

	.item-child-item {
		box-shadow: 0 6px 10px rgba(0, 0, 0, 0.1);
		background: var(--z-theme);
		cursor: pointer;
		text-align: center;

		.child-content {
			font-size: 14px;
			padding: 15px 10px;
			opacity: 0.8;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			max-width: 200px;

			&:hover,
			&.active {
				font-weight: 500;
				opacity: 1;
			}
		}

		&:not(:last-child) {
			border-bottom: 1px solid rgba(var(--z-line-rgb), 0.5);
		}

		&:last-child {
			border-radius: 0 0 4px 4px;
		}
	}

	.navigation-component-child {
		border: 1px solid var(--z-line);
		border-radius: 4px;
		padding-top: 0;

		.item-child-item {
			&:first-child {
				border-radius: 4px 4px 0 0;
			}
		}
	}
}
</style>
