<script setup>
import {nextTick, ref, computed, watch, onBeforeMount, onMounted, onUnmounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import useGuid from '@/hooks/useGuid'

const emits = defineEmits(['clickItem', 'cancelItem'])
const props = defineProps({
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
// 2.25 更多宽度, 3 选中增加宽度
const buttonWidth = computed(() => `${100 / props.max - 30 / props.max / 2.25 - 3}%`)
const buttonActiveWidth = computed(() => `${100 / props.max - 30 / props.max / 2.25 + 3}%`)
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
		split[1].split('&').forEach((i) => {
			const k = i.split('=')
			query[k[0]] = decodeURI(k[1])
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

const onClickLabel = (item, isDropdown = false) => {
	console.log('Labels Click:', item)

	const index = items.value.findIndex((i) => i[props.keys[0]].path === item[props.keys[0]].path)
	current.value = item

	// if (isDropdown) {
	// 	items.value.splice(1, 0, item)
	// 	setTimeout(() => {
	// 		items.value.splice(index + 1, 1)
	// 	}, 0)
	// }

	// save()
	emits('clickItem', item)

	// 检查路径是否有效且不同于当前路径
	if (item.path && item.path !== route.fullPath) {
		router
			.push({
				path: item.path,
				query: query(item),
			})
			.catch((err) => {
				console.error('路由跳转失败:', err)
			})
	}
}

const onCancelItem = (item) => {
	const index = items.value.findIndex((i) => i[props.keys[0]] === item[props.keys[0]])
	items.value.splice(index, 1)
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
	let title = ''
	if (current.value && current.value.modifiedTitle) {
		title = current.value.modifiedTitle
	} else {
		title = item.meta.title || item.meta.childTitle || '-未命名'
	}
	return title
}

const updateLabelTitle = (e) => {
	const {path, title} = e.detail
	const index = items.value.findIndex((f) => f.path === path)
	if (index !== -1) {
		items.value[index].modifiedTitle = title
	}
	save()
}

const deleteLabel = (e) => {
	const {path} = e.detail
	const item = items.value.find((f) => f.path === path)
	onCancelItem(item)
}

watch(
	() => route,
	(to, from) => {
		console.log('Labels Route Changed', to.fullPath, from)

		if (!to || to.meta.ignoreLabel) {
			return
		}

		if (!items.value.some((item) => item.path === to.fullPath)) {
			const newLabel = {
				id: useGuid(),
				label: getMetaTitle(to),
				path: to.fullPath,
			}

			items.value.splice(1, 0, newLabel)
			current.value = newLabel
		} else {
			const index = items.value.findIndex((item) => item.path === to.fullPath)
			current.value = items.value[index]
			current.value.label = getMetaTitle(to)

			if (index > props.max - 1) {
				items.value.splice(1, 0, current.value)
				setTimeout(() => {
					items.value.splice(index + 1, 1)
				}, 0)
			}
		}

		save()
	},
	{deep: true}
)

onBeforeMount(() => {
	// 从 localStorage 读取历史记录
	const history = JSON.parse(localStorage.getItem('LABELS') || '[]')
	const historyCurrent = JSON.parse(localStorage.getItem('CURRENT_LABEL') || '{}')
	console.log('Labels History', history, historyCurrent)

	if (history.length > 0) {
		items.value = history
		if (Object.keys(historyCurrent).length > 0) {
			current.value = historyCurrent
		} else {
			current.value = history[0]
		}
		if (current.value) {
			onClickLabel(current.value)
		}
	}
})
onMounted(() => {
	window.addEventListener('deleteLabel', deleteLabel)
	window.addEventListener('updateLabelTitle', updateLabelTitle)
})

onUnmounted(() => {
	window.removeEventListener('updateLabelTitle', updateLabelTitle)
})

defineExpose({
	first: (item) => {
		console.log('Labels first', item)

		const history = JSON.parse(localStorage.getItem('LABELS') || '[]')
		const historyCurrent = JSON.parse(localStorage.getItem('CURRENT_LABEL') || '{}')
		if (history.length === 0 && Object.keys(historyCurrent).length === 0) {
			items.value.unshift(item)
			current.value = item
			router.push({
				path: item.path,
				query: query(item),
			})
		}
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
				<span>{{ item.modifiedTitle || item[keys[1]] }}</span>
				<Icons
					v-if="index > 0"
					icon-name="Cancel"
					color="var(--z-nav-font-active)"
					size="15px"
					@click.stop="onCancelItem(item)"
				></Icons>
			</button>
		</template>
		<!-- <span class="bar"></span> -->

		<el-dropdown v-if="items.length > $props.max" :hide-on-click="false" class="more">
			<span class="el-dropdown-link df aic">
				<Icons icon-name="More"></Icons>
			</span>
			<template #dropdown>
				<el-dropdown-menu popper-class="labels-component-popper">
					<template v-for="(item, index) of items">
						<el-dropdown-item
							v-if="index >= $props.max"
							@click="onClickLabel(item, true)"
						>
							<div class="labels-component-more" :title="item[keys[1]]">
								{{
									item[keys[1]].length > 2
										? item[keys[1]].substring(0, 2) + '...'
										: item[keys[1]]
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
		height: v-bind(h);
		line-height: calc(v-bind(h) - 4px);
		margin: 0 torem(5px);
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
