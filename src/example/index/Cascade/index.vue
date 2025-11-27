<script setup name="cascade">
import {ref} from 'vue'

const cascadeOneSelect = ref([
	'3a0b4b50-9061-26e0-d633-12bb0dc27ac7',
	'3a0e01e0-102e-3e04-8fbf-5c6db34cf063',
])
const token =
	'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjQyMzY3MzksImV4cCI6MTc2NDQwODczOSwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI0YjYyLWQxMzUtMzkwMy0wNTg5LWI3ZjUyMDczNDg3MSIsImF1dGhfdGltZSI6MTc2NDIzNTIzOSwiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei1zZGFnX3pqYkBpbnNwdXIuY29tIiwieWt6LWVtcGxveWVlLWNvZGUiOiJHRV8yNzY0Nzk4NzgyNjc3MzY1MzEiLCJ5a3otaWQiOiIyMjc4Iiwicm9sZSI6WyLku7vliqHnrqHnkIbov5vluqYiLCLliqDop6Plr4YiLCLlj7DotKbkuIrkuIvnur8iLCLlj7DotKbov5Dnu7TlkZgiLCLlnKjnur_loavmiqUiLCLlnLrmma_orr7orqEiLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5aSn5bGP5p-l55yLIiwi5biC5Yy66am-6am26IixIl0sInBob25lX251bWJlcl92ZXJpZmllZCI6IkZhbHNlIiwiZW1haWxfdmVyaWZpZWQiOiJGYWxzZSIsIm5hbWUiOiJ5a3otc2RhZ196amIiLCJidXNpbmVzc1JvbGUiOiLlt6XkvZzkurrlkZgs5pWw5o2u6aKG5a-8LOaVsOaNruWvvOWHuiIsImRlcGFydG1lbnRJZCI6IjNhMGI0YjUwLThmNzUtMzE4ZC1mZDk5LTRjNjFmOWViYjE3ZiIsImJpZ0RlcGFydG1lbnRJZCI6IjNhMGI0YjUwLThmNzUtNzU3Yi1iOWY4LTRiNzE5MjA4OGE0NiIsImlhdCI6MTc2NDIzNjczOSwic2NvcGUiOlsiaW5zcHVyLWFicC1hcHBsaWNhdGlvbiIsImluc3B1ci1sZWRnZXIiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsicHdkIl19.tghekac1OYLuOyLK4JtKoqN57b8McoZbiettrb6bhuaERqQb_qgnLgRfKwqTZy-T9G4PSdeKp4DAz0UFFg_oKVRuKQPySEfTtb9K50dkIFo_oJIoTLsCGX8QCRG5pvWYq_fxGSWkgk8rzJon_Ycy7puKpNoZTDoUX0fKU31rJrrhTHMNvWr3-CL9HRtJWWVFrvKRqIQ_fzeEZ3CjTjzHCkOW0nWLGqhWykqVJnWbdkNjahbEG1MfVQWtwyutQsyWaynR7M6AjIkuS-Mubnc5rUEU0S39FiatdOWgZxeUJ3smewNbUNW841s7JLblKAIy0QMC56Y18Y1uBRn0rFbkjw'
const cascade = ref({first: 2, second: 21, three: 211})
const onsSelectProps = ref({
	lazy: true,
	url: '/api/platform/department/user-management-department-list',
	method: 'GET',
	multiple: false,
	headers: {
		Authorization: `Bearer ${token}`,
	},
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
	first: '3a0b36e8-d60d-88f6-c379-6024376da7c8',
	second: '3a0b36e8-d60d-f439-a5ef-b5ae838dd26c',
	three: '3a0b36e8-d60d-2865-8ed8-ab633add58a4',
})
const options2 = ref([
	{
		prop: 'first',
		label: '远程联动1',
		type: 'select',

		cascadeUrl: 'http://100.92.2.93:8081/api/platform/department/my-region-names',
		cascadeParams: {},
		headers: {
			Authorization: `Bearer ${token}`,
		},
		beforeInitOptions: (val, next, item) => {
			const id = item.options.find((o) => o.value === val)?.raw.id
			if (id) {
				next.cascadeParams = {guid: id}
			}
		},
		options: [],
	},
	{
		prop: 'second',
		type: 'select',
		label: '远程联动2',
		placeholder: '请选择上一级',

		cascadeUrl: 'http://100.92.2.93:8081/api/platform/department/my-region-names',
		cascadeParams: {},
		headers: {
			Authorization: `Bearer ${token}`,
		},
		beforeInitOptions: (val, next, item) => {
			const id = item?.options?.find((o) => o.value === val)?.raw.id
			if (id) {
				next.cascadeParams = {guid: id}
			}
		},
	},
	{
		prop: 'three',
		type: 'select',
		label: '远程联动3',
		placeholder: '请选择上一级',

		cascadeUrl: 'http://100.92.2.93:8081/api/platform/department/my-region-names',
		cascadeParams: {},
		headers: {
			Authorization: `Bearer ${token}`,
		},
		beforeInitOptions: (val, next, item) => {
			console.log(4444, val, next, item)

			const id = item?.options?.find((o) => o.value === val)?.raw.id
			if (id) {
				next.cascadeParams = {guid: id}
			}
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
			next.cascadeParams = {a: 123}
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
		<!-- <Cascade
			v-model="cascadeOneSelect"
			:options="options"
			:one-select="true"
			:one-select-props="onsSelectProps"
			:show-all-levels="true"
			max-level="-1"
			placeholder="请选择紧凑型联动"
		></Cascade> -->

		<br />
		{{ abc }}
		<Cascade v-model="abc" :options="options2" :vertical="true"></Cascade>
		<br />
		<!-- <Cascade v-model="cascade" :options="options3" :static="true"></Cascade> -->
		<el-button @click="onClickClear">清空</el-button>
		{{ cascade }}
	</div>
</template>
<route>
    {
        meta: {
            title: '级联',
        },
    }
</route>
<style scoped lang="scss"></style>
