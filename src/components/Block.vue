<script setup>
import {onActivated, onDeactivated, onMounted, onUnmounted, ref, nextTick} from 'vue'
import {useRouter} from 'vue-router'

const emits = defineEmits(['contentExpand', 'heightChanged', 'fullScreenChanged', 'clickBack'])
const props = defineProps({
	title: {type: String, default: ''},

	backUrl: {type: String, default: ''},
	backQuery: {type: Object, default: () => ({})},

	border: {type: Boolean, default: true},
	height: {type: [Number, String], default: 0}, // 固定高度
	autoHeight: {type: Boolean, default: false}, // 自适应高度

	expand: {type: Boolean, default: true}, // 默认展开
	borderRadius: {type: [Number, String], default: 0},
	enableExpand: {type: Boolean, default: false}, // 启用展开/收起
	enableExpandButton: {type: Boolean, default: true}, // 启用展开/收起按钮, 最右侧图标

	enableBackButton: {type: Boolean, default: true}, // 启用返回按钮

	expandContent: {type: Boolean, default: true}, // 默认展开/收起内容块
	enableExpandContent: {type: Boolean, default: false}, // 启用展开/收起内容块按钮
	expandContentHeight: {type: [Number, String], default: 250}, // 默认展开/收起内容块高度
	expandContentText: {type: String, default: '展开搜索'},
	collapseContentText: {type: String, default: '收起搜索'},

	enableObserver: {type: Boolean, default: true}, // 启用 resize observer 监听高度
	enableFixedHeight: {type: Boolean, default: false}, // 启用固定高度, 默认启用 onResize

	enableFullScreen: {type: Boolean, default: false}, // 全屏

	delay: {type: Number, default: 1}, // 延迟执行高度计算
	offset: {type: Array, default: () => [205, 40]}, // 高度计算偏移量 [顶部+底部+填充或者其他高度, Block标题自身高度]
})

const router = useRouter()
const blockRef = ref()
const contextHeight = ref(0)

const expandBlock = ref(props.expand)
const expendContentOpen = ref(props.expandContent)
const expendContentHeight = ref(0)
const br = ref(props.borderRadius + 'px')
const mb = ref(props.enableFixedHeight ? '0' : '20px')

let observer = null
let observerTimer = null
let resieTimer = null
let isMounted = false
let isExpand = false
const historyParnetNode = ref(null)
const historyNodeIndex = ref(0)
const isFullScreen = ref(false)
const _offset = [props.enableFixedHeight ? props.offset[0] : props.offset[0] - 20, props.offset[1]]

const onExpand = () => {
	if (!props.enableExpand) return
	expandBlock.value = !expandBlock.value
}

const onExpendContent = (isToggle = true) => {
	isExpand = true
	const expandEl = blockRef.value.querySelector('.expand-content .el-scrollbar__view > *')

	if (!expandEl || !expandBlock.value) return

	if (isToggle) {
		expendContentOpen.value = !expendContentOpen.value
	}

	const ech = expendContentOpen.value ? expandEl.scrollHeight : 0

	expendContentHeight.value = ech > props.expandContentHeight ? props.expandContentHeight : ech

	emits('contentExpand', expendContentHeight.value, expendContentOpen.value)
	emits('heightChanged', contextHeight.value - expendContentHeight.value)
}

const onBack = () => {
	isFullScreen.value && onFullScreen()
	console.log('Block back button is clicked')

	emits('clickBack')
	if (props.backUrl) {
		router.push({path: props.backUrl, query: props.backQuery})
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
					const bodyHeight = document.body.offsetHeight - _offset[0] // Block title  and padding and header height
					entries.forEach((entry) => {
						let now = entry.borderBoxSize[0].blockSize
						if (expendContentOpen.value) {
							now += expendContentHeight.value
						}
						if ((now < bodyHeight && props.enableFixedHeight) || props.enableFixedHeight) {
							now = bodyHeight
						}
						if (isFullScreen.value) {
							now = document.body.offsetHeight - _offset[1] // Block title height and padding
						}
						contextHeight.value = now
						console.log('Block resize observer is running', contextHeight.value)
					})

					!isExpand && emits('heightChanged', contextHeight.value - expendContentHeight.value)
					isExpand = false
				}, props.delay)
			})
			observer.observe(blockRef.value.querySelector('.block-component-body'))
		}
	}
}

const init = () => {
	if (props.enableObserver) {
		initObserver()
	}
	if (props.expandContent) {
		setTimeout(() => {
			onExpendContent(false)
			nextTick(() => (isExpand = false))
		}, 16.7)
	}
}

const cleanUp = () => {
	if (blockRef.value) {
		const el = blockRef.value.querySelector('.block-content')
		const btn = blockRef.value.querySelector('.block-title .expand')
		const more = el.nextElementSibling

		el.style.height = 0
		el.classList.remove('expand')
		btn?.classList.remove('open')
		more?.classList.remove('open')
	}

	if (observer) {
		console.log('Block resize observer is disconnected')
		observer.disconnect()
		observer = null
	}

	isFullScreen.value = false
}

const onResize = () => {
	if (props.enableFixedHeight && expandBlock.value) {
		clearTimeout(resieTimer)
		// resieTimer = setTimeout(() => {
		contextHeight.value = document.body.offsetHeight - _offset[0]
		emits('heightChanged', contextHeight.value - expendContentHeight.value)
		// }, 128)
	}
}

const onFullScreen = () => {
	isFullScreen.value = !isFullScreen.value
	if (isFullScreen.value) {
		historyNodeIndex.value = Array.from(blockRef.value.parentNode.children).indexOf(blockRef.value)
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
	!isMounted && init()
})

onDeactivated(() => {
	!isMounted && cleanUp()
})

onUnmounted(() => {
	isMounted && cleanUp()
})

defineExpose({
	resize: () => {},
	onExpendContent,
})
</script>
<template>
	<div
		class="block-component"
		ref="blockRef"
		v-resize="onResize"
		:class="{'full-screen': isFullScreen, 'no-border': !border}"
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

			<el-button v-if="enableExpandContent" size="small" @click.stop="onExpendContent" ml-10px>
				{{ expendContentOpen ? collapseContentText : expandContentText }}
				<i
					class="icon i-ic-baseline-expand-more"
					:style="{rotate: expendContentOpen ? '180deg' : '0deg'}"
				></i>
			</el-button>

			<el-button v-if="enableFullScreen" size="small" ml-10px @click.stop="onFullScreen">
				{{ isFullScreen ? '还原' : '全屏' }}
			</el-button>

			<el-button
				v-if="enableBackButton"
				@click.stop="onBack"
				size="small"
				:class="{'ml-10px': !enableExpandContent}"
			>
				返回
			</el-button>

			<el-button
				link
				class="expand no-shadow"
				:class="{open: expandBlock}"
				v-if="enableExpandButton"
			>
				<i class="icon i-ic-baseline-keyboard-arrow-down"></i>
			</el-button>
		</div>
		<div
			class="block-content"
			:class="{'auto-height': expandBlock && autoHeight, expand: expandBlock}"
			:style="{height: !expandBlock ? 0 : height > 0 ? `${height}px` : `${contextHeight}px`}"
		>
			<div
				v-if="enableExpandContent"
				class="expand-content"
				:class="{border: expendContentOpen}"
				:style="{height: expendContentHeight + 'px'}"
			>
				<el-scrollbar :height="expendContentHeight" :always="true">
					<slot name="expand"></slot>
				</el-scrollbar>
			</div>

			<el-scrollbar
				ref="scrollRef"
				class="block-scrollbar"
				:height="
					height > 0
						? `${height}px`
						: `${expendContentOpen ? contextHeight - expendContentHeight : contextHeight}px`
				"
				always
			>
				<div v-show="expandBlock" class="block-component-body">
					<slot name="default"></slot>
				</div>
			</el-scrollbar>
		</div>
		<i v-if="!expandBlock" class="icon i-ic-baseline-more-horiz more"></i>
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
		white-space: nowrap;

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
		&.border {
			border-bottom: 1px solid rgba(var(--z-line-rgb), 0.5);
		}
		:deep(.search) {
			padding: torem(10px) torem(15px) 0 torem(15px);
		}
	}

	.block-content {
		height: 0;
		opacity: 0;
		overflow: hidden;
		transition: height 0.15s linear, opacity 0.15s linear;

		.block-component-body {
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
