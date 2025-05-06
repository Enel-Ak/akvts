<script setup name="cascade">
import {ref} from 'vue'

const cascadeOneSelect = ref([
	'3a0b4b50-9061-26e0-d633-12bb0dc27ac7',
	'3a0e01e0-102e-3e04-8fbf-5c6db34cf063',
])
const cascade = ref({first: 2, second: 21, three: 211})
const onsSelectProps = ref({
	lazy: true,
	url: '/api/platform/department/user-management-department-list',
	method: 'GET',
	multiple: false,
	beforeCompleted: (node, data, query) => {
		query = {
			parentId: node.value,
		}
		return {data, query}
	},
})
const options = ref([
	// {
	// 	label: '紧凑型',
	// 	value: 9,
	// 	children: [
	// 		{
	// 			label: '选项1',
	// 			value: 1,
	// 			children: [
	// 				{label: '选项2', value: 11, children: [{label: '选项22', value: 111, leaf: true}]},
	// 				{label: '选项3', value: 12, leaf: true},
	// 			],
	// 		},
	// 		{label: '选项4', value: 2, leaf: true},
	// 		{label: '选项5', value: 3, leaf: true},
	// 	],
	// },
	// {
	// 	prop: 'second',
	// 	label: '紧凑型2',
	// 	value: 10,
	// 	leaf: true,
	// },
])

const abc = ref({
	first: 'bf393e50e26249e8a97bf72019555fe6',
	second: 'c02c0d1a73f344d19ce150636781038d',
	three: '',
})
const options2 = ref([
	{
		prop: 'first',
		label: '远程联动1',
		type: 'select',
		method: 'GET',
		casecadeUrl: '/api/ledger-service/ledger-runway-manages/get-runway-List',
		casecadeParams: {},
		beforeInitOptions: (val, next, item) => {
			next.casecadeParams.systematicType = 2
			next.casecadeParams.parentId = val
		},
		options: [
			{
				label: '党的建设',
				value: 'bf393e50e26249e8a97bf72019555fe6',
			},
			{
				label: '经济发展',
				value: 'b426adcfb10e417d94fd44647b5061fb',
			},
			{
				label: '民生服务',
				value: 'dae6c0c7006d4962adb655d7bceab6b6',
			},
			{
				label: '平安法治',
				value: '04a2b2a6bf3a436480d99bd086330384',
			},
		],
	},
	{
		prop: 'second',
		type: 'select',
		label: '远程联动2',
		placeholder: '请选择上一级',
		method: 'GET',
		casecadeUrl: '/api/ledger-service/ledger-runway-manages/get-runway-List',
		casecadeParams: {},
		beforeInitOptions: (val, next, item) => {
			next.casecadeParams.systematicType = 2
			next.casecadeParams.parentId = val
		},
	},
	{
		prop: 'three',
		type: 'select',
		label: '远程联动3',
		placeholder: '请选择上一级',
		method: 'GET',
		casecadeUrl: '/api/ledger-service/ledger-runway-manages/get-runway-List',
		casecadeParams: {},
		beforeInitOptions: (val, next, item) => {
			next.casecadeParams.systematicType = 2
			next.casecadeParams.parentId = val
		},
	},
])

const options3 = ref([
	{
		prop: 'first',
		label: '静态数据',
		type: 'select',
		filterable: true,
		beforeInitOptions: (val, next, item) => {
			next.casecadeParams = {a: 123}
		},
		options: [
			{
				label: '选项1',
				value: 1,
				children: [
					{label: '选项1-1', value: 11},
					{label: '选项1-2', value: 12},
					{label: '选项1-3', value: 13},
				],
			},
			{
				label: '选项2',
				value: 2,
				children: [
					{
						label: '选项2-1',
						value: 21,
						children: [
							{
								label: '选项2-1-1',
								value: 211,
								children: [{label: '选项2-1-1-1', value: 2111}],
							},
						],
					},
				],
			},
			{label: '选项3', value: 3, children: [{label: '选项3-1', value: 31}]},
		],
		// value: 2,
	},
	{
		prop: 'second',
		type: 'select',
		placeholder: '请选择上一级',
		// multiple: true, // 多选不支持联动
		// value: 21,
		// disabled: true,
	},
	{
		prop: 'three',
		type: 'select',
		placeholder: '请选择上一级',
	},
	{
		prop: 'four',
		type: 'select',
		placeholder: '请选择上一级',
	},
])

const onClickClear = () => {
	cascadeOneSelect.value = []
	cascade.value = {}
}
</script>
<template>
	<div>
		{{ cascadeOneSelect }}
		<!-- 静态联动数据用 options -->
		<Cascade
			v-model="cascadeOneSelect"
			:options="options"
			:one-select="true"
			:one-select-props="onsSelectProps"
			:show-all-levels="true"
			max-level="-1"
			placeholder="请选择紧凑型联动"
		></Cascade>

		<br />
		<Cascade v-model="abc" :options="options2" :vertical="true"></Cascade>
		<br />
		<Cascade v-model="cascade" :options="options3" :static="true"></Cascade>
		<el-button @click="onClickClear">清空</el-button>
		{{ cascade }}
	</div>
</template>
<style scoped lang="scss"></style>
