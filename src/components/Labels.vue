<script setup>
import {nextTick, onMounted, ref, toRaw, computed} from 'vue'
import {useRouter} from 'vue-router'

const emits = defineEmits(['clickItem', 'cancelItem'])
const props = defineProps({
	key: {
		type: String,
		default: 'index',
	},
	max: {
		type: Number,
		default: 5,
	},
})

const router = useRouter()
const items = ref([])
const current = ref(null)
const prev = ref(null)
const buttonWidth = computed(() => `${100 / (props.max + 1)}%`)

const onClickLabel = (item, isDropdown = false, isPush = true) => {
	const index = items.value.findIndex((i) => i.index === item.index)
	prev.value = toRaw(current.value)
	current.value = item

	if (isDropdown) {
		items.value.splice(1, 0, item)
		setTimeout(() => {
			items.value.splice(index + 1, 1)
			saveHistory()
		}, 0)
	} else {
		saveHistory()
	}

	console.log('Labels Click:', item)
	localStorage.setItem('MAIN_LABEL', item.path)
	isPush && item.path && router.push({path: item.path})
	nextTick(() => setBar())
	emits('clickItem', item)
}

const onCancelItem = (item) => {
	const index = items.value.findIndex((i) => i.index === item.index)
	items.value.splice(index, 1)
	nextTick(() => {
		if (current.value.index === item.index) {
			const nextItem = items.value[index] || items.value[index - 1]
			prev.value = toRaw(current.value)
			current.value = nextItem
			router.push({
				path: nextItem.path,
			})
		}
		saveHistory()
		// next item
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

const saveHistory = () => {
	localStorage.setItem('LABELS', JSON.stringify(items.value))
	localStorage.setItem('CURRENT_LABELS', JSON.stringify(current.value))
	localStorage.setItem('PREV_LABELS', JSON.stringify(prev.value))
}

defineExpose({
	add: (item) => {
		if (item[props.key] === current.value?.[props.key] || (item.children && !item.path)) {
			return
		}
		console.log('Labels Add:', item)
		prev.value = toRaw(current.value)
		current.value = item

		const enable = item.hasOwnProperty('enable') ? item.enable : true
		const index = items.value.findIndex((i) => i[props.key] === item[props.key])

		if (enable) {
			if (index === -1) {
				items.value.splice(1, 0, item)
			}

			if (index >= props.max) {
				items.value.splice(index, 1)
				items.value.splice(1, 0, item)
			}
		}

		saveHistory()
		nextTick(() => setBar())
	},
})

onMounted(() => {
	const historyCurrent = localStorage.getItem('CURRENT_LABELS')
	const history = JSON.parse(localStorage.getItem('LABELS') || '[]')

	if (history.length > 0) {
		items.value = history

		if (location.search) {
			const module = location.pathname.split('/')[1]
			const item = items.value.find((i) => i.component === `/${module}`)
			console.log('Labels Search:', item)
			if (item) {
				nextTick(() => {
					onClickLabel(item, false, false)
				})
			}
			return
		}

		if (historyCurrent) {
			nextTick(() => {
				onClickLabel(JSON.parse(historyCurrent))
			})
			return
		}

		current.value = history[0]
		router.push({
			path: history[0].path,
		})
	}
})
</script>
<template>
	<div class="labels-component">
		<template v-for="(item, index) of items">
			<button
				v-if="index < $props.max"
				type="button"
				:title="item.title"
				:class="{
					active: current?.index === item.index,
					'shadow-1': current?.index === item.index,
				}"
				@click="onClickLabel(item)"
			>
				<span>{{ item.title }}</span>
				<el-icon
					v-if="index > 0"
					class="i-ic-round-cancel"
					@click.stop="onCancelItem(item)"
				></el-icon>
			</button>
		</template>
		<!-- <span class="bar"></span> -->

		<el-dropdown v-if="items.length > $props.max" :hide-on-click="false" class="more">
			<span class="el-dropdown-link">
				<el-icon class="icon el-icon--right i-ic-baseline-more-horiz"></el-icon>
			</span>
			<template #dropdown>
				<el-dropdown-menu>
					<template v-for="(item, index) of items">
						<el-dropdown-item v-if="index >= $props.max" @click="onClickLabel(item, true)">
							<div class="labels-component-more" :title="item.title">
								{{ item.title.length > 2 ? item.title.substring(0, 2) + '...' : item.title }}
								<span class="labels-component-close" @click.stop="onCancelItem(item)">
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
		line-height: torem(30px);
		// margin-right: torem(20px);
		height: torem(40px);
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
			top: torem(14px);
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
		height: torem(40px);
		line-height: torem(40px);
		margin: 0 torem(5px);

		.el-icon--right {
			position: relative;
		}
	}
}
</style>
