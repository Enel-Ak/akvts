<script setup>
import {ref} from 'vue'
import {Search} from '@element-plus/icons-vue'

const emits = defineEmits([
	'query',
	'collectChange',
	'transferChange',
	'addCollect',
	'deleteCollectGroup',
	'update:modelValue',
])

const props = defineProps({
	data: {type: Array, default: () => []}, // { key,label,disabled, false }
	collectOptions: {type: Array, default: () => []},

	collectPlaceholder: {type: String, default: '我的收藏'},
	queryPlaceholder: {type: String, default: '请输入关键字搜索'},

	enbableCollect: {type: Boolean, default: true},
	enbableSearch: {type: Boolean, default: true},

	titles: {type: Array, default: () => ['列表', '已选列表']},
})

const transferValue = ref([])
const collectValue = ref('')
const queryValue = ref('')

const filterMethod = (query, item) => {
	if (queryValue.value === '') return true
	return item.label?.toLowerCase().includes(queryValue.value?.toLowerCase())
}

const onQueryInput = () => {
	// 搜索内容
	console.log('Query input', queryValue.value)
	emits('query', queryValue.value)
}

const onCollectChange = () => {
	// 收藏组切换
	console.log('Collect change', collectValue.value)
	emits('collectChange', collectValue.value)
}

const onClickAddCollect = () => {
	// 加入收藏
	emits('addCollect', transferValue.value)
}

const onDeleteCollectGroup = (val, index) => {
	if (val === collectValue.value) {
		collectValue.value = ''
		transferValue.value = []
	}
	emits('deleteCollectGroup', val)
}

const onTransferChange = (val, direction, movedKeys) => {
	// 向右添加
	console.log('Transfer change', val, direction, movedKeys, props.data)
	const raws = props.data.filter((item) => val.join().includes(item.key)).map((item) => toRaw(item))
	emits('transferChange', val, direction, movedKeys, raws)
	emits('update:modelValue', transferValue.value)
}

defineExpose({
	getTransferValue: () => transferValue.value,
	setTransferValue: (val) => {
		if (Array.isArray(val)) {
			transferValue.value = val
		} else {
			transferValue.value.push(val)
		}
	},
})
</script>
<template>
	<div class="transfer-component">
		<div class="collect">
			<div class="collect-left">
				<slot name="collect-left"></slot>
				<el-select
					v-if="enbableCollect"
					v-model="collectValue"
					:placeholder="collectPlaceholder"
					clearable
					filterable
					style="margin-right: 20px; width: 40%"
					@change="onCollectChange"
				>
					<el-option
						v-for="(option, index) in collectOptions"
						:key="option.value"
						:label="option.label"
						:value="option.value"
					>
						<div class="transfer-component-collect-option">
							<span>{{ option.label }}</span>
							<span @click.stop="onDeleteCollectGroup(option.value, index)">&times;</span>
						</div>
					</el-option>
				</el-select>
			</div>
			<div class="collect-right">
				<slot name="collect-right"></slot>

				<span class="collect-btn" v-if="enbableCollect" @click="onClickAddCollect">
					加入收藏
					<i v-if="collectValue" class="icon i-ic-baseline-star" style="color: var(--z-main)"></i>
					<i v-else class="icon i-ic-baseline-star-border"></i>
				</span>
			</div>
		</div>
		<div class="search" v-if="enbableSearch">
			<slot name="search-left"></slot>
			<slot name="search">
				<el-input v-model="queryValue" :placeholder="queryPlaceholder" @input="onQueryInput">
					<template #prefix>
						<el-icon class="el-input__icon"><Search /></el-icon>
					</template>
				</el-input>
			</slot>
			<slot name="search-right"></slot>
		</div>
		<el-transfer
			v-model="transferValue"
			v-bind="$attrs"
			:data="data"
			:titles="titles"
			:filter-method="filterMethod"
			@change="onTransferChange"
		>
			<template #default="{option}">
				<slot name="default" :option="option">
					<span>{{ option.label }}</span>
				</slot>
			</template>
		</el-transfer>
		<div class="footer">
			<slot name="footer"></slot>
		</div>
	</div>
</template>
<style scoped lang="scss">
.transfer-component {
	.collect {
		display: flex;
		margin-bottom: 5px;

		&-left {
			align-items: center;
			display: flex;
			flex: 1;
		}

		&-right {
			align-items: center;
			display: flex;
			justify-content: flex-end;
		}

		.collect-btn {
			align-items: center;
			cursor: pointer;
			display: flex;
		}
	}

	.search {
		align-items: center;
		display: flex;
		flex-wrap: nowrap;
		margin-bottom: 5px;
		> * {
			flex: 1;
		}
	}

	:deep(.el-transfer-panel) {
		background-color: var(--z-theme);
		margin-bottom: 5px;
		width: calc(50% - 82px);

		.el-checkbox__label {
			color: var(--z-font-color) !important;
			font-size: 14px !important;
		}

		.el-transfer-panel__header {
			border-color: var(--z-line);
			background-color: var(--z-bg-secondary);
		}

		.el-transfer-panel__body {
			border-color: var(--z-line);
			background-color: var(--z-theme);
		}
	}
}
</style>
<style>
.transfer-component-collect-option {
	align-content: center;
	display: flex;

	&:hover {
		span:nth-child(2) {
			opacity: 1;
		}
	}

	span:nth-child(1) {
		flex: 1;
	}

	span:nth-child(2) {
		cursor: pointer;
		font-size: 16px;
		opacity: 0;
		transition: all 0.15s linear;
		transform: translate3d(15px, -2px, 0);
		&:hover {
			transform: translate3d(15px, -2px, 0) scale(1.2);
		}
	}
}
</style>
