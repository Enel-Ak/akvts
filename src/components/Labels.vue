<script setup>
import {nextTick, ref, computed, watch, onBeforeMount, onMounted, onUnmounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import useGuid from '@/hooks/useGuid'
import {useKeepAlive} from '@/store/useKeepAlive'

const keepAlive = useKeepAlive()

const emits = defineEmits(['clickItem', 'cancelItem', 'update:modelValue'])
const props = defineProps({
	navigator: {
		type: Array,
		default: () => [],
	},
	keys: {
		type: Array,
		default: () => ['id', 'label'],
	},
	height: {
		type: [Number, String],
		default: 40,
	},
	max: {
		type: Number,
		default: 5,
	},
})

const route = useRoute()
const router = useRouter()
const items = ref([])
const current = ref(null)
const _navigator = ref(props.navigator)
const _toPath = ref('')
const _fromPath = ref('')

const buttonWidth = computed(() => {
	return `${100 / props.max - props.max / 30 - 1}%`
})
const buttonActiveWidth = computed(() => `${100 / props.max + props.max * 1}%`)
const h = computed(() => {
	let _h = props.height
	if (typeof _h === 'number' || (typeof _h === 'string' && _h.indexOf('px') === -1)) {
		_h = _h + 'px'
	}
	return _h
})

const query = (item) => {
	const split = item.path.split('?')
	const query = {}
	if (split[1]) {
		console.log('Labels Query:', split[1])
		split[1].split('&').forEach((i) => {
			if (i.includes('=')) {
				const [key, value] = i.split('=')
				const decodedValue = value ? decodeURI(value.trim()) : ''
				if (decodedValue && decodedValue !== 'undefined' && decodedValue !== 'null') {
					query[key] = decodedValue
				}
			} else {
				// 处理没有值的参数，设为 undefined 让 Vue Router 处理
				query[i] = null
			}
		})
	}
	return query
}

const save = () => {
	nextTick(() => {
		localStorage.setItem('CURRENT_LABEL', JSON.stringify(current.value))
		localStorage.setItem('LABELS', JSON.stringify(items.value))
	})
}

const onClickLabel = (item, isDropdown = false, isPush = false) => {
	// const leftNav = getNavItem({fullPath: item.path})

	// emits('update:modelValue', leftNav ? item.id : item.pid)
	emits('clickItem', item)

	// 检查路径是否有效且不同于当前路径
	console.log('Labels Click:', item, route.fullPath, decodeURI(route.fullPath).trim())
	if ((item.path && item.path !== decodeURI(route.fullPath).trim()) || isPush) {
		router
			.push({
				path: item.path.split('?')[0],
				query: query(item),
			})
			.catch((err) => {
				console.error('路由跳转失败:', err)
			})
	}
}

const onCloseLabelAll = () => {
	items.value.splice(1, items.value.length - 1)
	current.value = items.value[0]
	keepAlive.clearIncludes()
	onClickLabel(current.value)
}

const onCancelItem = (item) => {
	const index = items.value.findIndex((i) => i[props.keys[0]] === item[props.keys[0]])
	items.value.splice(index, 1)

	if (item.path) {
		const name = item.path.split('/').pop().split('?')[0] || 'index'
		keepAlive.removeInclude(name)
	}

	nextTick(() => {
		if (current.value[props.keys[0]] === item[props.keys[0]]) {
			const nextItem = items.value[index] || items.value[index - 1]
			current.value = nextItem
			router.push({
				path: nextItem.path,
				query: query(nextItem),
			})
		}
		save()
		emits('cancelItem', current.value)
		nextTick(() => setBar())
	})
}

const setBar = () => {
	const el = document.querySelector('.labels-component .bar')
	const active = document.querySelector('.labels-component button.active')

	if (!el || !active) {
		return
	}
	el.style.left = active.offsetLeft + active.offsetWidth / 2 - 2 + 'px'
}

const getMetaTitle = (item) => {
	console.log('Labels GetMetaTitle', item)

	// 如果是路由对象，直接从 meta 中获取标题
	if (item?.meta) {
		return item.meta.title || item.meta.childTitle || '-未命名'
	}

	// 如果是标签对象，检查是否有修改过的标题
	if (item?.modifiedTitle) {
		return item.modifiedTitle
	}

	return item.label
}

const updateLabelTitle = (e) => {
	const {path, title} = e.detail
	const index = items.value.findIndex((f) => f.path === decodeURI(path).trim())
	if (index !== -1) {
		items.value[index].modifiedTitle = title
		save()
	}
}

const deleteLabel = (e) => {
	const {path} = e.detail
	const item = items.value.find((f) => f.path === decodeURI(path).trim())
	console.log('Labels DeleteLabel', item, e)
	onCancelItem(item)
}

// 根据路径获取导航
const getNavItem = (to) => {
	const loops = (arr) => {
		for (const element of arr) {
			if (element.path === decodeURI(to.fullPath)) {
				return element
			}
			if (element.children && element.children.length > 0) {
				const item = loops(element.children)
				if (item) {
					return item
				}
			}
		}
	}
	const nav = loops(_navigator.value)
	console.log('Labels GetNavItem', nav, to.fullPath, _navigator.value)

	return nav || null
}

// 根据导航名称获取导航
const getNavItemByName = (name) => {
	const loops = (arr) => {
		for (const element of arr) {
			if (element[props.keys[1]] === name) {
				return element
			}
			if (element.children && element.children.length > 0) {
				const item = loops(element.children)
				if (item) {
					return item
				}
			}
		}
	}
	const nav = loops(_navigator.value)
	return nav || null
}

const handleRouter = (to) => {
	// 判断是否左侧菜单
	const nav = getNavItem(to)

	if (!items.value.some((item) => item.path === decodeURI(to.fullPath).trim())) {
		const newLabel = {
			id: nav ? nav.id : useGuid(),
			label: getMetaTitle(to),
			path: decodeURI(to.fullPath).trim(),
		}

		items.value.splice(1, 0, newLabel)
		current.value = newLabel
	} else {
		const index = items.value.findIndex((item) => item.path === decodeURI(to.fullPath).trim())
		current.value = items.value[index]
		current.value.label = getMetaTitle(current.value)

		if (index > props.max - 1) {
			items.value.splice(1, 0, current.value)
			setTimeout(() => {
				items.value.splice(index + 1, 1)
			}, 0)
		}
	}
	save()
	if (current.value.path) {
		const name = current.value.path.split('/').pop().split('?')[0] || 'index'
		keepAlive.addInclude(name)
	}
	console.log('Labels Current', current.value)

	emits('update:modelValue', current.value.pid || current.value.id)
}

watch(
	() => [current.value?.modifiedTitle, current.value?.label],
	(newVal) => {
		const [modifiedTitle, label] = newVal
		if (!modifiedTitle || !label) {
			return
		}
		console.log('Labels Current Title Changed', modifiedTitle, label)
		if (modifiedTitle || label.includes('-')) {
			// 获取根据导航名称获取导航
			const navItem = getNavItemByName((modifiedTitle || label).split('-')[1])

			if (navItem) {
				items.value.find((f) => f.id === current.value.id).pid = navItem.id
				current.value.pid = navItem.id
				save()
				nextTick(() => {
					emits('update:modelValue', current.value.pid)
				})
			}
		} else {
			nextTick(() => {
				emits('update:modelValue', current.value.id)
			})
		}
	},
	{deep: true, immediate: true}
)

watch(
	() => route.fullPath,
	(to, from) => {
		console.log('Labels FullPath Changed', to, from)

		_toPath.value = to
		_fromPath.value = from
	}
)

watch(
	() => route,
	(to, from) => {
		console.log('Labels Route Changed', to, from)
		if (!to || to.meta.ignoreLabel) {
			return
		}
		handleRouter(to)
	},
	{deep: true, immediate: true}
)

watch(
	() => props.navigator,
	(newVal) => {
		_navigator.value = newVal
	},
	{deep: true}
)

onBeforeMount(() => {
	// 从 localStorage 读取历史记录
	const history = JSON.parse(localStorage.getItem('LABELS') || '[]')
	const historyCurrent = JSON.parse(localStorage.getItem('CURRENT_LABEL') || '{"path":null}')
	console.log('Labels History', history, historyCurrent)

	if (history.length > 0) {
		items.value = history
		const currentPath = decodeURI(router.currentRoute.value.fullPath).trim()
		const existingItem = items.value.find((f) => f.path === currentPath)

		if (existingItem) {
			existingItem.label = current.value.label
			current.value =
				existingItem.path === historyCurrent.path ? historyCurrent : existingItem
		} else {
			const newItem = {
				id: useGuid(),
				label: current.value.label || current.value.modifiedTitle || '-未命名',
				path: currentPath,
			}
			items.value.splice(1, 0, newItem)
			current.value = newItem
		}

		onClickLabel(current.value, false, !existingItem)
	}
})

onMounted(() => {
	window.addEventListener('deleteLabel', deleteLabel)
	window.addEventListener('updateLabelTitle', updateLabelTitle)
})

onUnmounted(() => {
	window.removeEventListener('deleteLabel', deleteLabel)
	window.removeEventListener('updateLabelTitle', updateLabelTitle)
})

defineExpose({
	first: (item) => {
		const history = JSON.parse(localStorage.getItem('LABELS') || '[]')
		if (history.length === 0) {
			console.log('Labels first', item)
			items.value.unshift(item)
			current.value = item
			router.push({
				path: item.path,
				query: query(item),
			})
		}
	},
	clear: () => {
		localStorage.removeItem('LABELS')
		localStorage.removeItem('CURRENT_LABEL')
		items.value = []
	},
})
</script>
<template>
	<div class="labels-component">
		<template v-for="(item, index) of items">
			<button
				v-if="index < $props.max"
				type="button"
				:title="item.modifiedTitle || item[keys[1]]"
				:class="{
					active: current?.path === item.path,
				}"
				@click="onClickLabel(item)"
			>
				<span v-if="item.modifiedTitle || (item[keys[1]] && item[keys[1]] !== '-未命名')">
					{{ item.modifiedTitle || item[keys[1]] }}
				</span>
				<LoadingTransition
					v-else
					:color="
						current?.path === item.path
							? 'var(--z-nav-font-color)'
							: 'var(--z-font-color)'
					"
				/>
				<Icons
					v-if="index > 0"
					name="Cancel"
					color="var(--z-nav-font-active)"
					size="15px"
					@click.stop="onCancelItem(item)"
				></Icons>
			</button>
		</template>
		<!-- <span class="bar"></span> -->

		<el-dropdown v-if="items.length > $props.max" :hide-on-click="false" class="more">
			<span class="el-dropdown-link df aic">
				<Icons name="More"></Icons>
			</span>
			<template #dropdown>
				<el-dropdown-menu popper-class="labels-component-popper">
					<template v-for="(item, index) of items">
						<el-dropdown-item
							v-if="index >= $props.max"
							@click="onClickLabel(item, true)"
						>
							<div
								class="labels-component-more pd-right-15 flx"
								:title="item.modifiedTitle || item[keys[1]]"
							>
								{{
									(item.modifiedTitle || item[keys[1]]).length > 10
										? (item.modifiedTitle || item[keys[1]]).substring(0, 10) +
										  '...'
										: item.modifiedTitle || item[keys[1]]
								}}
								<span
									class="labels-component-close"
									@click.stop="onCancelItem(item)"
								>
									&times;
								</span>
							</div>
						</el-dropdown-item>
					</template>
					<el-dropdown-item @click="onCloseLabelAll"> 全部关闭 </el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>
<style scoped lang="scss">
.labels-component {
	display: flex;
	position: relative;
	white-space: nowrap;
	width: 100%;
	button {
		align-items: center;
		// border-radius: torem(0);
		background-color: transparent;
		color: var(--z-font-color);
		display: flex;

		justify-content: center;
		line-height: v-bind(h);
		// margin-right: torem(20px);
		height: v-bind(h);
		// min-height: torem(30px);
		// min-width: torem(80px);
		padding: 0 torem(25px);
		position: relative;
		transition: all 0.15s linear;

		width: v-bind(buttonWidth);

		&.active,
		&:hover {
			background-color: rgba(var(--z-nav-hover-rgb), 0.8);
			color: var(--z-nav-font-color);
			font-weight: 500;

			i {
				opacity: 1;
			}

			:deep(.akvts-loading-transition span),
			:deep(.akvts-loading-transition svg),
			:deep(.akvts-loading-transition small::after) {
				color: var(--z-nav-font-color);
			}
		}

		&.active {
			background-color: var(--z-nav-hover);
			width: v-bind(buttonActiveWidth);
		}

		// &:not(:last-child)::after {
		// 	content: '';
		// 	border-left: 1px solid var(--z-bg);
		// 	border-right: 1px solid var(--z-line);
		// 	height: torem(15px);
		// 	line-height: 1;
		// 	opacity: 1;
		// 	position: absolute;
		// 	right: torem(-11px);
		// 	top: calc(50% - torem(7.5px));
		// 	width: 0;
		// }

		span {
			overflow: hidden;
			text-overflow: ellipsis;
		}

		> i {
			color: var(--z-nav-font-active);
			opacity: 0;
			position: absolute;
			right: torem(6px);
			top: torem(8px);
			transition: all 0.15s 0.1s ease-in-out;
		}
	}

	.bar {
		border-radius: torem(5px);
		bottom: torem(0px);
		background-color: var(--z-theme);
		height: torem(5px);
		position: absolute;
		transition: all 0.15s ease-in-out;
		width: torem(5px);
	}

	.more {
		display: flex;
		height: v-bind(h);
		justify-content: center;
		line-height: calc(v-bind(h) - 4px);
		width: 30px;

		.el-icon--right {
			position: relative;
		}
	}
}
</style>
<style>
body {
	ul[popper-class='labels-component-popper'] {
		border: none !important;
	}
}
</style>
