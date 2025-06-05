<script setup name="index">
import {onMounted, ref} from 'vue'

const tableRef = ref()
const loaidng = ref(false)
const onSubmit = (data) => {
	console.log('onSubmit', data)

	// formTest.value = {}
	loaidng.value = true
	setTimeout(() => (loaidng.value = false), 3000)
}
const formRef = ref()
const formTest = ref({abc21: 0, abc: 7777})
const formItemTest = ref()
const onFormChange = (val, item) => {}

const collapsed = ref(false)
const tableDefalutData = ref([])
const onEditChange = (val, record, row, rows, column) => {
	console.log('onEditChange', val, record, rows, column)
	// 行编辑
	if (column.prop === 'uui' || column.prop === 'def') {
		tableRef.value.setRowValue(row.id, 'defc', Number(row.uui) + Number(row.def))
	}
}
const onFormChanged = (scoped) => {
	// 表单变化
	if (scoped.item.prop === 'uui' || scoped.item.prop === 'def') {
		tableRef.value.setFormValue(
			'defc',
			Number(scoped.row?.uui || 0) + Number(scoped.row?.def || 0)
		)
	}
}
const onBeforeRowEdit = (row, column, event) => {
	// row.uui = 789
}
onMounted(() => {
	// tableDefalutData.value = [
	// 	{id: 'test1', uui: 0, def: 1},
	// 	{id: 'test2', uui: 1},
	// ]
})

const qqqq = (rule, value, callback) => {
	console.log('自定义校验', rule, value, callback)

	if (value <= 0 || !value) {
		callback(new Error('自定义校验'))
		return
	}

	callback()
}

const abc = [
	{
		prop: 'uui',
		label: '测试',
		type: 'text',
		// sortable: true,
		attrs: {align: 'left'},
		// tooltip: false,

		width: 400,
	},
	{
		prop: 'def',
		label: '测试2',
		type: 'text',
		formItemProps: {
			rules: [
				{
					required: true,
					validator: qqqq,
					trigger: 'blur',
				},
			],
		},
	},
	{
		prop: 'defc',
		label: '测试3',
		type: 'text',
		disabled: true,
	},
	{
		prop: 'checkbox',
		label: '测试4',
		type: 'checkbox',
		options: [
			{label: '选项1', value: 1},
			{label: '选项2', value: 2},
			{label: '选项3', value: 3},
		],
		formItemProps: {
			rules: [
				{
					required: true,
					validator: qqqq,
					trigger: 'blur',
				},
			],
		},
	},
]
const formItemRef = ref()
const handValidate = () => {
	const valid = formItemRef.value.validate()
	console.log('手动校验结果: ', valid)
}
const onButtonClick = () => {
	tableRef.value.cancelEdit(['test1'])
}
const showDialog = ref(true)
</script>
<template>
	<Block
		title="测试组件"
		:enableFixedHeight="true"
		:enableExpandButton="true"
		:enableExpand="true"
		:expandVertical="false"
		:enable-close-button="false"
		@collapsed="collapsed = $event"
	>
		<template #expand>
			<div class="search">
				<Form
					ref="formRef"
					v-model="formTest"
					:enable-button="true"
					:enable-label="true"
					:enable-button-vertical="false"
					:grid="false"
					:label-width="0"
					:column-count="3"
					buttonVertical="flowing"
					:rules="{
						age: [{required: true, message: '请输入年龄', trigger: 'blur'}],
					}"
					:props="[
						// {
						// 	prop: 'testgroup',
						// 	label: '测试分组',
						// 	children: [
						// 		{
						// 			prop: 'abc2',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc23',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc23',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc42',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 			children: [{prop: 'cccd', label: '测试2', type: 'text'}],
						// 		},
						// 	],
						// },
						// {
						// 	prop: 'age',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },
						{
							prop: 'age1',
							label: '年龄',
							type: 'text',
							inputType: 'number',
							disabled: false,
						},
						{
							prop: 'ag223e1',
							label: '年龄',
							type: 'select',
							inputType: 'number',
							disabled: false,
						},
						// {
						// 	prop: 'ag3232e1',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },
						// {
						// 	prop: 'a32g2e',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },
						// {
						// 	prop: 'testgroup3',
						// 	label: '测试分组',
						// 	children: [
						// 		{
						// 			prop: 'abc23',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc233',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc233',
						// 			label: '测试2',
						// 			type: 'text',
						// 			full: true,
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc423',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 		{
						// 			prop: 'abc4233',
						// 			label: '测试2',
						// 			type: 'text',
						// 			formItemProps: {
						// 				rules: [
						// 					{required: true, message: '分组校验', trigger: 'blur'},
						// 				],
						// 			},
						// 		},
						// 	],
						// },
						// {
						// 	prop: 'age3',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },

						// {
						// 	prop: 'abc',
						// 	label: '测试',
						// 	type: 'text',
						// 	labelWidth: '100px',

						// 	formItemProps: {
						// 		rules: [{required: true, message: '请输入年龄1', trigger: 'blur'}],
						// 	},
						// },
						// {
						// 	prop: 'age323',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },

						// {
						// 	prop: 'abc1',
						// 	label: '测试',
						// 	type: 'text',
						// 	labelWidth: '100px',
						// 	full: true,

						// 	formItemProps: {
						// 		rules: [{required: true, message: '请输入年龄1', trigger: 'blur'}],
						// 	},
						// },
					]"
					:enable-enter="true"
					:loading="loaidng"
					@change="onFormChange"
					@submit="onSubmit"
				>
				</Form>
			</div>
		</template>
		<LoadingTransition />
		<LoadingTransition color="#f00" />
		<Dialog v-model="showDialog" title="加载状态" :loading="true">
			<p style="width: 100%; height: 400px">123</p>
		</Dialog>
		<el-button @click="formRef.clear(true)">手动清空</el-button>
		<FormItem
			v-model="formItemTest"
			ref="formItemRef"
			:items="[
				{
					prop: 'formItemTest',
					type: 'text',
					label: '测试',
					formItemProps: {
						rules: [{required: true, validator: qqqq, trigger: 'blur'}],
						// rules: [{required: true, message: '请输入测试', trigger: 'blur'}],
					},
				},
			]"
			:rules="[{required: true, message: '请输入测试', trigger: 'blur'}]"
		></FormItem>
		<el-button @click="handValidate">手动校验</el-button>
		<div class="df aic">
			<Icons name="Home" color="#f00"></Icons>
			<Icons name="Setting" size="16px"></Icons>
			<Icons name="Create"></Icons>
			<Icons name="Edit"></Icons>
			<Icons name="Delete"></Icons>
			<Icons name="Send"></Icons>
			<Icons name="Cancel"></Icons>
			<Icons name="Reset"></Icons>
			<Icons name="Clear"></Icons>
			<Icons name="Clear2"></Icons>
			<Icons name="Eye"></Icons>
			<Icons name="Lock"></Icons>
			<Icons name="Unlock"></Icons>
			<Icons name="Warning"></Icons>
			<Icons name="Warning2"></Icons>
			<Icons name="User"></Icons>
			<Icons name="ArrowRight"></Icons>
			<Icons name="ArrowRight2"></Icons>
			<Icons name="RotateRight"></Icons>
			<Icons name="Sun"></Icons>
			<Icons name="Moon"></Icons>
			<Icons name="List"></Icons>
			<Icons name="File"></Icons>
			<Icons name="Upload"></Icons>
			<Icons name="Download"></Icons>
			<Icons name="Appendix"></Icons>
			<Icons name="Notifications"></Icons>
			<Icons name="Done"></Icons>
			<Icons name="Back"></Icons>
			<Icons name="More"></Icons>
			<Icons name="Language"></Icons>
			<Icons name="Thumbtack"></Icons>
			<Icons name="Loading"></Icons>
			<Icons name="Chat"></Icons>
		</div>

		<TableV2
			ref="tableRef"
			url="http://100.92.0.180:8001/api/newFeature/mission-objectives?taskName=&skipCount=0&maxResultCount=10"
			v-model="tableDefalutData"
			:headers="{
				Authorization:
					'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NDg0ODg0NjgsImV4cCI6MTc0ODY2MDQ2OCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWNjMzAtODU3MC1jMmE5LTM2M2E5M2U4ZTdmMSIsImF1dGhfdGltZSI6MTc0ODQ4NzA0NCwiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzk4MzcwMDk2MEBpbnNwdXIuY29tIiwieWt6LWlkIjoiMzU0MDkzIiwieWt6LWVtcGxveWVlLWNvZGUiOiJHRV8xNjM1MDg4MzA4MDcxODI5NTA0Iiwicm9sZSI6WyLliIbnrqHpooblr7wiLCLlj7DotKbkuIrkuIvnur8iLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5pWw5o2u5a-85Ye6Iiwi5pWw5o2u6aKG5a-8Il0sInBob25lX251bWJlciI6IjE2NjIzNjYzNjc4IiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjoiRmFsc2UiLCJlbWFpbF92ZXJpZmllZCI6IkZhbHNlIiwibmFtZSI6Inljc3Rqc2pnbGciLCJidXNpbmVzc1JvbGUiOiLmlbDmja7pooblr7ws5Yy65Y6_5Y-w6LSm6L-Q57u05ZGYLOaVsOaNruWvvOWHuiIsImRlcGFydG1lbnRJZCI6IjNhMGI0YjUwLTkwNjItZDMyZC1iYTNiLTYyYzhkODI4ODMxMyIsImJpZ0RlcGFydG1lbnRJZCI6IjNhMGI0YjUwLTkwNjItYmRlMy1lNjRlLTYxYTFmM2FlYzk5MCIsImlhdCI6MTc0ODQ4ODQ2OCwic2NvcGUiOlsiaW5zcHVyLWFicC1hcHBsaWNhdGlvbiIsImluc3B1ci1sZWRnZXIiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsicHdkIl19.G61InmQrwTZxKGng4_uo-UkspsgsmaddGofM5qe4HQMwDxcitdmzS_bxULZxbS0lsXMhs4IJ9vUkkOnP_ixpjVsNgl8mTaf9YK33aBEQX3b1r35wt0KxOMFKEoAIwyy9GfDfK2t7PvwtB3mXAA0-OXzIaldkvr6znKCWn4t0rLpcrHgVNPfd0TUrBZ2FUX1XbyNVAa1z-q4FhLaU_v_oC_-h0bmnTSlkoAZH1e-dDAYbBUcNV2PYWLx2rPNqo3zT1JX0Mld5vepSRp1z0DDsCG_Z3iCihr1sNHbDLWZiYqbX7cold0T79WpnGiNO_EVlQSIu_a4fIF1S8-lqjabb2w',
			}"
			:enableSelection="true"
			:auto-height="false"
			:form-column-count="2"
			:enableLatestData="false"
			:enable-row-edit="false"
			status="none"
			@edit-change="onEditChange"
			@form-changed="onFormChanged"
			@beforeRowEdit="onBeforeRowEdit"
			@click-button="onButtonClick"
			:buttons="[
				{
					label: '测试',
					type: 'primary',
				},
			]"
			:columns="abc"
			:form-rules="{
				uui: [{required: true, message: '请输入测试', trigger: 'blur'}],
			}"
		>
			<template #defbb="scoped">
				{{ scoped.row.defbb ? '男' : '女' }}
			</template>
			<template #defbaf="scoped">
				{{ scoped.row.defbaf?.map((item) => (item ? '男' : '女')).join(',') }}
			</template>
			<template #edit-defbcfb="scoped">
				<el-input size="small" v-model="scoped.row.defbcfb" @click.stop />
			</template>
		</TableV2>
	</Block>
</template>
<style scoped lang="scss"></style>
<route>
	{
		meta: {
			title: '首页'
		}
	}
</route>
