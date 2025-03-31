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
	tableDefalutData.value = [
		{id: 'test1', uui: 0, def: 1},
		{id: 'test2', uui: 1},
	]
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
</script>
<template>
	<Block
		title="测试组件"
		:enableFixedHeight="true"
		:enableExpandButton="true"
		:enableExpand="true"
		:expandVertical="true"
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
					:column-count="4"
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
						{
							prop: 'age',
							label: '年龄',
							type: 'text',
							inputType: 'number',
							disabled: false,
						},
						// {
						// 	prop: 'age1',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },
						// {
						// 	prop: 'ag223e1',
						// 	label: '年龄',
						// 	type: 'text',
						// 	inputType: 'number',
						// 	disabled: false,
						// },
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
		<el-button @click="formRef.clear(true)">手动清空</el-button>
		<FormItem
			v-model="formItemTest"
			ref="formItemRef"
			:items="[
				{
					prop: 'formItemTest',
					type: 'text',
					label: '测试',
					// formItemProps: {
					// rules: [{required: true, validator: qqqq, trigger: 'blur'}],
					// rules: [{required: true, message: '请输入测试', trigger: 'blur'}],
					// },
				},
			]"
			:rules="[{required: true, message: '请输入测试', trigger: 'blur'}]"
		></FormItem>
		<el-button @click="handValidate">手动校验</el-button>
		<div class="df aic">
			<Icons icon-name="Home" color="#f00"></Icons>
			<Icons icon-name="Setting" size="16px"></Icons>
			<Icons icon-name="Create"></Icons>
			<Icons icon-name="Edit"></Icons>
			<Icons icon-name="Delete"></Icons>
			<Icons icon-name="Send"></Icons>
			<Icons icon-name="Cancel"></Icons>
			<Icons icon-name="Reset"></Icons>
			<Icons icon-name="Clear"></Icons>
			<Icons icon-name="Clear2"></Icons>
			<Icons icon-name="Eye"></Icons>
			<Icons icon-name="Lock"></Icons>
			<Icons icon-name="Unlock"></Icons>
			<Icons icon-name="Warning"></Icons>
			<Icons icon-name="Warning2"></Icons>
			<Icons icon-name="User"></Icons>
			<Icons icon-name="ArrowRight"></Icons>
			<Icons icon-name="ArrowRight2"></Icons>
			<Icons icon-name="RotateRight"></Icons>
			<Icons icon-name="Sun"></Icons>
			<Icons icon-name="Moon"></Icons>
			<Icons icon-name="List"></Icons>
			<Icons icon-name="File"></Icons>
			<Icons icon-name="Upload"></Icons>
			<Icons icon-name="Download"></Icons>
			<Icons icon-name="Appendix"></Icons>
			<Icons icon-name="Notifications"></Icons>
			<Icons icon-name="Done"></Icons>
			<Icons icon-name="Back"></Icons>
			<Icons icon-name="More"></Icons>
			<Icons icon-name="Language"></Icons>
			<Icons icon-name="Thumbtack"></Icons>
			<Icons icon-name="Loading"></Icons>
		</div>

		<TableV2
			ref="tableRef"
			v-model="tableDefalutData"
			:enableSelection="true"
			:auto-height="true"
			:form-column-count="2"
			:enableLatestData="false"
			:enable-row-edit="true"
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
