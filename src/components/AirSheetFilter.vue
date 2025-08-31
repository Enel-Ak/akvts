<script setup>
import {computed, onMounted, ref, watch} from 'vue'

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
	const output = checked.value.map((item) => ({v: item, c: props.colIndex}))
	emits('confirm', output)
	onClose()
}

const onClickOnly = (value) => {
	emits('confirmOnly', value)
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
		filterList.value = newVal
	}
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
