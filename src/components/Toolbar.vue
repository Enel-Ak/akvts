<script setup>
import {useRouter} from 'vue-router'
const props = defineProps({
	showBack: {
		type: Boolean,
		default: true,
	},
	back: {
		type: String,
		default: '',
	},
	backQuery: {
		type: Object,
		default: () => ({}),
	},
})
const router = useRouter()
const onBack = () => {
	if (props.back) {
		router.push({path: props.back, query: props.backQuery})
		return
	}
	router.go(-1)
}
</script>
<template>
	<div class="toolbar-component">
		<el-button
			v-if="$props.showBack"
			type="primary"
			size="small"
			class="back no-shadow"
			@click="onBack"
			link
		>
			<Icons name="Back" size="11" color="var(--z-font-color)" class="mg-right-5"></Icons>
			返回
		</el-button>
		<div class="left"><slot name="left"></slot></div>
		<div class="center"><slot name="center"></slot></div>
		<div class="right"><slot name="right"></slot></div>
	</div>
</template>
<style scoped lang="scss">
.toolbar-component {
	align-items: center;
	background-color: var(--z-theme);
	border-bottom: 1px solid rgba($color: var(--z-line-rgb), $alpha: 1);
	display: flex;
	height: torem(40px);
	margin: 0 torem(-20px);
	margin-top: torem(-20px);
	margin-bottom: torem(20px);
	padding: 0 torem(20px);
	width: calc(100% + torem(40px));

	:deep(.title) {
		align-items: center;
		display: flex;
		font-size: 14px;
		font-weight: 500;
		i {
			color: rgba(var(--z-font-color-rgb), 1);
			margin: 0 torem(5px);
		}

		.small {
			color: rgba(var(--z-font-color-rgb), 0.5);
			font-size: 14px;
		}
	}

	.back {
		margin-right: torem(20px);
		position: relative;
		top: 1px;
		:deep(.akvts-icons) {
			margin-left: torem(-5px);
		}
	}

	> div {
		align-items: center;
		display: flex;
		flex: 1;
	}

	.left {
		justify-content: flex-start;
	}
	.center {
		justify-content: center;
	}

	.right {
		justify-content: flex-end;
	}
}
</style>
