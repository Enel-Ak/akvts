<script setup>
import {nextTick, onMounted, ref} from 'vue'

const emits = defineEmits(['nodeClick', 'check', 'update:modelValue'])
const props = defineProps({
	moduleValue: {
		type: [String, Number, Array, Object],
		default: '',
	},
	keys: {
		type: Array,
		default: () => ['id', 'label', 'children'],
	},
	data: {
		type: Array,
		default: () => [],
	},
	trigger: {
		type: String,
		default: 'click', // clicl, hover
	},
	placeholder: {
		type: String,
		default: '请选择',
	},
	height: {
		type: Number,
		default: 114,
	},
	enableFilter: {
		type: Boolean,
		default: false,
	},
	enableCheckbox: {
		type: Boolean,
		default: false,
	},
	multiple: {
		type: Boolean,
		default: false,
	},
	max: {
		// 多选显示最大数量
		type: Number,
		default: 1,
	},
	tagsWidth: {
		type: Number,
		default: 200,
	},

	checkOnClickNode: {
		type: Boolean,
		default: false,
	},
})

const selectTreeRef = ref()
const treeRef = ref()

const isOpen = ref(false)
const treeProps = {
	label: props.keys[1],
	value: props.keys[0],
	children: props.keys[2],
}
const id = ref('ST' + Math.random().toString(36).slice(-10))
const inputValue = ref({[props.keys[0]]: '', [props.keys[1]]: ''})
const inputValues = ref([])

const onTrigger = (needClose = true) => {
	if (isOpen.value && needClose) {
		onClose()
		id.value = 'ST' + Math.random().toString(36).slice(-10)
		return
	}
	nextTick(() => {
		const tree = selectTreeRef.value.querySelector('.select-tree-dropdown')
		const label = selectTreeRef.value.querySelector('.label')
		const {top, left, width} = label.getBoundingClientRect()

		if (!tree) return

		tree.setAttribute('id', id.value)

		tree.style.top = top + label.offsetHeight + 5 + 'px'
		tree.style.left = left + 'px'
		tree.style.width = width + 20 + 'px'
		tree.style.opacity = 1
		tree.style.zIndex = 3000

		tree.addEventListener('click', onClickOption)

		document.body.appendChild(tree)

		isOpen.value = true

		setTimeout(() => {
			tree.style.height = props.height + 30 + 'px'
		}, 16.7)
	})
}

const onClose = () => {
	const prevTree = document.querySelector(`#${id.value}`)
	if (prevTree) {
		prevTree.classList.add('remove')
		setTimeout(() => {
			selectTreeRef.value.appendChild(prevTree)
			prevTree.classList.remove('remove')
			prevTree.style = ''
		}, 150)
	}
	isOpen.value = false
}

const onClickOption = (e) => {
	e.stopPropagation()
}

const onClickNode = (data, node) => {
	console.log('Select Tree Click Node: ', data, node)
	if (!props.multiple) {
		inputValue.value = data
	}
	emits('nodeClick', {data, node})

	if (props.multiple) return
	emits('update:modelValue', data)
}

const onClickCheck = (
	data,
	info = {checkedKeys, checkedNodes, halfCheckedKeys, halfCheckedNodes}
) => {
	console.log('Select Tree Click Check: ', data, info)
	if (!props.multiple) {
		treeRef.value?.setCheckedKeys([data[props.keys[0]]])
	} else {
		inputValues.value = info.checkedNodes.filter((node) => !node.children)
	}
	emits('check', !props.multiple ? {data, info} : inputValues.value)

	if (!props.multiple) return
	emits('update:modelValue', inputValues.value)
}

const onInput = (query) => {
	if (!props.enableFilter) return
	treeRef.value?.filter(query)
	onTrigger(false)
}

const filterMethod = (query, node) => {
	return node.label?.includes(query)
}

const onCloseTag = (node) => {
	treeRef.value?.setChecked(node[props.keys[0]], false)
	inputValues.value = inputValues.value.filter(
		(item) => item[props.keys[0]] !== node[props.keys[0]]
	)
}

onMounted(() => {
	document.addEventListener('click', (e) => {
		if (!selectTreeRef.value.contains(e.target)) {
			onClose()
		}
	})
})

defineExpose({
	getTreeRef: () => treeRef.value,
})
</script>
<template>
	<div ref="selectTreeRef" class="select-tree-component">
		<div class="label" @[trigger]="onTrigger">
			<el-input
				v-if="!props.multiple"
				v-model="inputValue[keys[1]]"
				:readonly="!enableFilter"
				:placeholder="enableFilter ? '请输入关键字筛选节点' : placeholder"
				@input="onInput"
			/>
			<template v-else>
				<div class="select-tree-component-tags">
					<template v-for="(node, index) in inputValues" :key="node[keys[0]]">
						<el-tag v-if="index < $props.max" closable @close="onCloseTag(node)">
							{{ node[keys[1]] }}
						</el-tag>
					</template>

					<el-dropdown v-if="inputValues.length > $props.max">
						<span class="el-dropdown-link">
							<el-tag>+{{ inputValues.length - $props.max }}</el-tag>
						</span>
						<template #dropdown>
							<el-dropdown-menu>
								<div
									class="select-tree-component-tags-more"
									:style="{width: tagsWidth + 'px'}"
								>
									<template v-for="(node, index) of inputValues">
										<el-tag
											v-if="index > $props.max - 1"
											closable
											:title="node[keys[1]]"
											@close="onCloseTag(node)"
										>
											{{ node[keys[1]] }}
										</el-tag>
									</template>
								</div>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</div>
				<el-input
					v-model="inputValue[keys[1]]"
					:readonly="!enableFilter"
					:placeholder="enableFilter ? '请输入关键字筛选节点' : placeholder"
					@input="onInput"
				></el-input>
			</template>
			<el-icon :class="{active: isOpen}"><ArrowDown /></el-icon>
		</div>
		<div class="select-tree-dropdown">
			<el-tree-v2
				ref="treeRef"
				v-bind="$attrs"
				:data="data"
				:props="treeProps"
				:height="height"
				:filter-method="filterMethod"
				:show-checkbox="enableCheckbox && multiple"
				:check-on-click-node="checkOnClickNode"
				@node-click="onClickNode"
				@check="onClickCheck"
				class="shadow-3"
			>
				<template #default="{node}">
					<slot :name="node.data.prop" :node="node">
						<span>{{ node.label }}</span>
					</slot>
				</template>
			</el-tree-v2>
		</div>
	</div>
</template>
<style scoped lang="scss">
.select-tree-component {
	position: relative;
	width: 100%;
	.label {
		align-items: center;
		cursor: pointer;
		display: flex;
		transition: all 0.15s linear;

		:deep(input) {
			cursor: pointer;
		}

		> i {
			position: absolute;
			right: 10px;
			&.active {
				transform: rotate(180deg);
			}
		}
	}
}
</style>
<style>
.select-tree-dropdown {
	height: 0;
	left: 0;
	opacity: 0;
	overflow: hidden;
	position: absolute;
	padding: 10px;
	margin: 0 -10px;
	transition: all 0.15s linear;
	z-index: 256;

	&.remove {
		opacity: 0 !important;
		height: 0 !important;
	}

	&::after {
		content: '';
		position: absolute;
		border: 6px solid transparent;
		border-bottom-color: var(--z-theme);
		left: calc(50% - 3px);
		top: -1px;
	}
	&::before {
		content: '';
		position: absolute;
		border: 6px solid transparent;
		border-bottom-color: var(--z-line);
		left: calc(50% - 3px);
		top: -2px;
	}

	.el-tree {
		border-radius: 5px;
		background: var(--z-theme);
		border: 1px solid var(--z-line);
		color: var(--z-font-color);
		max-width: 100% !important;
		padding: 5px;
		overflow: hidden;
		width: 100%;
	}
}

.select-tree-component-tags {
	align-items: center;
	display: flex;
	.el-tag {
		margin-right: 5px;
	}
}

.select-tree-component-tags-more {
	align-items: flex-start;
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	margin: -4px 0;
	padding: 5px;

	.el-tag {
		margin-right: 5px;
		margin-bottom: 5px;
		width: 31.5%;
		&:nth-child(3n) {
			margin-right: 0;
		}

		span {
			overflow: hidden;
			text-overflow: ellipsis;
		}
	}
}
</style>
