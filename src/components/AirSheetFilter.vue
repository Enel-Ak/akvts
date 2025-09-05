<script setup>
import {computed, onMounted, ref, watch} from 'vue'
import {ElMessage} from 'element-plus'

const emits = defineEmits(['update:modelValue', 'confirm', 'confirmOnly'])
const props = defineProps({
	modelValue: {
		type: Object,
		default: null,
	},
	filterCol: {
		type: Array,
		default: () => [],
	},
	colIndex: {
		type: Number,
		default: -1,
	},
	// 当前筛选状态，用于同步选中项
	currentFiltered: {
		type: Array,
		default: () => [],
	},
})

const mask = ref(false)
const position = ref({top: 0, left: 0})
const filterList = ref([])
const checked = ref([])
const searchValue = ref('')

const onClose = () => {
	mask.value = false
	emits('update:modelValue', null)
}

const onConfirm = () => {
	// 确保colIndex是有效的
	if (props.colIndex === -1 || props.colIndex === undefined || props.colIndex === null) {
		console.error('AirSheetFilter - onConfirm: invalid colIndex', props.colIndex)
		ElMessage.error('列索引无效，无法执行筛选操作')
		return
	}

	// 过滤掉无效的选中项
	const validChecked = checked.value.filter(
		(item) => item !== undefined && item !== null && item !== ''
	)

	// 构建当前列的筛选条件
	const currentColumnFilters = validChecked.map((item) => ({
		v: item,
		c: props.colIndex,
	}))

	// 保留其他列的现有筛选条件，移除当前列的旧条件
	const otherColumnsFilters = (props.currentFiltered || []).filter(
		(filter) => filter && typeof filter.c === 'number' && filter.c !== props.colIndex
	)

	// 合并当前列的新筛选条件与其他列的现有筛选条件
	const mergedFilters = [...otherColumnsFilters, ...currentColumnFilters]

	console.log('AirSheetFilter - 筛选确认:', {
		列索引: props.colIndex,
		原始选中项: checked.value,
		有效选中项: validChecked,
		当前列筛选条件: currentColumnFilters,
		其他列筛选条件: otherColumnsFilters,
		合并后筛选条件: mergedFilters,
	})

	emits('confirm', mergedFilters)
	onClose()
}

const onClickOnly = (value) => {
	// 确保colIndex是有效的
	if (props.colIndex === -1 || props.colIndex === undefined || props.colIndex === null) {
		console.error('AirSheetFilter - onClickOnly: invalid colIndex', props.colIndex)
		ElMessage.error('列索引无效，无法执行筛选操作')
		return
	}

	// 构建当前列的筛选条件（仅筛选此项）
	const currentColumnFilter = [{v: value, c: props.colIndex}]

	// 保留其他列的现有筛选条件，移除当前列的旧条件
	const otherColumnsFilters = (props.currentFiltered || []).filter(
		(filter) => filter && typeof filter.c === 'number' && filter.c !== props.colIndex
	)

	// 合并当前列的新筛选条件与其他列的现有筛选条件
	const mergedFilters = [...otherColumnsFilters, ...currentColumnFilter]

	console.log('AirSheetFilter - 仅筛选此项:', {
		列索引: props.colIndex,
		筛选值: value,
		当前列筛选条件: currentColumnFilter,
		其他列筛选条件: otherColumnsFilters,
		合并后筛选条件: mergedFilters,
	})

	emits('confirm', mergedFilters)
	onClose()
}

watch(
	() => props.modelValue,
	(newVal) => {
		if (!newVal) return
		const rect = newVal.getBoundingClientRect()
		const container = newVal.closest('.air-sheet-component').getBoundingClientRect()
		let top = rect.top - 190
		let left = rect.left + 2

		if (rect.left + 330 >= container.left + container.width) {
			left = container.left + container.width - 332
		}

		position.value = {
			top,
			left,
		}
		mask.value = true
	}
)

watch(
	() => props.filterCol,
	(newVal) => {
		// 调试信息：筛选数据更新
		if (newVal?.length > 0) {
			console.log('AirSheetFilter - 筛选数据更新:', {
				列索引: props.colIndex,
				数据数量: newVal.length,
				数据样本: newVal.slice(0, 3),
			})
		}
		filterList.value = newVal
	}
)

// 监听当前筛选状态的变化，同步更新选中项
watch(
	[() => props.colIndex, () => props.currentFiltered],
	([newColIndex, newCurrentFiltered]) => {
		console.log('AirSheetFilter - 列索引同步:', {
			列索引: newColIndex,
			当前筛选条件数量: newCurrentFiltered?.length || 0,
			筛选数据数量: props.filterCol.length,
		})

		// 确保colIndex是有效的数字
		if (newColIndex === -1 || newColIndex === undefined || newColIndex === null) {
			console.log('AirSheetFilter - 列索引无效，清空选中项')
			checked.value = []
			return
		}

		// 根据当前列的筛选条件更新选中项
		const currentColFilters = (newCurrentFiltered || []).filter((filter) => {
			// 确保filter对象有效且列索引匹配
			return filter && typeof filter.c === 'number' && filter.c === newColIndex
		})

		console.log('AirSheetFilter - 当前列筛选条件:', {
			列索引: newColIndex,
			匹配的筛选条件: currentColFilters,
		})

		// 只更新当前列的选中项
		if (currentColFilters.length > 0) {
			checked.value = currentColFilters
				.map((filter) => filter.v)
				.filter((v) => v !== undefined && v !== null)
		} else {
			// 如果当前列没有筛选条件，清空当前列的选中项
			checked.value = []
		}

		console.log('AirSheetFilter - 选中项已更新:', checked.value)
	},
	{immediate: true, deep: true}
)
</script>
<template>
	<div v-show="mask" class="filter-layout" @click="onClose">
		<div
			class="box shadow-12"
			:style="{left: position.left + 'px', top: position.top + 'px'}"
			@click.stop
		>
			<div class="search">
				<el-input v-model="searchValue" placeholder="搜包含任一关键字" />
			</div>
			<div class="scroll">
				<el-checkbox-group v-if="filterList.length" v-model="checked">
					<template
						v-for="(item, index) of filterList.filter((item) =>
							item.v && searchValue ? item.v.includes(searchValue) : true
						)"
						:key="item.r"
					>
						<div class="item" v-if="item.v">
							<el-checkbox :label="item.v" :value="item.v" :key="index" />
							<span class="flx">{{ item.v }}</span>
							<el-button
								size="small"
								type="primary"
								class="only"
								@click="onClickOnly(item.v)"
							>
								仅筛选此项
							</el-button>
						</div>
					</template>
				</el-checkbox-group>
				<div v-else class="pd-20">
					<LoadingTransition text="数据加载中" />
				</div>
			</div>

			<div class="btns">
				<el-button @click="onClose">取消</el-button>
				<el-button type="primary" @click="onConfirm">确定</el-button>
			</div>
		</div>
	</div>
</template>
<style scoped lang="scss">
.filter-layout {
	height: calc(100% - 105px);
	left: 0;
	position: absolute;
	top: 105px;
	width: 100%;
	z-index: 10;

	.box {
		background-color: var(--z-theme);
		border-radius: 5px;

		position: absolute;
		// transform: translateX(-67.5%);
		max-height: 450px;
		width: 300px;
	}

	.search {
		margin: 10px 10px 0 10px;
	}

	.scroll {
		border-radius: 5px;
		border: 1px solid var(--z-line);
		margin: 10px;
		max-height: 300px;
		overflow: hidden;
		overflow-y: scroll;
		padding: 0 0 0 10px;
	}

	.item {
		align-items: center;
		display: flex;

		.only {
			display: none;
		}

		&:hover {
			.only {
				display: block;
			}
		}
	}

	.btns {
		border-top: 1px solid var(--z-line);
		padding: 8px;
		display: flex;
		justify-content: flex-end;
	}
}
</style>
