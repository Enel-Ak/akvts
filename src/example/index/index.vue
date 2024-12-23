<script setup>
import {onMounted, ref} from 'vue'
import {activated} from '@/hooks/useWasm'
import Record from '../../components/Record.vue'
import Toolbar from '../../components/Toolbar.vue'
const flowRef = ref()
const flowConfig = ref({
	id: 'abc',
	label: '发起人',
	type: 'input',
	childNode: [
		{
			id: 'def',
			label: '填报',
			type: 'report',
			childNode: [
				{
					id: 'ghi',
					label: '审核',
					type: 'review',
				},
			],
		},
	],
})
const recordData = ref([
	{label: '关联项目', time: '2021-08-06 12:20:00', user: '张三', text: '正常'},
	{
		label: '关联项目',
		time: '2021-08-07 12:20:00',
		user: '张三',
		text: '成功',
		type: 'success',
	},
	{label: '关联项目', time: '2021-08-08 12:20:00', user: '张三', text: '错误', type: 'error'},
	{
		label: '关联项目',
		time: '2021-08-09 12:20:00',
		user: '张三',
		text: '警告',
		type: 'warning',
	},
	{label: '关联项目', time: '2021-08-10 12:20:00', user: '张三', text: '危险', type: 'danger'},
	{label: '关联项目', time: '2021-08-11 12:20:00', user: '张三', text: '正在进行'},
])

const loaidng = ref(false)
const onSubmit = (data) => {
	console.log('onSubmit', data)

	formTest.value = {}
	loaidng.value = true
	setTimeout(() => (loaidng.value = false), 3000)
}
const formRef = ref()
const formTest = ref({abc21: 0, abc: 7777})
const formItemTest = ref(123)
const formItemTest2 = ref('')
const dialog = ref(false)
const onFormChange = (val, item) => {
	if (item.prop === 'abc2') {
		formRef.value.clear()
	}
}
const cascadeRef = ref()
const cascadeOneSelect = ref([9, 1, 11, 111])
const optionsaa = ref([
	{
		label: '紧凑型',
		value: 9,
		children: [
			{
				label: '选项1',
				value: 1,
				children: [
					{
						label: '选项2',
						value: 11,
						children: [{label: '选项22', value: 111, leaf: true}],
					},
					{label: '选项3', value: 12, leaf: true},
				],
			},
			{label: '选项4', value: 2, leaf: true},
			{label: '选项5', value: 3, leaf: true},
		],
	},
	{
		prop: 'second',
		label: '紧凑型2',
		value: 10,
		leaf: true,
	},
])

const cascadeOneSelect2 = ref({first: 2})
const options2 = ref([
	{
		prop: 'first',
		label: '远程联动1',
		type: 'select',
		casecadeUrl: '/api/first',
		// casecadeParams: {a: 1},
		beforeInitOptions: (val, next, item) => {
			next.casecadeParams = {a: 123}
		},
		options: [
			{label: '选项1', value: 1},
			{label: '选项2', value: 2},
			{label: '选项3', value: 3},
		],
	},
	{
		prop: 'second',
		type: 'select',
		label: '远程联动2',
		placeholder: '请选择上一级',
		casecadeUrl: '/api/second',
		casecadeParams: {b: 1},
	},
	{
		prop: 'three',
		type: 'select',
		label: '远程联动3',
		placeholder: '请选择上一级',
		casecadeUrl: '/api/three',
		casecadeParams: {c: 1},
	},
])
// setTimeout(() => cascadeRef.value.clear(), 5000)
const collapsed = ref(false)
const tableData = ref([])
const tableDefalutData = ref([])
const onEditChange = (val, record, row, column) => {
	console.log('onEditChange', val, record, row, column)

	setTimeout(() => {
		// tableDefalutData.value[0].abc = ''
		row.abc = ''
		console.log('row', row)
	}, 1000)
}
onMounted(() => {
	tableDefalutData.value = [
		{id: 'test1', defbcff: 0, abc: 1},
		{id: 'test2', defbcff: 1},
	]
	setTimeout(() => {
		tableDefalutData.value.push(
			...[
				{id: 'test3', defbcff: 2},
				{id: 'test4', defbcff: 3},
				{id: 'test5', defbcff: 4},
				{id: 'test6', defbcff: 5},
				{id: 'test7', defbcff: 6},
				{id: 'test8', defbcff: 7},
				{id: 'test9', defbcff: 8},
				{id: 'test10', defbcff: 9},
				{id: 'test11', defbcff: 10},
			]
		)
	}, 3000)
})
</script>
<template>
	<Akvts :key="Date.now()" code="jLV4CS$&&u98$h"></Akvts>
	<Watermark></Watermark>
	<Container :frame="['header', 'default', 'footer', 'aside']">
		<template #header> header</template>
		<template #aside> aside </template>
		<template #top> </template>
		<!-- <Toolbar></Toolbar> -->
		<!-- <Cascade v-model="cascadeOneSelect2" :options="options2" :vertical="true"></Cascade> -->
		<!-- <Cascade
			ref="cascadeRef"
			v-model="cascadeOneSelect"
			:options="optionsaa"
			:one-select="true"
			:one-select-props="{}"
			:show-all-levels="true"
			max-level="-1"
			placeholder="请选择紧凑型联动"
		>
			<template #default="scoped">{{ scoped }}</template>
		</Cascade> -->

		<!-- <el-button @click="dialog = true">下载</el-button> -->
		<!-- <Import v-model="dialog" :on-error="onError" /> -->
		<Dialog v-model="dialog"></Dialog>
		<Block
			title="测试组件"
			:enableFixedHeight="true"
			:enableExpandButton="true"
			:enableExpand="true"
			:expandVertical="false"
			@collapsed="collapsed = $event"
		>
			<template #expand> </template>
			<Form
				ref="formRef"
				v-model="formTest"
				:label-width="0"
				:props="[
					{prop: 'abc', label: '测试', type: 'text', labelWidth: '100px'},
					// {prop: 'abc3', label: '测试', type: 'datetimerange'},
					// {
					// 	prop: 'abc21',
					// 	label: '测试21',
					// 	type: 'radio',
					// 	options: [{label: '测试', value: 0}],
					// },
					// {
					// 	prop: 'abc2',
					// 	label: '测试2',
					// 	type: 'select',
					// 	options: [
					// 		{label: '测试', value: '1'},
					// 		{label: '测试2', value: '2'},
					// 		{label: '测试3', value: '3'},
					// 	],
					// 	attrs: {filterable: false, multiple: false, multipleLimit: 2},
					// },
				]"
				:enable-enter="false"
				:loading="loaidng"
				:do-not-clear="['abc2']"
				@change="onFormChange"
				@submit="onSubmit"
				class="pd-5"
			>
				<template #form-abc-right> 123 </template>
			</Form>
			<!-- <el-button @click="formRef.clear(true)">手动清空</el-button> -->
			<FormItem
				v-model="formItemTest"
				:items="[{prop: 'formItemTest', type: 'text', label: '测试'}]"
			></FormItem>
			<!--<FormItem
				v-model="formItemTest2"
				:items="[
					{
						prop: 'formItemTest2',
						type: 'select',
						label: '下拉',
						options: [{label: 'a', value: 1}],
					},
				]"
			></FormItem> -->
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
			</div>
			<!-- <Record title="历史记录" :data="recordData">
				<template #label="scoped">{{ scoped.item.label }}</template>
			</Record> -->
			<!-- :default-sort="{prop: 'abc', order: 'descending'}" -->

			{{ tableDefalutData }}
			<!-- :default-table-data="tableDefalutData" -->
			<TableV2
				v-model="tableDefalutData"
				:enableSelection="true"
				:auto-height="true"
				:form-column-count="2"
				:enableLatestData="false"
				:enable-row-edit="true"
				status="none"
				@edit-change="onEditChange"
				:buttons="[
					{
						label: '测试',
						type: 'primary',
					},
				]"
				:columns="[
					{
						prop: 'abc',
						label: '测试',
						type: 'text',
						// sortable: true,
						attrs: {align: 'left'},
						// tooltip: false,
					},
					{
						prop: 'def',
						label: '测试2',

						children: [
							{
								prop: 'defa',
								label: 'defa',
								type: 'select',
								options: [{label: '测试', value: 1}],
							},
							{
								prop: 'defb',
								label: 'defb',
								children: [
									{prop: 'defba', label: 'defba', type: 'datetime'},
									{
										prop: 'defbb',
										label: 'defbb',
										type: 'radio',
										options: [
											{label: '男', value: 1},
											{label: '女', value: 0},
										],
									},
									{
										prop: 'defbcf',
										label: 'defbcf',
										type: 'text',
										children: [
											{
												prop: 'defbaf',
												label: 'defba',
												type: 'checkbox',
												options: [
													{label: '男', value: 1},
													{label: '女', value: 0},
												],
											},
											{prop: 'defbbf', label: 'defbb', type: 'switch'},
											{prop: 'defbcf', label: 'defbc', type: 'text'},
										],
									},
									{prop: 'defbcff', label: 'defbcff', type: 'text'},
									{prop: 'defbcffe', label: 'defbcffe', type: 'text'},
									{prop: 'defbcfff', label: 'defbcfff', type: 'text'},
								],
							},
							{prop: 'defc', label: 'defc', type: 'text'},
							{prop: 'defd', label: 'defc', type: 'text'},
							{prop: 'defe', label: 'defc', type: 'text'},
						],
					},
				]"
			>
				<template #defbb="scoped">
					{{ scoped.row.defbb ? '男' : '女' }}
				</template>
				<template #defbaf="scoped">
					{{ scoped.row.defbaf?.map((item) => (item ? '男' : '女')).join(',') }}
				</template>
				<template #defbcf="scoped">
					<el-input size="small" v-model="scoped.row.defbcf" @click.stop />
				</template>
			</TableV2>
		</Block>
		<!-- <Flow ref="flowRef" v-model="flowConfig"></Flow> -->
	</Container>
</template>
<style scoped lang="scss"></style>
