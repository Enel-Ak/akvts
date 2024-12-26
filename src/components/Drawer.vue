<script setup>
import {ref} from 'vue'
import Lock from './Lock.vue'
const emits = defineEmits(['clickClose', 'clickConfirm'])
const props = defineProps({
	modal: {type: Boolean, default: true},
	direction: {type: String, default: 'rtl'}, // 'rtl' | 'ltr' | 'ttb' | 'btt'
	appendToBody: {type: Boolean, default: true},
	closeOnClickModal: {type: Boolean, default: false},
	closeOnPressEscape: {type: Boolean, default: true},
	destroyOnClose: {type: Boolean, default: false},
	size: {type: [String, Number], default: '30%'},
	enableClose: {type: Boolean, default: true},
	enableConfirm: {type: Boolean, default: true},
})

const unLock = ref(0)

const onClickClose = () => {
	emits('clickClose')
}

const onClickConfirm = () => {
	emits('clickConfirm')
}
</script>
<template>
	<div class="drawer-component">
		<el-drawer
			v-bind="$attrs"
			:size="size"
			:modal="modal"
			:direction="direction"
			:append-to-body="appendToBody"
			:close-on-click-modal="closeOnClickModal"
			:close-on-press-escape="closeOnPressEscape"
			:destroy-on-close="destroyOnClose"
			class="drawer-component"
		>
			<template #header>
				<slot name="header"></slot>
			</template>
			<template #default>
				<slot name="default"></slot>
			</template>
			<template #footer>
				<slot name="footer">
					<el-button v-if="enableClose" @click="onClickClose"> 取消 </el-button>
					<slot name="footer-botton"></slot>
					<el-button v-if="enableConfirm" type="primary" @click="onClickConfirm">
						确认
					</el-button>
				</slot>
			</template>
		</el-drawer>
		<Lock v-model="unLock"></Lock>
	</div>
</template>
<style lang="scss">
.drawer-component {
	.el-drawer__header {
		background: var(--z-main);
		color: #fff;
		margin-bottom: 0;
		padding: torem(10px);
	}

	.el-drawer__body {
		padding: torem(10px) torem(20px) torem(20px) torem(20px);
	}

	.el-drawer__footer {
		border-top: 1px solid var(--z-line);
		background: var(--z-bg-secondary);
		padding: torem(10px);
	}

	.el-drawer__close-btn {
		i {
			transform: rotate(0deg);
			transition: all 0.15s linear;
		}

		&:hover {
			i {
				color: #fff;
				transform: rotate(90deg);
				transition: all 0.15s linear;
			}
		}
	}
}
</style>
