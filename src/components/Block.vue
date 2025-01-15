<script setup>
import {onActivated, onDeactivated, onMounted, onUnmounted, ref, nextTick, computed} from 'vue'
import {useRouter} from 'vue-router'
import {useGuid} from '@/hooks'
import Lock from './Lock.vue'

const emits = defineEmits([
	'contentExpand',
	'heightChanged',
	'fullScreenChanged',
	'collapsed',
	'clickBack',
	'backMethod',
])
const props = defineProps({
	title: {type: String, default: ''},

	backUrl: {type: String, default: ''},
	backQuery: {type: Object, default: () => ({})},

	border: {type: Boolean, default: true},
	collapsedText: {type: String, default: '展开'},
	collapsedWidth: {type: [Number, String], default: '60px'},
	height: {type: [Number, String], default: 0}, // 固定高度
	autoHeight: {type: Boolean, default: false}, // 自适应高度

	expand: {type: Boolean, default: true}, // 默认展开
	expandVertical: {type: Boolean, default: true}, // 默认垂直展开, false 为水平展开
	borderRadius: {type: [Number, String], default: 0},
	enableExpand: {type: Boolean, default: false}, // 启用展开/收起
	enableExpandButton: {type: Boolean, default: false}, // 启用展开/收起按钮, 最右侧图标

	enableBackButton: {type: Boolean, default: false}, // 启用返回按钮

	expandContent: {type: Boolean, default: true}, // 默认展开/收起内容块
	enableExpandContent: {type: Boolean, default: true}, // 启用展开/收起内容块按钮
	expandContentHeight: {type: [Number, String], default: 250}, // 默认展开/收起内容块高度
	expandContentText: {type: String, default: '展开搜索'},
	collapseContentText: {type: String, default: '收起搜索'},

	enableObserver: {type: Boolean, default: true}, // 启用 resize observer 监听高度
	enableFixedHeight: {type: Boolean, default: false}, // 启用固定高度, 默认启用 onResize

	enableFullScreen: {type: Boolean, default: false}, // 全屏

	delay: {type: Number, default: 16.7}, // 延迟执行高度计算
	offset: {type: Array, default: () => [211, 40]}, // 高度计算偏移量 [顶部+底部+填充或者其他高度, Block标题自身高度]
	fixedOffset: {type: Number, default: 0}, // 固定高度偏移量
	inherit: {type: Boolean, default: false}, // 启用继承高度

	isBack: {type: Boolean, default: false},
})

const guid = useGuid()
const router = useRouter()
const blockRef = ref()
const contextHeight = ref(0)

const expandBlock = ref(props.expand)
const expendContentOpen = ref(props.expandContent)
const expendContentHeight = ref(0)
const br = ref(props.borderRadius + 'px')
const mb = ref(props.enableFixedHeight ? '0' : '20px')
const cw = ref(
	typeof props.collapsedWidth === 'string' ? props.collapsedWidth : props.collapsedWidth + 'px'
)
const frame = ref(JSON.parse(localStorage.getItem('CONTAINER_FRAME') || '[]'))

let observer = null
let observerTimer = null
let resieTimer = null
let isMounted = false
let isExpand = false
const historyParnetNode = ref(null)
const historyNodeIndex = ref(0)
const isFullScreen = ref(false)
const unLock = ref(0)

const _offset = computed(() => {
	let first = 85

	if (frame.value?.includes('header')) {
		first = first + 86
	}

	if (frame.value?.includes('footer')) {
		first = first + 40
	}

	return [
		props.enableFixedHeight ? first + props.fixedOffset : props.offset[0] - 20,
		props.offset[1],
	]
})

const _height = computed(() => {
	if (props.height) {
		if (typeof props.height === 'number') {
			return props.height + 'px'
		}

		if (typeof props.height === 'string' && props.height.indexOf('px') === -1) {
			return `${props.height}px`
		}
		return props.height
	}

	return 0
})

const onExpand = () => {
	if (!props.enableExpand) return
	expandBlock.value = !expandBlock.value
	emits('collapsed', !expandBlock.value)
}

const onExpendContent = (isToggle = true) => {
	if (!blockRef.value || !expandBlock.value) return

	isExpand = true
	const expandEl = blockRef.value.querySelector('.expand-content > *')

	if (!expandEl) return

	if (isToggle) {
		expendContentOpen.value = !expendContentOpen.value
	}

	nextTick(() => {
		const ech = expendContentOpen.value ? expandEl.offsetHeight : 0
		const newHeight = ech > props.expandContentHeight ? props.expandContentHeight : ech

		// 只有当高度真正改变时才触发事件

		if (expendContentHeight.value !== newHeight) {
			expendContentHeight.value = newHeight + 1
			emits('contentExpand', newHeight, expendContentOpen.value)

			// 使用 nextTick 确保 DOM 更新后再触发高度变化事件
			nextTick(() => {
				emits('heightChanged', contextHeight.value - newHeight)
			})
		}
	})
}

const onBack = () => {
	isFullScreen.value && onFullScreen()
	console.log('Block back button is clicked')

	emits('clickBack')

	if (props.backUrl) {
		router.push({path: props.backUrl, query: props.backQuery})
	} else if (props.isBack) {
		emits('backMethod')
	} else {
		router.go(-1)
	}
}

const initObserver = () => {
	if (blockRef.value) {
		if (!observer) {
			console.log('Block resize observer is created')
			observer = new ResizeObserver((entries) => {
				clearTimeout(observerTimer)
				observerTimer = setTimeout(() => {
					if (props.inherit) {
						if (blockRef.value?.parentNode) {
							contextHeight.value =
								blockRef.value?.parentNode.offsetHeight - _offset.value[1]
						}
						return
					}

					const bodyHeight = document.body.offsetHeight - _offset.value[0] // Block title  and padding and header height

					entries.forEach((entry) => {
						let now = entry.borderBoxSize[0].blockSize

						if (expendContentOpen.value) {
							now += expendContentHeight.value
						}
						if (
							(now < bodyHeight && props.enableFixedHeight) ||
							props.enableFixedHeight
						) {
							now = bodyHeight
						}
						if (isFullScreen.value) {
							now = document.body.offsetHeight - _offset.value[1] // Block title height and padding
						}
						contextHeight.value = now
						console.log('Block resize observer is running', contextHeight.value)
					})

					!isExpand &&
						emits('heightChanged', contextHeight.value - expendContentHeight.value)
					isExpand = false
				}, props.delay)
			})
			observer.observe(blockRef.value.querySelector('.block-component-body > .content'))
		}
	}
}

const init = () => {
	if (props.enableObserver) {
		initObserver()
	}
	if (props.expandContent) {
		nextTick(() => {
			// setTimeout(() => {
			// frame.value = JSON.parse(localStorage.getItem('') || '[]')
			onExpendContent(false)
			nextTick(() => {
				isExpand = false
			})
			// }, 32)
		})
	}
}

const cleanUp = () => {
	// if (blockRef.value) {
	// 	const el = blockRef.value.querySelector('.block-content')
	// 	const btn = blockRef.value.querySelector('.block-title .expand')
	// 	const more = el.nextElementSibling

	// 	el.style.height = 0
	// 	el.classList.remove('expand')
	// 	btn?.classList.remove('open')
	// 	more?.classList.remove('open')
	// }

	if (observer) {
		console.log('Block resize observer is disconnected')
		observer.disconnect()
		observer = null
	}

	if (observerTimer) {
		clearTimeout(observerTimer)
		observerTimer = null
	}

	isFullScreen.value = false
}

const onResize = () => {
	if (props.enableFixedHeight && expandBlock.value) {
		clearTimeout(resieTimer)
		// setTimeout(() => {
		contextHeight.value = document.body.offsetHeight - _offset.value[0]
		emits('heightChanged', contextHeight.value - expendContentHeight.value)
		// }, 16.7)
	}
}

const onFullScreen = () => {
	isFullScreen.value = !isFullScreen.value
	if (isFullScreen.value) {
		historyNodeIndex.value = Array.from(blockRef.value.parentNode.children).indexOf(
			blockRef.value
		)
		historyParnetNode.value = blockRef.value.parentNode
		document.body.appendChild(blockRef.value)
	} else {
		historyParnetNode.value.insertBefore(
			blockRef.value,
			historyParnetNode.value.children[historyNodeIndex.value]
		)
	}
	emits('fullScreenChanged', isFullScreen.value)
}

onMounted(() => {
	console.log('Block Component is mounted')
	isMounted = true
	init()
})

onActivated(() => {
	console.log('Block Component is activated')
	!isMounted && init()
	isMounted = false
})

onDeactivated(() => {
	console.log('Block Component is deactivated')
	!isMounted && cleanUp()
})

onUnmounted(() => {
	console.log('Block Component is unmounted')
	cleanUp()
})

defineExpose({
	resize: () => {},
	onExpendContent,
})
</script>
<template>
	<div
		v-resize="onResize"
		class="block-component"
		ref="blockRef"
		:key="guid"
		:class="{
			'mg-bottom-0': inherit,
			'full-screen': isFullScreen,
			'no-border': !border,
			collapsed: !expandBlock && !expandVertical,
		}"
	>
		<div class="block-title" @click.stop="onExpand">
			<div class="topLeft" @click.stop>
				<slot name="title">
					<span @click.stop>
						<slot name="topLeft"></slot>
						<el-icon v-if="title === '' && !$slots.title" class="loading-animation">
							<Loading />
						</el-icon>
						{{ title }}
						<slot name="topTitleAfter"></slot>
					</span>
				</slot>
			</div>

			<div class="center" @click.stop>
				<slot name="topCenter"></slot>
			</div>

			<div class="topRight" @click.stop>
				<slot name="topRight"> </slot>
			</div>

			<el-button v-if="enableExpandContent" size="small" @click.stop="onExpendContent">
				{{ expendContentOpen ? collapseContentText : expandContentText }}
				<Icons
					icon-name="Expand"
					:style="{rotate: expendContentOpen ? '180deg' : '0deg'}"
				></Icons>
			</el-button>

			<el-button v-if="enableFullScreen" size="small" @click.stop="onFullScreen">
				{{ isFullScreen ? '还原' : '全屏' }}
			</el-button>

			<el-button v-if="enableBackButton" @click.stop="onBack" size="small"> 返回 </el-button>

			<el-button
				link
				class="expand no-shadow"
				:class="{open: expandBlock}"
				v-if="enableExpandButton"
			>
				<Icons v-if="expandVertical" icon-name="Expand"></Icons>
				<template v-else>
					{{ expandBlock ? '收起' : '展开' }}
				</template>
			</el-button>
		</div>

		<div
			class="block-content"
			:class="{'auto-height': expandBlock && autoHeight, expand: expandBlock}"
			:style="{
				height: !expandBlock
					? 0
					: _height
					? _height
					: enableFixedHeight
					? `${contextHeight}px`
					: '100%',
			}"
		>
			<div
				v-if="enableExpandContent"
				class="expand-content"
				:class="{border: expendContentOpen}"
				:style="{height: expendContentHeight + 'px'}"
			>
				<slot name="expand"></slot>
			</div>

			<div
				v-show="expandBlock"
				class="block-component-body"
				:style="{
					height: enableFixedHeight ? contextHeight - expendContentHeight + 'px' : 'auto',
				}"
			>
				<div class="content">
					<slot name="default"></slot>
				</div>
			</div>
		</div>

		<Icons v-if="!expandBlock" icon-name="More" class="more"></Icons>

		<div v-if="!expandBlock && !expandVertical" class="collapsed-controller" @click="onExpand">
			<slot name="collapsed">{{ collapsedText }}</slot>
		</div>

		<Lock v-model="unLock"></Lock>
	</div>
</template>
<style scoped lang="scss">
.block-component {
	border-radius: v-bind(br);
	border: 1px solid rgba(var(--z-line-rgb), 0.5);
	border-bottom-width: 3px;
	background: var(--z-theme);
	position: relative;
	width: 100%;

	margin-bottom: v-bind(mb);
	transition: all 0.15s linear;

	&.mg-bottom-0 {
		margin-bottom: 0;
	}

	&.collapsed {
		height: 100%;
		width: v-bind(cw);
		.block-title,
		.more {
			opacity: 0;
			overflow: hidden;
		}
		// .block-content {
		// 	height: 100% !important;
		// }

		.collapsed-controller {
			align-items: center;
			bottom: 0;
			cursor: pointer;
			color: var(--z-main);
			display: flex;
			font-size: 16px;
			height: 100%;
			left: 0;
			letter-spacing: 5px;
			justify-content: center;
			position: absolute;
			top: 0;
			right: 0;
			text-orientation: upright;
			writing-mode: vertical-rl;
			width: 100%;
		}
	}

	&.no-border {
		border: none;
		.block-title {
			padding: 0;
			span {
				margin-left: 0;
			}
		}
		.block-component-body {
			padding: torem(10px) 0 0 0 !important;
		}
	}

	&.full-screen {
		height: 100%;
		left: 0;
		position: fixed;
		top: 0;
		width: 100%;
		z-index: 99;
	}

	.block-title {
		align-items: center;
		border-bottom: 1px solid rgba(var(--z-line-rgb), 0.5);
		cursor: pointer;
		display: flex;
		height: torem(40px);
		padding: torem(10px);
		transition: all 0.15s linear;
		white-space: nowrap;

		button {
			margin-left: 10px !important;
		}

		span {
			align-items: center;
			border-left: 5px solid var(--z-nav-hover);
			display: flex;
			font-size: 16px;
			font-weight: 500;
			line-height: 1;
			padding-left: torem(10px);
			margin: 0 torem(5px);
		}

		.topLeft {
			align-items: center;
			display: flex;
		}

		.center {
			align-items: center;
			display: flex;
			flex: 1;
			justify-content: flex-start;
			margin-left: torem(10px);
		}

		.expand {
			cursor: pointer;
			height: torem(30px);
			width: torem(30px);
			i {
				color: var(--z-font-color);
				transform: rotate(-90deg);
				font-size: torem(28px);
				margin: 0;
				transition: transform 0.15s linear;
			}

			&.open {
				i {
					transform: rotate(0deg);
				}
			}
		}
	}

	.expand-content {
		// transition: all 0.15s linear;
		overflow-y: auto;
		overflow-x: hidden;
		&.border {
			border-bottom: 1px solid rgba(var(--z-line-rgb), 0.5);
		}
		:deep(.search) {
			padding: torem(12px) torem(15px) 0 torem(15px);
		}
		:deep(.el-form) {
			> :last-child:not(.form-items) {
				padding-bottom: torem(10px);
				margin-bottom: 0;
			}
		}
	}

	.block-content {
		height: 0;
		opacity: 0;
		overflow: hidden;
		transition: height 0.15s linear, opacity 0.15s linear;

		.block-component-body {
			overflow-y: auto;
			overflow-x: hidden;
			padding: torem(15px);
		}

		&.expand {
			opacity: 1;
		}

		&.auto-height {
			height: 100% !important;
		}
	}

	.more {
		bottom: torem(-1px);
		left: calc(50% - torem(12px));
		opacity: 1;
		position: absolute;
		transition: opacity 0.15s linear;
	}
}
</style>
