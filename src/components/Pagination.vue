<script setup>
import {ref, watch} from 'vue'
import Lock from './Lock.vue'

const emits = defineEmits(['size-change', 'current-change'])
const props = defineProps({
	currentPage: {
		type: Number,
		default: 1,
	},
	pageSizes: {
		type: Array,
		default: () => [10, 20, 50, 100],
	},
	pageSize: {
		type: Number,
		default: 10,
	},
	total: {
		type: Number,
		default: 0,
	},
	justifyContent: {
		type: String,
		default: 'flex-end',
	},
})

watch(
	() => props.currentPage,
	(val) => (__currentPage.value = val)
)

const unLock = ref(0)

const __currentPage = ref(props.currentPage)
const __pageSize = ref(props.pageSize)

const onSizeChange = (val) => {
	emits('size-change', val)
}

const onCurrentChange = (val) => {
	emits('current-change', val)
}
</script>
<template>
	<div class="pageination-component" :style="{justifyContent: $props.justifyContent}">
		<slot name="left"></slot>
		<el-pagination
			v-bind="$attrs"
			v-model:current-page="__currentPage"
			v-model:page-size="__pageSize"
			:total="$props.total"
			:page-sizes="$props.pageSizes"
			background
			size="small"
			layout="total,sizes, prev, pager, next, jumper"
			@size-change="onSizeChange"
			@current-change="onCurrentChange"
		/>
		<slot name="right"></slot>
		<Lock v-model="unLock"></Lock>
	</div>
</template>
<style scoped lang="scss">
.pageination-component {
	align-items: center;
	display: flex;
	padding: torem(20px) 0 0 0;
	width: 100%;

	:deep(.el-pagination.is-background .btn-prev),
	:deep(.el-pagination.is-background .btn-next),
	:deep(.el-pagination.is-background .el-pager li) {
		background-color: var(--z-theme);
		color: var(--z-font-color);

		&.is-active {
			color: var(--z-nav-font-color);
		}
	}

	:deep(.el-pagination.is-background .btn-prev.is-active),
	:deep(.el-pagination.is-background .btn-next.is-active),
	:deep(.el-pagination.is-background .el-pager li.is-active) {
		background-color: var(--z-nav-hover);
	}

	:deep(.el-input__wrapper),
	:deep(.el-select__wrapper) {
		background-color: var(--z-theme);
		box-shadow: 0 0 0 1px var(--z-line, var(--z-line)) inset !important;
		input {
			color: var(--z-font-color);
		}
	}
}
</style>
