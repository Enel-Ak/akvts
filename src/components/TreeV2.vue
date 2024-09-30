<script setup>
import {nextTick, onMounted, ref, watch} from 'vue'
import axios from 'axios'

const emits = defineEmits(['update:modelValue', 'nodeClick'])
const props = defineProps({
	url: {type: String, default: ''},
	method: {type: String, default: 'get'},
	loading: {type: Boolean, default: false},
	data: {type: Array, default: () => []},
	props: {
		type: Object,
		default: () => ({value: 'id', label: 'name', children: 'children', grade: 'grade'}),
	},
	multiple: {type: Boolean, default: false},
	height: {type: Number, default: 300},

	enableRequest: {type: Boolean, default: true}, // 禁用请求则使用 data 数据
	enableFilter: {type: Boolean, default: true}, // 启用过滤

	filterPlaceholder: {type: String, default: '请输入关键字筛选部门'},

	checkOnClickNode: {type: Boolean, default: false}, // 点击节点即选中

	beforeLazyLoad: {type: Function, default: () => {}},
	grade: {type: [Number, String], default: 0},
})

const treeRef = ref()
const treeData = ref([])
const query = ref('')
const _reqParams = ref({})
const _loading = ref(false)

let currClickNode = null
let currExpandNodeIds = []

const GetList = (isLeaf = false, fn) => {
	console.log('TreeV2 GetList Start')

	if (_loading.value) return
	_loading.value = true

	axios
		.request({
			url: props.url,
			method: props.method,
			params: _reqParams.value,
		})
		.then((res) => {
			const {value, label, children} = props.props
			const items = res.data.items.map((item) => ({
				[value]: item[value],
				[label]: item[label],
				[children]: item[children] || [],
				[props.props.grade]: item[props.props.grade],
				raw: JSON.parse(JSON.stringify(item)),
			}))

			if (!isLeaf) {
				treeData.value = items
			} else {
				currClickNode.children = items

				if (!props.multiple && currClickNode.children.length > 0) {
					// currClickNode.disabled = true
					// treeRef.value.setChecked(currClickNode.id, false)
				}

				treeRef.value.setData(treeData.value)
				currClickNode = null
			}

			_loading.value = false

			nextTick(() => {
				const checkIds = treeRef.value.getCheckedNodes().map((x) => x.id)
				emits('update:modelValue', checkIds)
				fn && fn()
				console.log('TreeV2 GetList End')
			})
		})
}

const onQuery = () => treeRef.value.filter(query.value)

const onFilter = (query, node) => node[props.props.label].includes(query)

const onClickTreeNode = (data, node, e) => {
	if (props.checkOnClickNode) {
		console.log('TreeV2 onClickTreeNode', data, node, e)

		currClickNode = data
		if (!props.multiple) {
			emits('nodeClick', data, node, e)
		}
	}
}

const onCheck = (data, info) => {
	console.log('TreeV2 onCheck', data, info)

	const check = info.checkedKeys.some((x) => x === data.id)
	if (check) {
		currClickNode = data

		if (!props.multiple) {
			treeRef.value.setCheckedKeys(check ? [data.id] : [])
		}

		if (data.children.length === 0) {
			_reqParams.value = {parentId: data.id}

			props.beforeLazyLoad &&
				typeof props.beforeLazyLoad === 'function' &&
				props.beforeLazyLoad(_reqParams.value, data)

			if (data[props.props.grade] > props.grade) {
				emits('nodeClick', data, info)
			} else {
				GetList(true, () => {
					emits('nodeClick', data, info)
				})
			}
		} else {
			emits('nodeClick', data, info)
		}
	} else {
		currClickNode = null
		emits('nodeClick', null, info)
	}

	currExpandNodeIds.push(data.id)
	treeRef.value.setExpandedKeys(currExpandNodeIds)
}

const onNodeExpand = (node, data) => {
	currExpandNodeIds.push(node.id)
	treeRef.value.setExpandedKeys(currExpandNodeIds)
}

const onNodeCollapse = (node, data) => {
	currExpandNodeIds = currExpandNodeIds.filter((x) => x !== node.id)
	treeRef.value.setExpandedKeys(currExpandNodeIds)
}

watch(
	() => props.data,
	(val) => {
		console.log('TreeV2 data change')
		if (props.enableRequest) return
		treeData.value = val
	},
	{deep: true, immediate: true}
)

onMounted(() => {
	if (props.enableRequest && props.url) {
		GetList()
	} else {
		treeData.value = props.data
	}
})

defineExpose({
	getCurrentKey: () => treeRef.value.getCurrentKey(),
	getCheckedKeys: () => treeRef.value.getCheckedKeys(),
	getCheckedNodes: () => treeRef.value.getCheckedNodes(),
	setChecked: (key, checked) => treeRef.value.setChecked(key, checked),
	setCheckedKeys: (keys) => treeRef.value.setCheckedKeys(keys),
	setExpandedKeys: (keys) => treeRef.value.setExpandedKeys(keys),
	setCurrentKey: (key) => treeRef.value.setCurrentKey(key),
	setData: (data) => treeRef.value.setData(data),
})
</script>
<template>
	<div class="virtualized-tree-component">
		<div v-if="enableFilter" class="filter">
			<el-input v-model="query" :placeholder="filterPlaceholder" @input="onQuery" />
		</div>
		<el-tree-v2
			ref="treeRef"
			v-bind="$attrs"
			:data="treeData"
			:props="props.props"
			:height="enableFilter ? height - 38 : height"
			:filter-method="onFilter"
			:check-on-click-node="checkOnClickNode"
			@check="onCheck"
			@node-click="onClickTreeNode"
			@node-expand="onNodeExpand"
			@node-collapse="onNodeCollapse"
		>
			<template #default="{node}">
				<slot name="default" :node="node">
					<el-icon
						mr-3px
						v-if="
							(_loading && node.key === currClickNode?.id) ||
							(loading && node.key === currClickNode?.id)
						"
						class="loading-animation"
					>
						<Loading />
					</el-icon>
					<span :title="node.label" class="value">
						{{ node.label }}
						<template v-if="node?.data?.tips">{{ node?.data?.tips }}</template>
					</span>
				</slot>
			</template>
		</el-tree-v2>
	</div>
</template>
<style lang="scss" scoped>
.filter {
	height: 38px;
	padding: 0 0 10px 0;
}
.value {
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
