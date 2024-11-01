<script setup>
import {onMounted, ref} from 'vue'

const emits = defineEmits(['clickClose', 'clickConfirm', 'update:modelValue', 'heightChanged'])
const props = defineProps({
	height: {type: Number, default: 0},
	autoHeight: {type: Boolean, default: true},
	closeText: {type: String, default: '关闭'},
	confirmText: {type: String, default: '确定'},
	popconfirmText: {type: String, default: '确认提交吗?'},
	fullScreen: {type: Boolean, default: false},
	destroyOnClose: {type: Boolean, default: false},
	enableButton: {type: Boolean, default: true},
	enableClose: {type: Boolean, default: true},
	enableConfirm: {type: Boolean, default: true},
	enableEscape: {type: Boolean, default: true},
	enableClickModal: {type: Boolean, default: false},
	enablePopconfirm: {type: Boolean, default: false},
	loading: {type: Boolean, default: false},
	delay: {type: Number, default: 0},
})

const scrollRef = ref()
const height = ref(0)

let observer = null
let observerTimer = null

const onClickClose = () => {
	emits('clickClose')
	emits('update:modelValue', false)
}

const onClickConfirm = () => {
	if (props.loading) {
		return
	}
	emits('clickConfirm')
}

const initObserver = () => {
	if (scrollRef.value) {
		if (!observer) {
			console.log('Dialog resize observer is created')
			observer = new ResizeObserver((entries) => {
				if (observerTimer) {
					clearTimeout(observerTimer)
				}
				observerTimer = setTimeout(() => {
					entries.forEach((entry) => {
						const h = document.body.offsetHeight / 2
						const now = entry.borderBoxSize[0].blockSize
						console.log('Dialog resize observer', now, h)
						if (now < h) {
							height.value = now
						} else {
							height.value = h
						}
					})
					emits('heightChanged', height.value)
				}, props.delay)
			})

			observer.observe(scrollRef.value.$el.querySelector('.el-scrollbar__wrap .el-scrollbar__view'))
		}
	}
}

const onAutoHeight = () => {
	let scroll = null

	if (props.fullScreen) {
		height.value = document.body.offsetHeight - 47
		return
	}

	if (scrollRef.value) {
		scroll = scrollRef.value.$el.querySelector('.el-scrollbar__wrap .el-scrollbar__view')
	}

	if (props.autoHeight) {
		let h = document.body.offsetHeight / 2

		if (scroll && scroll.offsetHeight < h) {
			h = scroll.offsetHeight
		}
		height.value = props.height > 0 ? props.height : h

		if (props.height === 0) {
			initObserver()
		}
	}
}

const onClosed = () => {
	console.log('Dialog observer is disconnected')
	if (observer) {
		observer.disconnect()
		observer = null
	}
	emits('update:modelValue', false)
}

onMounted(() => {
	onAutoHeight()
})
</script>
<template>
	<el-dialog
		ref="dialogRef"
		v-bind="$attrs"
		draggable
		append-to-body
		:fullscreen="fullScreen"
		:destroy-on-close="destroyOnClose"
		:close-on-click-modal="enableClickModal"
		:close-on-press-escape="enableEscape"
		:class="{pd: !enableButton}"
		@open="onAutoHeight"
		@closed="onClosed"
		class="dialog-component shadow-24"
	>
		<template #header>
			<div class="header-title">
				<i class="icon i-ic-twotone-padding"></i>
				<slot name="header">
					<span>{{ $attrs.title }}</span>
				</slot>
			</div>
		</template>
		<el-scrollbar
			v-resize="onAutoHeight"
			ref="scrollRef"
			class="dialog-scrollbar"
			:height="height"
			always
		>
			<slot name="default"></slot>
		</el-scrollbar>

		<template #footer>
			<slot name="footer-button"></slot>
			<slot name="footer" v-if="enableButton">
				<el-button v-if="enableClose" @click="onClickClose">
					<i class="icon i-ic-outline-cancel"></i>
					{{ closeText }}
				</el-button>
				<slot name="footer-button-between"></slot>
				<template v-if="enablePopconfirm">
					<el-popconfirm :title="popconfirmText" @confirm="onClickConfirm">
						<template #reference>
							<el-button v-if="enableConfirm" type="primary" :loading="loading">
								<i class="icon i-ic-round-task-alt"></i>
								{{ confirmText }}
							</el-button>
						</template>
					</el-popconfirm>
				</template>
				<template v-else>
					<el-button v-if="enableConfirm" type="primary" @click="onClickConfirm" :loading="loading">
						<i class="icon i-ic-round-task-alt"></i>
						{{ confirmText }}
					</el-button>
				</template>
			</slot>
		</template>
	</el-dialog>
</template>
<style lang="scss">
.dialog-component {
	border-radius: torem(4px) !important;
	overflow: hidden;
	padding: 0 !important;

	.dialog-scrollbar {
		> .el-scrollbar__wrap {
			> .el-scrollbar__view {
				padding: 20px;
			}
		}
	}

	&.el-dialog {
		background-color: var(--z-theme);
	}

	.header-title {
		align-items: center;
		color: var(--z-nav-font-color);
		display: flex;
		font-size: torem(16px);
		height: torem(24px);

		span {
			height: torem(18px);
			line-height: torem(18px);
		}

		i {
			font-size: torem(22px);
		}
	}

	.el-dialog__header {
		border-bottom: 1px solid rgba(var(--z-line-rgb), 0.5);
		background-color: var(--z-main);
		padding: torem(10px);
		margin-right: 0;

		.el-dialog__title {
			color: var(--z-nav-font-color);
			font-size: torem(16px);
			font-weight: 500;
		}
	}

	.el-dialog__body {
		padding: 0;
	}

	.el-dialog__headerbtn {
		align-items: center;
		display: flex;
		justify-content: center;
		height: torem(44px);
		line-height: torem(44px);
		top: 0;
		width: torem(44px);

		.el-dialog__close {
			color: var(--z-nav-font-color) !important;
			transition: all 0.15s ease-in-out;
			transform-origin: center center;
		}
		&:hover {
			.el-dialog__close {
				rotate: 180deg;
			}
		}
	}

	&.pd {
		.el-dialog__body {
			background-color: var(--z-theme);
			padding-bottom: 0;

			.el-collapse-item__wrap {
				background-color: var(--z-theme);
			}
		}

		.el-dialog__footer {
			padding: 0;
		}

		.form-component {
			padding-bottom: torem(40px);
		}

		.form-component-flowing {
			padding-bottom: 0;
		}
	}

	.el-form-item.btns,
	.el-dialog__footer {
		border-top: 1px solid var(--z-line);
		background-color: var(--z-bg-secondary);
		margin-right: 0;
		padding: torem(10px);
	}

	.el-form-item.btns {
		bottom: 0;
		margin: torem(20px) torem(-20px) torem(-30px) torem(-20px);
		margin-bottom: 0 !important;
		position: absolute !important;
		padding: 10px 20px !important;
		width: 100%;
		&::after {
			border: none !important;
		}
	}

	.el-form-item.btns.flowing {
		border-top: none;
		background-color: transparent;
		margin: 0 !important;
		position: static !important;
		padding: 0 !important;
	}

	.form-item {
		padding: 0 !important;
	}
}
</style>
