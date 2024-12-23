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
const abcd = [
	{
		prop: 'City',
		label: '所属城市',
		sort: 1,
		raw: {
			name: 'City',
			displayName: '所属城市',
			type: 'string',
			sort: 1,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a7f3-95eb-5442-6d0f77d52e16',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'District',
		label: '所属区县',
		sort: 2,
		raw: {
			name: 'District',
			displayName: '所属区县',
			type: 'string',
			sort: 2,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a7fb-351d-86d6-840e222b16ae',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'Street',
		label: '所属街镇',
		sort: 3,
		raw: {
			name: 'Street',
			displayName: '所属街镇',
			type: 'string',
			sort: 3,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a802-45fb-2e64-c264450feda6',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'Community',
		label: '所属村社',
		sort: 4,
		raw: {
			name: 'Community',
			displayName: '所属村社',
			type: 'string',
			sort: 4,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a808-d05a-97ca-a21fef87f521',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'UpdateTime',
		label: '更新时间',
		sort: 5,
		raw: {
			name: 'UpdateTime',
			displayName: '更新时间',
			type: 'datetime',
			sort: 5,
			required: false,
			isNullable: true,
			maxLength: 0,
			index: false,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a810-297c-c4ed-7f2ef621b6ce',
		},
		type: 'datetime',
		width: 180,
	},
	{
		prop: 'Informant',
		label: '填报人',
		sort: 6,
		raw: {
			name: 'Informant',
			displayName: '填报人',
			type: 'string',
			sort: 6,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a816-f211-0c3a-ca5c5a31ebdd',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'Editor',
		label: '编辑人',
		sort: 7,
		raw: {
			name: 'Editor',
			displayName: '编辑人',
			type: 'string',
			sort: 7,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a81c-bb46-3959-e57df56cdbc4',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'DataSource',
		label: '数据来源',
		sort: 8,
		raw: {
			name: 'DataSource',
			displayName: '数据来源',
			type: 'string',
			sort: 8,
			required: false,
			isNullable: true,
			maxLength: 500,
			index: true,
			isUnique: false,
			isListField: true,
			isQueryField: true,
			isExportField: true,
			isDepartmentField: true,
			isDepartmentEditField: true,
			desensitizationType: null,
			tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
			tableDataSetId: null,
			dbTableFieldId: null,
			editDisabled: false,
			multiple: null,
			options: [],
			displayForm: null,
			tableFieldGroupId: null,
			precision: null,
			customValueLimit: null,
			clientSettings: [],
			calculateRule: null,
			relevanceCalculateRule: null,
			customValueOptions: [],
			validationRule: null,
			fieldMultipleDto: null,
			id: '3a16ead7-a825-b235-f75e-9d9b63136f72',
		},
		type: 'text',
		width: 180,
	},
	{
		prop: 'table-group-9noip8c6zzr-prop',
		label: '基础信息',
		children: [
			{
				prop: 'XM',
				label: '姓名',
				sort: 12,
				raw: {
					name: 'XM',
					displayName: '姓名',
					type: 'string',
					sort: 12,
					required: false,
					isNullable: false,
					maxLength: 500,
					index: true,
					isUnique: true,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '2ea73d25-51b0-2d5e-52e1-cba02d35e1b4',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a829-9113-9619-2022c32abaf6',
				},
				type: 'text',
			},
			{
				prop: 'NL',
				label: '年龄',
				sort: 13,
				raw: {
					name: 'NL',
					displayName: '年龄',
					type: 'int',
					sort: 13,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '2ea73d25-51b0-2d5e-52e1-cba02d35e1b4',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a82f-281b-b3b8-2de42e9d920f',
				},
				inputType: 'number',
				type: 'text',
			},
		],
		sort: 9,
		raw: {
			name: '基础信息',
			style: 'center',
			sort: 9,
			parentId: null,
			tableFields: [
				{
					name: 'XM',
					displayName: '姓名',
					type: 'string',
					sort: 12,
					required: false,
					isNullable: false,
					maxLength: 500,
					index: true,
					isUnique: true,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '2ea73d25-51b0-2d5e-52e1-cba02d35e1b4',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a829-9113-9619-2022c32abaf6',
				},
				{
					name: 'NL',
					displayName: '年龄',
					type: 'int',
					sort: 13,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '2ea73d25-51b0-2d5e-52e1-cba02d35e1b4',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a82f-281b-b3b8-2de42e9d920f',
				},
			],
			id: '2ea73d25-51b0-2d5e-52e1-cba02d35e1b4',
		},
		width: 360,
	},
	{
		prop: 'table-group-88t1i7lwgxy-prop',
		label: '附属信息',
		children: [
			{
				prop: 'JE',
				label: '金额',
				sort: 14,
				raw: {
					name: 'JE',
					displayName: '金额',
					type: 'decimal',
					sort: 14,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: 3,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a834-de1f-fce9-c6cafd87fe66',
				},
				inputType: 'number',
				type: 'text',
			},
			{
				prop: 'DX',
				label: '多选',
				sort: 15,
				raw: {
					name: 'DX',
					displayName: '多选',
					type: 'string',
					sort: 15,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: true,
					options: ['AA', 'BB', 'CC', 'DD'],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a838-de19-3017-3caf69062c8b',
				},
				options: [
					{
						value: 'AA',
						label: 'AA',
					},
					{
						value: 'BB',
						label: 'BB',
					},
					{
						value: 'CC',
						label: 'CC',
					},
					{
						value: 'DD',
						label: 'DD',
					},
				],
				type: 'checkbox',
			},
			{
				prop: 'DX1',
				label: '单选',
				sort: 16,
				raw: {
					name: 'DX1',
					displayName: '单选',
					type: 'string',
					sort: 16,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: false,
					options: ['A', 'B', 'C'],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a83c-cdcc-b1e9-7fd3635db741',
				},
				options: [
					{
						value: 'A',
						label: 'A',
					},
					{
						value: 'B',
						label: 'B',
					},
					{
						value: 'C',
						label: 'C',
					},
				],
				type: 'radio',
			},
			{
				prop: 'SJ',
				label: '时间',
				sort: 17,
				raw: {
					name: 'SJ',
					displayName: '时间',
					type: 'datetime',
					sort: 17,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: 0,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a840-6d87-3bb3-7a7f174b592c',
				},
				type: 'datetime',
			},
		],
		sort: 10,
		raw: {
			name: '附属信息',
			style: 'center',
			sort: 10,
			parentId: null,
			tableFields: [
				{
					name: 'JE',
					displayName: '金额',
					type: 'decimal',
					sort: 14,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: 3,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a834-de1f-fce9-c6cafd87fe66',
				},
				{
					name: 'DX',
					displayName: '多选',
					type: 'string',
					sort: 15,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: true,
					options: ['AA', 'BB', 'CC', 'DD'],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a838-de19-3017-3caf69062c8b',
				},
				{
					name: 'DX1',
					displayName: '单选',
					type: 'string',
					sort: 16,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: false,
					options: ['A', 'B', 'C'],
					displayForm: null,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a83c-cdcc-b1e9-7fd3635db741',
				},
				{
					name: 'SJ',
					displayName: '时间',
					type: 'datetime',
					sort: 17,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: 0,
					tableFieldGroupId: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a840-6d87-3bb3-7a7f174b592c',
				},
			],
			id: '3efb8ccc-dd27-f212-98ee-36eff54913c0',
		},
		width: 720,
	},
	{
		prop: 'table-group-c7duaj9ab1f-prop',
		label: '文件信息',
		children: [
			{
				prop: 'FJ',
				label: '附件',
				sort: 18,
				raw: {
					name: 'FJ',
					displayName: '附件',
					type: 'attachments',
					sort: 18,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '9845c35b-88f0-762a-e0a8-4974678740c8',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a844-facc-99b2-d91fc3e16b3b',
				},
				type: 'attachments',
			},
			{
				prop: 'TP',
				label: '图片',
				sort: 19,
				raw: {
					name: 'TP',
					displayName: '图片',
					type: 'images',
					sort: 19,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '9845c35b-88f0-762a-e0a8-4974678740c8',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a84a-bd74-cc08-4466d2bdb694',
				},
				type: 'images',
			},
		],
		sort: 11,
		raw: {
			name: '文件信息',
			style: 'center',
			sort: 11,
			parentId: null,
			tableFields: [
				{
					name: 'FJ',
					displayName: '附件',
					type: 'attachments',
					sort: 18,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '9845c35b-88f0-762a-e0a8-4974678740c8',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a844-facc-99b2-d91fc3e16b3b',
				},
				{
					name: 'TP',
					displayName: '图片',
					type: 'images',
					sort: 19,
					required: false,
					isNullable: true,
					maxLength: 0,
					index: false,
					isUnique: false,
					isListField: true,
					isQueryField: false,
					isExportField: true,
					isDepartmentField: true,
					isDepartmentEditField: true,
					desensitizationType: null,
					tableInfoId: '3a16ead7-a730-9aa4-bd29-85093ffe0b7c',
					tableDataSetId: null,
					dbTableFieldId: null,
					editDisabled: false,
					multiple: null,
					options: [],
					displayForm: null,
					tableFieldGroupId: '9845c35b-88f0-762a-e0a8-4974678740c8',
					precision: null,
					customValueLimit: null,
					clientSettings: [],
					calculateRule: null,
					relevanceCalculateRule: null,
					customValueOptions: [],
					validationRule: null,
					fieldMultipleDto: null,
					id: '3a16ead7-a84a-bd74-cc08-4466d2bdb694',
				},
			],
			id: '9845c35b-88f0-762a-e0a8-4974678740c8',
		},
		width: 360,
	},
]
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
				:columns="abcd"
			>
				<template #TP="scoped">1</template>
				<template #edit-TP="scoped">
					<el-input size="small" v-model="scoped.row.defbcfb" @click.stop />
				</template>
			</TableV2>
		</Block>
		<!-- <Flow ref="flowRef" v-model="flowConfig"></Flow> -->
	</Container>
</template>
<style scoped lang="scss"></style>
