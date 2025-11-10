<script setup name="airsheet">
import {onActivated, ref, onMounted, watch, nextTick, toRaw, triggerRef, onDeactivated} from 'vue'
import {useRoute} from 'vue-router'
import {useGlobal} from '@/store/useGlobal'
import {useBase64} from '@/hooks'
import axios from 'axios'

const globalStore = useGlobal()
const route = useRoute()
const sheetRef = ref()
const config = ref({
	config: {
		synergy: true,
		showHorizontalScreen: false,
		auth: 3,

		// superPermissions: [{r: 1, c: 1, rr: 3, cc: 3, v: '表头区域，不可编辑'}],
		// showToolbar: false,
		// edit: true,
		// freezeCount: {
		// 	row: 1,
		// 	col: 1,
		// },
		// keys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
		// online: [
		// {id: 1, name: '测试1', r: 6, c: 6, rr: 6, cc: 6, value: '测试内容1', state: 1},
		// {id: 2, name: '测试2', r: 1, c: 1, rr: 1, cc: 1, value: '测试内容2', state: 1},
		// {id: 3, name: '测试3', r: 2, c: 2, rr: 2, cc: 2, value: '测试内容3', state: 1},
		// {id: 4, name: '测试4', r: 3, c: 3, rr: 3, cc: 3, value: '测试内容4', state: 1},
		// {id: 5, name: '测试5', r: 4, c: 4, rr: 4, cc: 4, value: '测试内容5', state: 1},
		// {id: 6, name: '测试6', r: 5, c: 5, rr: 5, cc: 5, value: '测试内容6', state: 1},
		// ],
	},
	// celldata: Array.from({length: 51200}, (_, r) => {
	// 	return Array.from({length: 20}, (_, c) => {
	// 		return `R${r + 1}-C${c + 1}`
	// 		// return undefined
	// 	})
	// }),
	// celldata: [],
	// fns: [
	// 	{
	// 		label: '测试',
	// 		click: (row, rowData) => {
	// 		},
	// 	},
	// ],
})

const config2 = {
	celldata: Array.from({length: 100}, (_, index) => {
		return Array.from({length: 24}, (_, index) => {
			return `R${index + 1}-C${index + 1}`
		})
	}),
	fns: [
		// {
		// 	label: '测试',
		// 	type: 'primary',
		// 	click: (row, rowData) => {
		// 	},
		// },
	],
}

const fns = [
	// {
	// 	label: '操作',
	// 	click: (row, rowData) => {
	// 	},
	// },
]

const aab = {
	globalStyle: {
		// merge: {},
		// rowlen: {1: 29.901378631591797},
		// columnlen: {},
		// customHeight: {},
		// customWidth: {},
		// rowhidden: {},
		// colhidden: {},
		// borderInfo: [
		// 	{
		// 		rangeType: 'cell',
		// 		value: {
		// 			row_index: 2,
		// 			col_index: 1,
		// 			t: {style: 1, color: 'rgb(0, 0, 0)'},
		// 			b: {style: 1, color: 'rgb(0, 0, 0)'},
		// 			l: {style: 1, color: 'rgb(0, 0, 0)'},
		// 			r: {style: 1, color: 'rgb(0, 0, 0)'},
		// 		},
		// 	},
		// 	{
		// 		rangeType: 'range',
		// 		borderType: 'border-all',
		// 		color: '#000',
		// 		style: '1',
		// 		range: [
		// 			{
		// 				left: 0,
		// 				width: 130,
		// 				top: 106,
		// 				height: 24,
		// 				left_move: 0,
		// 				width_move: 261,
		// 				top_move: 106,
		// 				height_move: 149,
		// 				row: [4, 9],
		// 				column: [0, 1],
		// 				row_focus: 4,
		// 				column_focus: 0,
		// 			},
		// 		],
		// 	},
		// ],
		// authority: {
		// 	selectLockedCells: 1,
		// 	selectunLockedCells: 1,
		// 	formatCells: 1,
		// 	formatColumns: 1,
		// 	formatRows: 1,
		// 	insertColumns: 1,
		// 	insertRows: 1,
		// 	insertHyperlinks: 0,
		// 	deleteColumns: 1,
		// 	deleteRows: 1,
		// 	sort: 0,
		// 	filter: 0,
		// 	usePivotTablereports: 0,
		// 	editObjects: 0,
		// 	editScenarios: 0,
		// 	sheet: 1,
		// 	hintText: '当前工作表已开启保护,若要修改请先关闭保护',
		// 	algorithmName: 'None',
		// 	saltValue: null,
		// 	allowRangeList: [
		// 		{
		// 			sqref: 'A1',
		// 			password: '63f17f9d-1fd3-0a12-e6c3-4b7c80481951',
		// 			name: 'NotEditableDiy',
		// 			hintText: '单元格不可编辑!',
		// 			algorithmName: 'None',
		// 			saltValue: null,
		// 		},
		// 		{
		// 			name: 'NotEditable',
		// 			password: '123456',
		// 			hintText: '工作表已开启保护,请输入密码解锁',
		// 			algorithmName: 'None',
		// 			saltValue: null,
		// 			sqref: '$A$0:$B$0',
		// 		},
		// 		{
		// 			name: 'Editable',
		// 			password: '',
		// 			hintText: '',
		// 			algorithmName: 'None',
		// 			saltValue: null,
		// 			sqref: '$A$1:$ZZ$100000',
		// 		},
		// 	],
		// },

		merge: {
			'0_0': {
				rs: 1,
				cs: 11,
				r: 0,
				c: 0,
			},
			'1_0': {
				rs: 1,
				cs: 11,
				r: 1,
				c: 0,
			},
		},
		rowlen: {
			0: 47,
			1: 27,
			2: 58,
		},
		columnlen: {
			0: 31,
			1: 31,
			2: 31,
			3: 43,
			4: 55,
			5: 31,
			6: 31,
			7: 31,
			8: 31,
			9: 31,
			10: 31,
			11: 21,
			12: 20,
			13: 20,
			14: 20,
			15: 20,
			16: 20,
			17: 20,
			18: 20,
			19: 20,
			20: 20,
			21: 20,
			22: 20,
			23: 20,
			24: 20,
			25: 20,
		},
		customHeight: {
			0: 1,
		},
		customWidth: {
			0: 1,
			1: 1,
			2: 1,
			3: 1,
			4: 1,
			5: 1,
			6: 1,
			7: 1,
			8: 1,
			9: 1,
			10: 1,
			11: 1,
			12: 1,
			13: 1,
			14: 1,
			15: 1,
			16: 1,
			17: 1,
			18: 1,
			19: 1,
			20: 1,
			21: 1,
			22: 1,
			23: 1,
			24: 1,
			25: 1,
		},
		rowhidden: {},
		colhidden: {},
		borderInfo: [
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 0,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 1,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 2,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 3,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 4,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 5,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 6,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 7,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 8,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 9,
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 1,
					col_index: 10,
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 0,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 1,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 2,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 3,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 4,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 5,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 6,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 7,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 8,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 9,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 10,
					l: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					r: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					t: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
					b: {
						style: 1,
						color: 'rgb(0, 0, 0)',
					},
				},
			},
		],
		authority: {
			selectLockedCells: 1,
			selectunLockedCells: 1,
			formatCells: 1,
			formatColumns: 1,
			formatRows: 1,
			insertColumns: 1,
			insertRows: 1,
			insertHyperlinks: 0,
			deleteColumns: 1,
			deleteRows: 1,
			sort: 0,
			filter: 0,
			usePivotTablereports: 0,
			editObjects: 0,
			editScenarios: 0,
			sheet: 1,
			hintText: '当前工作表已开启保护,若要修改请先关闭保护',
			algorithmName: 'None',
			saltValue: null,
			allowRangeList: [
				{
					sqref: 'A1:K3',
					password: '0399fd6a-599f-9050-31c4-f5ddc6da75ae',
					name: 'NotEditableDiy',
					hintText: '单元格不可编辑!',
					algorithmName: 'None',
					saltValue: null,
				},
				{
					name: 'NotEditable',
					password: '123456',
					hintText: '工作表已开启保护,请输入密码解锁',
					algorithmName: 'None',
					saltValue: null,
					sqref: '$A$0:$B$0',
				},
				{
					name: 'Editable',
					password: '',
					hintText: '',
					algorithmName: 'None',
					saltValue: null,
					sqref: '$A$1:$ZZ$100000',
				},
			],
		},
	},

	header: [
		{
			r: 0,
			c: 0,
			v: {
				v: '政务新媒体账号基础信息统计表',
				ct: {fa: 'General', t: 'g'},
				m: '政务新媒体账号基础信息统计表',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 20,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
				mc: {rs: 1, cs: 11, r: 0, c: 0},
			},
		},
		{
			r: 1,
			c: 0,
			v: {
				v: '填报单位： 填报人： 审核人： 填报人手机号：',
				ct: {fa: 'General', t: 'g'},
				m: '填报单位： 填报人： 审核人： 填报人手机号：',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 14,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
				mc: {rs: 1, cs: 11, r: 1, c: 0},
			},
		},
		{
			r: 2,
			c: 0,
			v: {
				v: '序号',
				ct: {fa: 'General', t: 'g'},
				m: '序号',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 1,
			v: {
				v: '账号名称',
				ct: {fa: 'General', t: 'g'},
				m: '账号名称',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 2,
			v: {
				v: '注册平台',
				ct: {fa: 'General', t: 'g'},
				m: '注册平台',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 3,
			v: {
				v: '账号链接（没链接的填无）',
				ct: {fa: 'General', t: 'g'},
				m: '账号链接（没链接的填无）',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 4,
			v: {
				v: '粉丝量（万）',
				ct: {fa: 'General', t: 'g'},
				m: '粉丝量（万）',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 5,
			v: {
				v: '是否认证',
				ct: {fa: 'General', t: 'g'},
				m: '是否认证',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 6,
			v: {
				v: '单位名称',
				ct: {fa: 'General', t: 'g'},
				m: '单位名称',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 7,
			v: {
				v: '单位地址',
				ct: {fa: 'General', t: 'g'},
				m: '单位地址',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 8,
			v: {
				v: '联系人',
				ct: {fa: 'General', t: 'g'},
				m: '联系人',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 9,
			v: {
				v: '联系电话',
				ct: {fa: 'General', t: 'g'},
				m: '联系电话',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
		{
			r: 2,
			c: 10,
			v: {
				v: '涉及领域',
				ct: {fa: 'General', t: 'g'},
				m: '涉及领域',
				bg: '#eee',
				bl: 0,
				it: 0,
				ff: 0,
				fs: 12,
				fc: 'rgb(0, 0, 0)',
				ht: 0,
				vt: 0,
			},
		},
	],
}

const bba = {
	totalCount: 29,
	items: [
		{
			rowNum: 4,
			rawData:
				'[{"r":3,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":3,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '684953d8-6e16-e551-ce47-1adc0ae91af1',
		},
		{
			rowNum: 5,
			rawData:
				'[{"r":4,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":4,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '397f9422-ee50-535f-9b8b-8333ad66b140',
		},
		{
			rowNum: 6,
			rawData:
				'[{"r":5,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":5,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '447cc5a5-f343-62ee-4ceb-a04522d95da3',
		},
		{
			rowNum: 7,
			rawData:
				'[{"r":6,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":6,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '6dc2add9-c6b1-17a3-d381-b5cd6b6cfc07',
		},
		{
			rowNum: 8,
			rawData:
				'[{"r":7,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":7,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: 'a24ac5cc-5985-d542-bccd-e5860e23a880',
		},
		{
			rowNum: 9,
			rawData:
				'[{"r":8,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":8,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: 'f900566b-81bd-9116-74a5-5cc27515051b',
		},
		{
			rowNum: 10,
			rawData:
				'[{"r":9,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":9,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '2b8d0c1e-f5a5-413e-aee1-d2adc8855e12',
		},
		{
			rowNum: 11,
			rawData:
				'[{"r":10,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":10,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '5de8301a-306e-b851-cafa-de185787ffd2',
		},
		{
			rowNum: 12,
			rawData:
				'[{"r":11,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":11,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: 'a5b60bbc-9766-47e0-f42b-0b877f852915',
		},
		{
			rowNum: 13,
			rawData:
				'[{"r":12,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":12,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: 'dc9a0dcb-0011-28ee-c7bd-f6751410639d',
		},
		{
			rowNum: 14,
			rawData:
				'[{"r":13,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":13,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '1d7d82d0-7b1c-5891-5591-952e36269c03',
		},
		{
			rowNum: 15,
			rawData:
				'[{"r":14,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":14,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '1d65767a-24ea-d67a-f444-368de4e9ac3b',
		},
		{
			rowNum: 16,
			rawData:
				'[{"r":15,"c":0,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":1,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":2,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":3,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":4,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":5,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":6,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":7,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":8,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":9,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}},{"r":15,"c":10,"v":{"v":"1","ct":{"fa":"General","t":"n"},"m":"1"}}]',
			reportTableId: '3a1977ad-e688-73fd-791d-8b08bc9a8626',
			originalReportTableId: null,
			creationTime: '2025-04-24 10:21:27',
			creatorId: '3a0f7581-d979-f114-7162-7e8b987784a4',
			id: '8c99c1f4-fd82-2707-8387-af05d58a59cf',
		},
	],
}

onActivated(() => {
	// sheetRef.value
	// 	.luckyToAir(aab.globalStyle, [
	// 		...aab.header,
	// 		...bba.items.map((item) => JSON.parse(item.rawData)).flat(1),
	// 	])
	// 	.then((res) => {
	// 		Object.assign(config.value, {
	// 			config: {
	// 				...res.config,
	// 			},
	// 			celldata: res.celldata,
	// 		})
	// 	})

	// sheetRef.value.setCellBackground(0, 0, 1, 1, '#f00')
	// sheetRef.value.setMerge(5, 4, 4, 4)
	// sheetRef.value.setMergeCell(1, 5, 4, 4)
	// sheetRef.value.setCellValue(0, 0, 'hello')

	// config.value.config.style = {
	// 	'1-1': {
	// 		bg: '#f00',
	// 	},
	// }
	// config.value.config.mergedCells = {
	// 	'1-3': {
	// 		rowspan: 2,
	// 		colspan: 2,
	// 	},
	// }
	// config.value.celldata[0][0] = '123'

	setTimeout(() => {
		// config.value.config.cellMultiple[1] = {
		// 	id: 2,
		// 	name: '测试2',
		// 	r: 5,
		// 	c: 3,
		// 	rr: 5,
		// 	cc: 3,
		// 	value: '测试内容2',
		// 	state: 1,
		// }
		// config.value.config.cellMultiple[3] = {
		// 	id: 4,
		// 	name: '测试4变化后',
		// 	r: 9,
		// 	c: 2,
		// 	rr: 9,
		// 	cc: 2,
		// 	value: '测试内容4变化后',
		// 	state: 1,
		// }
		// config.value.config.cellMultiple[5] = {
		// 	id: 6,
		// 	name: '测试6变化后',
		// 	r: 23,
		// 	c: 7,
		// 	rr: 23,
		// 	cc: 7,
		// 	value: '测试内容6变化后',
		// 	state: 1,
		// }
		// sheetRef.value.setMergeCell(0, 0, 2, 4)
		// sheetRef.value.setRange(0, 0, 2, 4)
		// config.value.celldata[0][0] = '123'
		// config.value.celldata[0][0] = '123'
		// sheetRef.value.airToLucky().then((res) => {})
		// sheetRef.value
		// 	.luckyToAir(
		// 		{
		// 			merge: {
		// 				'4_4': {r: 4, c: 4, rs: 2, cs: 2},
		// 			},
		// 		},
		// 		[
		// 			{r: 0, c: 0, v: {v: '123'}},
		// 			{r: 0, c: 1, v: {v: '3123'}},
		// 		]
		// 	)
		// 	.then((res) => {
		// 		config.value.config = res.config
		// 		config.value.celldata = res.celldata
		// 	})
	}, 3000)

	// sheetRef.value.mergeCells(1, 3, 3, 3)
})

//21025
const onClick = () => {}
const api = ref('http://100.92.2.93:8001/signalr-hubs/onlinetable')
const token = route.query.abc
	? 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjIzMjM1MDMsImV4cCI6MTc2MjQ5NTUwMywiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWNhZjctZjVkMC00MDlmLWFiMGFkYzllMGRjMCIsImF1dGhfdGltZSI6MTc2MjMyMzUwMywiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzk5NjM3MTg4N0BpbnNwdXIuY29tIiwieWt6LWlkIjoiMzU0MDkyIiwieWt6LWVtcGxveWVlLWNvZGUiOiJHRV8xNjM1MDg4MzAwNjQ3OTExNDI0Iiwicm9sZSI6WyLlj7DotKbkuIrkuIvnur8iLCLlnLrmma_orr7orqEiLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5bel5L2c5Lq65ZGYIl0sInBob25lX251bWJlcl92ZXJpZmllZCI6IkZhbHNlIiwiZW1haWxfdmVyaWZpZWQiOiJGYWxzZSIsIm5hbWUiOiJ5a3otMTM5OTYzNzE4ODciLCJidXNpbmVzc1JvbGUiOiLlt6XkvZzkurrlkZgs5pWw5o2u6aKG5a-8IiwiZGVwYXJ0bWVudElkIjoiM2EwYjRiNTAtOTA2Mi1kMzJkLWJhM2ItNjJjOGQ4Mjg4MzEzIiwiYmlnRGVwYXJ0bWVudElkIjoiM2EwYjRiNTAtOTA2Mi1iZGUzLWU2NGUtNjFhMWYzYWVjOTkwIiwiaWF0IjoxNzYyMzIzNTAzLCJzY29wZSI6WyJhZGRyZXNzIiwiZW1haWwiLCJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciIsIm9wZW5pZCIsInBob25lIiwicHJvZmlsZSIsInJvbGUiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsiQXV0aENvZGUiXX0.NM-gjDWf3B8JZAaNz2bs3D-uJvv1sbutiBdW821Vd4ZSod_5RREK5Ib9DFQKrvLmQkcTQFRg5VZH8Y4Xu5VQ5ZMs27maycQ9f64sAkbN-sZM1bIIlY-VCwdZsgNYl9TXwffylPQZYAc3xUbrujBGtaQVJDR3qTae88JNKsqrHHEnFDVYZ2aGhWWWvGs7Ct3UvRAY28geS-r58gvuMUxdSt8l1SMTcBh605akYTJovXNtx2pKh1SPEG2sS530sZZ5QHYpLCYGkAU76eIbOhb6GCqeEZeYRafv7qhPCiMAFRUmWWSzK7ujeXJbx67dBwE8QZiVFxngs4LhZ_YhIjyFFg'
	: route.query.def
	? 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjI0MTg4NTAsImV4cCI6MTc2MjU5MDg1MCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWMzMWEtNGM3Zi1lM2ViLTIxYmVkYjZkMTAwMSIsImF1dGhfdGltZSI6MTc2MjQxMjY3NiwiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzQzNjExNzA1NkBpbnNwdXIuY29tIiwieWt6LWlkIjoiMzU0MjAyIiwieWt6LWVtcGxveWVlLWNvZGUiOiJHRV8xNjM1MDg4MjcxODAzNjgyODE2Iiwicm9sZSI6WyLlj7DotKbkuIrkuIvnur8iLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5bel5L2c5Lq65ZGYIl0sInBob25lX251bWJlcl92ZXJpZmllZCI6IkZhbHNlIiwiZW1haWxfdmVyaWZpZWQiOiJGYWxzZSIsIm5hbWUiOiJ5Y3N0amZnbGQiLCJidXNpbmVzc1JvbGUiOiLmlbDmja7pooblr7ws5pWw5o2u5a-85Ye6IiwiZGVwYXJ0bWVudElkIjoiM2EwYjRiNTAtOTA2Mi1kMzJkLWJhM2ItNjJjOGQ4Mjg4MzEzIiwiYmlnRGVwYXJ0bWVudElkIjoiM2EwYjRiNTAtOTA2Mi1iZGUzLWU2NGUtNjFhMWYzYWVjOTkwIiwiaWF0IjoxNzYyNDE4ODUwLCJzY29wZSI6WyJhZGRyZXNzIiwiZW1haWwiLCJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciIsIm9wZW5pZCIsInBob25lIiwicHJvZmlsZSIsInJvbGUiLCJvZmZsaW5lX2FjY2VzcyJdLCJhbXIiOlsiQXV0aENvZGUiXX0.LvqZ3NJObGeU2tinODbQFw5T_3s-Vy3ZPQSqn58_z1a0RxU86bP92zpmiKS5aNFkiE895SxEr2yX5097_nGdjhooEf6-Fq5IDyQrsed-fTEWAQ1R6x1cSWltF8mfSyxRMdKNAOn4NxAneZA9kbTQzHvrSgpxyQqQNNTk56nOJjdCsy_XFuMCMWKtoyA5RUYDhvKcTaaS4e8G18vGwA1kwMK8F-pb-JuimN9aKomeGqmn71Pjdzfi8goVoeCFt8dNgypwIDgi9mjworuF7DbyzLvGGVEbApV5PSTnNmeq4guDj2pA_59a5JXX9zofU818Bj15elfooP7XmUSctUsPlw'
	: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjI3Mzg3MjQsImV4cCI6MTc2MjkxMDcyNCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWNjMzAtODU3MC1jMmE5LTM2M2E5M2U4ZTdmMSIsImF1dGhfdGltZSI6MTc2MjczODcyMywiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzk4MzcwMDk2MEBpbnNwdXIuY29tIiwicm9sZSI6WyLliIbnrqHpooblr7wiLCLliqDop6Plr4YiLCLlj7DotKbkuIrkuIvnur8iLCLlnLrmma_orr7orqEiLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5aSn5bGP5p-l55yLIiwi5pWw5o2u6ZuG566h55CGIiwi5pWw5o2u6aKG5a-8Il0sInBob25lX251bWJlciI6IjE2NjIzNjYzNjc4IiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjoiRmFsc2UiLCJlbWFpbF92ZXJpZmllZCI6IkZhbHNlIiwibmFtZSI6Inljc3Rqc2pnbGciLCJidXNpbmVzc1JvbGUiOiLliIbnrqHpooblr7ws5bel5L2c5Lq65ZGYLOaVsOaNrumihuWvvCzljLrljr_lj7DotKbov5Dnu7TlkZgiLCJkZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYxLWIzNmMtMGZjNy1kNmRjN2M5Y2YyYTciLCJiaWdEZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYxLTFjZDItYzJjYS1hMmVmMDJmZGIyNmIiLCJpYXQiOjE3NjI3Mzg3MjQsInNjb3BlIjpbImFkZHJlc3MiLCJlbWFpbCIsImluc3B1ci1hYnAtYXBwbGljYXRpb24iLCJpbnNwdXItbGVkZ2VyIiwib3BlbmlkIiwicGhvbmUiLCJwcm9maWxlIiwicm9sZSIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJBdXRoQ29kZSJdfQ.NIicsRg8kVdbXJvQIP7hBlKTtfAtlnKKO6wwEDrA_WZU1Y1oKuQ2Rg0w4DNq9Xt0Jhd7YXiRkYD6RS19Eib-oSVova1p4ATL_DWFs-FvY2GvYQWqgJ6K-4WI0rBBeAWtbYaup1W_1PH2sNBQ73gQM4BBCppwO7GSYQEV7_VYIWwLFWd5n1iYIIucubDnxSWdNFfP1coeDHix8qB_TroF6bPMUT-8CzViXYbmi5zeuMbX7HNM3dQ703Ozf0RppftEkcH7kSCjWxRgomSmD97wOQ5M6rBqbgTiIaE3O7FlDw8fPoCZLGVQe0AoRvalqVKZ-GWNwQBBzbuN4n0LtW-Pgg'

const synergyData = ref([])
const tableId = ref('')
const sheetId = ref('')
const completed = ref(false)
const rowCount = ref(50)

let data = []
const beatch = async () => {
	const loop = async () => {
		const res = await axios.request({
			url: 'http://100.92.2.93:8001/api/online-table/table/cell-data',
			method: 'GET',
			params: {
				tableId: tableId.value,
				sheetId: sheetId.value,
				skipCount: 0,
				maxResultCount: 1000,
			},
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		const arr = []
		for (const item of res.data.items) {
			const rowIndex = item[0]
			const colIndex = item[1]
			const value = item[2]

			if (!arr[rowIndex]) {
				arr[rowIndex] = []
			}
			arr[rowIndex][colIndex] = value || ''
		}

		data.push(...arr)

		if (res.data.items.length < 1000) {
			return
		}
		loop()
	}
	data = []
	await loop()
	config.value.celldata = data.map((item) => (item === undefined ? [] : item))
}

const getSheetConfig = async () => {
	const res = await axios.request({
		url: `http://100.92.2.93:8001/api/online-table/table/sheet-config/${sheetId.value}`,
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
	// return useBase64.decodeCompressed(res.data)
	return res.data
}

// ✅ 提取为共享工具函数：解析 JWT token 获取用户信息
const parseJwtToken = (token) => {
	try {
		const base64Url = token.split('.')[1]
		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
				.join('')
		)
		return JSON.parse(jsonPayload)
	} catch (e) {
		console.error('解析 JWT token 失败:', e)
		return null
	}
}

const addSheet = (sheet) => {
	console.log('AddSheet', sheet)
	sheetRef.value.asyncCreateSheet({
		SheetName: sheet.name,
		sheetConfig: null,
	})
}

const onAsyncEventCell = (range) => {
	console.log('🔍 [DEBUG] onAsyncEventCell 被调用', range)

	// ✅ 获取当前用户信息
	const tokenPayload = parseJwtToken(token)
	console.log('🔍 [DEBUG] tokenPayload:', tokenPayload)

	const currentUserId = tokenPayload?.sub || tokenPayload?.['ykz-id'] || null
	const currentUserName = tokenPayload?.name || '未知用户'

	console.log('🔍 [DEBUG] 当前用户信息:', {
		userId: currentUserId,
		userName: currentUserName,
	})

	const eventData = {
		sheetId: sheetId.value,
		row: range.r,
		col: range.c,
		rowEnd: range.rr, // 传递选区结束行
		colEnd: range.cc, // 传递选区结束列
		// ✅ 添加用户身份信息（用于高亮显示）
		operatorUserId: currentUserId,
		operatorName: currentUserName,
	}

	// 如果包含 config（权限配置），一起传递
	if (range.config) {
		if (typeof range.config === 'string') {
			eventData.config = range.config
		} else {
			eventData.config = JSON.stringify(range.config)
		}
	}

	console.log('✅ [发送] 事件数据（包含用户信息）:', eventData)
	console.log('✅ [发送] sheetRef.value:', sheetRef.value)
	console.log('✅ [发送] asyncEventCell 方法存在:', typeof sheetRef.value?.asyncEventCell)

	sheetRef.value.asyncEventCell(eventData)
}

const getSheetPermission = (tableId, sheetId) => {
	return defHttp.request({
		url: `http://100.92.2.93:8001/api/online-table/sheet-permissions/${tableId}/${sheetId}`,
		method: 'GET',
	})
}

const synergyJoinSheet = async (id, sheet) => {
	console.log('synergyJoinSheet', id, sheet)
	sheetId.value = id
	await sheetRef.value.asyncJoinSheet(sheetId.value)
	sheetRef.value.loading(true, '正在获取最新数据')
	await beatch()
	const sheetConfig = await getSheetConfig()
	// await getSheetPermission(tableId.value, sheetId.value).catch((err) => {
	// 	console.log(err)
	// })
	// let abc =
	// 	'0-0,0-1,0-2,0-3,0-4,0-5,1-0,1-1,1-2,1-3,1-4,1-5,2-0,2-1,2-2,2-3,2-4,2-5,2-6,2-7,2-8,2-9,2-10,3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9,3-10,4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9,4-10,5-0,5-1,5-2,5-3,5-4,5-5,5-6,5-7,5-8,5-9,5-10,6-0,6-1,6-2,6-3,6-4,7-0,7-1,7-2,7-3,7-4,8-0,8-1,8-2,8-3,8-4,9-0,9-1,9-2,9-3,9-4,11-0,11-3,12-0,12-1,12-2,12-3,12-4,12-5,13-0,13-1,13-2,13-3,13-4,13-5,14-0,14-1,14-2,14-3,14-4,14-5,14-6,14-7,14-8,14-9,14-10,15-0,15-1,15-2,15-3,15-4,15-5,15-6,15-7,15-8,15-9,15-10,16-0,16-1,16-2,16-3,16-4,16-5,16-6,16-7,16-8,16-9,16-10,17-0,17-1,17-2,17-3,17-4,17-5,17-6,17-7,17-8,17-9,17-10,18-0,18-1,18-2,18-3,18-4,19-0,19-1,19-2,19-3,19-4,20-0,20-1,20-2,20-3,20-4,21-0,21-1,21-2,21-3,21-4,23-0,23-3,24-0,24-1,24-2,24-3,24-4,24-5,25-0,25-1,25-2,25-3,25-4,25-5,26-0,26-1,26-2,26-3,26-4,26-5,26-6,26-7,26-8,26-9,26-10,27-0,27-1,27-2,27-3,27-4,27-5,27-6,27-7,27-8,27-9,27-10,28-0,28-1,28-2,28-3,28-4,28-5,28-6,28-7,28-8,28-9,28-10,29-0,29-1,29-2,29-3,29-4,29-5,29-6,29-7,29-8,29-9,29-10,30-0,30-1,30-2,30-3,30-4,31-0,31-1,31-2,31-3,31-4,32-0,32-1,32-2,32-3,32-4,33-0,33-1,33-2,33-3,33-4,35-0,35-3,36-0,36-1,36-2,36-3,36-4,36-5,37-0,37-1,37-2,37-3,37-4,37-5,38-0,38-1,38-2,38-3,38-4,38-5,38-6,38-7,38-8,38-9,39-0,39-1,39-2,39-3,39-4,39-5,39-6,39-7,39-8,39-9,40-0,40-1,40-2,40-3,40-4,40-5,40-6,40-7,40-8,40-9,41-0,41-1,41-2,41-3,41-4,41-5,41-6,41-7,41-8,41-9,42-0,42-1,42-2,42-3,42-4,43-0,43-1,43-2,43-3,43-4,44-0,44-1,44-2,44-3,44-4,45-0,45-1,45-2,45-3,45-4,47-0,47-3,48-0,48-1,48-2,48-3,48-4,48-5,49-0,49-1,49-2,49-3,49-4,49-5,50-0,50-1,50-2,50-3,50-4,50-5,50-6,50-7,50-8,50-9,51-0,51-1,51-2,51-3,51-4,51-5,51-6,51-7,51-8,51-9,52-0,52-1,52-2,52-3,52-4,52-5,52-6,52-7,52-8,52-9,53-0,53-1,53-2,53-3,53-4,53-5,53-6,53-7,53-8,53-9,54-0,54-1,54-2,54-3,54-4,55-0,55-1,55-2,55-3,55-4,56-0,56-1,56-2,56-3,56-4,57-0,57-1,57-2,57-3,57-4,59-0,59-3,60-0,60-1,60-2,60-3,60-4,60-5,61-0,61-1,61-2,61-3,61-4,61-5,62-0,62-1,62-2,62-3,62-4,62-5,62-6,62-7,62-8,62-9,63-0,63-1,63-2,63-3,63-4,63-5,63-6,63-7,63-8,63-9,64-0,64-1,64-2,64-3,64-4,64-5,64-6,64-7,64-8,64-9,65-0,65-1,65-2,65-3,65-4,65-5,65-6,65-7,65-8,65-9,66-0,66-1,66-2,66-3,66-4,67-0,67-1,67-2,67-3,67-4,68-0,68-1,68-2,68-3,68-4,69-0,69-1,69-2,69-3,69-4,71-0,71-3,72-0,72-1,72-2,72-3,72-4,72-5,73-0,73-1,73-2,73-3,73-4,73-5,74-0,74-1,74-2,74-3,74-4,74-5,74-6,74-7,74-8,74-9,74-10,75-0,75-1,75-2,75-3,75-4,75-5,75-6,75-7,75-8,75-9,75-10,76-0,76-1,76-2,76-3,76-4,76-5,76-6,76-7,76-8,76-9,76-10,77-0,77-1,77-2,77-3,77-4,77-5,77-6,77-7,77-8,77-9,77-10,78-0,78-1,78-2,78-3,78-4,79-0,79-1,79-2,79-3,79-4,80-0,80-1,80-2,80-3,80-4,81-0,81-1,81-2,81-3,81-4,83-0,83-3,84-0,84-1,84-2,84-3,84-4,84-5,85-0,85-1,85-2,85-3,85-4,85-5,86-0,86-1,86-2,86-3,86-4,86-5,86-6,86-7,86-8,86-9,86-10,87-0,87-1,87-2,87-3,87-4,87-5,87-6,87-7,87-8,87-9,87-10,88-0,88-1,88-2,88-3,88-4,88-5,88-6,88-7,88-8,88-9,88-10,89-0,89-1,89-2,89-3,89-4,89-5,89-6,89-7,89-8,89-9,89-10,90-0,90-1,90-2,90-3,90-4,91-0,91-1,91-2,91-3,91-4,92-0,92-1,92-2,92-3,92-4,93-0,93-1,93-2,93-3,93-4,95-0,95-3,96-0,96-1,96-2,96-3,96-4,96-5,97-0,97-1,97-2,97-3,97-4,97-5,98-0,98-1,98-2,98-3,98-4,98-5,98-6,98-7,98-8,98-9,98-10,99-0,99-1,99-2,99-3,99-4,99-5,99-6,99-7,99-8,99-9,99-10,100-0,100-1,100-2,100-3,100-4,100-5,100-6,100-7,100-8,100-9,100-10,101-0,101-1,101-2,101-3,101-4,101-5,101-6,101-7,101-8,101-9,101-10,102-0,102-1,102-2,102-3,102-4,103-0,103-1,103-2,103-3,103-4,104-0,104-1,104-2,104-3,104-4,105-0,105-1,105-2,105-3,105-4,107-0,107-3,108-0,108-1,108-2,108-3,108-4,108-5,109-0,109-1,109-2,109-3,109-4,109-5,110-0,110-1,110-2,110-3,110-4,110-5,110-6,110-7,110-8,110-9,111-0,111-1,111-2,111-3,111-4,111-5,111-6,111-7,111-8,111-9,112-0,112-1,112-2,112-3,112-4,112-5,112-6,112-7,112-8,112-9,113-0,113-1,113-2,113-3,113-4,113-5,113-6,113-7,113-8,113-9,114-0,114-1,114-2,114-3,114-4,115-0,115-1,115-2,115-3,115-4,116-0,116-1,116-2,116-3,116-4,117-0,117-1,117-2,117-3,117-4,119-0,119-3,120-0,120-1,120-2,120-3,120-4,120-5,121-0,121-1,121-2,121-3,121-4,121-5,122-0,122-1,122-2,122-3,122-4,122-5,122-6,122-7,122-8,122-9,123-0,123-1,123-2,123-3,123-4,123-5,123-6,123-7,123-8,123-9,124-0,124-1,124-2,124-3,124-4,124-5,124-6,124-7,124-8,124-9,125-0,125-1,125-2,125-3,125-4,125-5,125-6,125-7,125-8,125-9,126-0,126-1,126-2,126-3,126-4,127-0,127-1,127-2,127-3,127-4,128-0,128-1,128-2,128-3,128-4,129-0,129-1,129-2,129-3,129-4,131-0,131-3,132-0,132-1,132-2,132-3,132-4,132-5,133-0,133-1,133-2,133-3,133-4,133-5,134-0,134-1,134-2,134-3,134-4,134-5,134-6,134-7,134-8,134-9,135-0,135-1,135-2,135-3,135-4,135-5,135-6,135-7,135-8,135-9,136-0,136-1,136-2,136-3,136-4,136-5,136-6,136-7,136-8,136-9,137-0,137-1,137-2,137-3,137-4,137-5,137-6,137-7,137-8,137-9,138-0,138-1,138-2,138-3,138-4,139-0,139-1,139-2,139-3,139-4,140-0,140-1,140-2,140-3,140-4,141-0,141-1,141-2,141-3,141-4,143-0,143-3'
	if (sheet) {
		// 更新配置
		Object.assign(sheet.config, {
			...sheetConfig,
			showToolBar: true,
			super: route.query.abc || route.query.def ? false : true,
			permissions: {},
			deepPermissions: {},
			superPermissions: [],

			// deepPermissions: {
			// 	'3a0b4b62-d135-3903-0589-b7f520734871': {
			// 		type: 'column',
			// 		targets: [4, 5, 6, 9, 10, 15],
			// 		// targets: [
			// 		// 	{row: 5, col: 4},
			// 		// 	{row: 5, col: 5},
			// 		// 	{row: 5, col: 6},
			// 		// 	{row: 6, col: 4},
			// 		// 	{row: 7, col: 4},
			// 		// ],
			// 		timestamp: 1761708065000,
			// 		userName: 'admin',
			// 	},
			// },
			//
			// superPermissions: [
			// 	{
			// 		r: 1,
			// 		c: 1,
			// 		rr: 1,
			// 		cc: 1,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 1,
			// 		c: 2,
			// 		rr: 1,
			// 		cc: 2,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 2,
			// 		c: 1,
			// 		rr: 2,
			// 		cc: 1,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 5,
			// 		c: 2,
			// 		rr: 5,
			// 		cc: 2,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 5,
			// 		c: 4,
			// 		rr: 5,
			// 		cc: 4,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 6,
			// 		c: 1,
			// 		rr: 6,
			// 		cc: 2,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 6,
			// 		c: 2,
			// 		rr: 6,
			// 		cc: 2,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 6,
			// 		c: 4,
			// 		rr: 6,
			// 		cc: 4,
			// 		v: '市高法院',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb442',
			// 	},
			// 	{
			// 		r: 6,
			// 		c: 6,
			// 		rr: 6,
			// 		cc: 6,
			// 		v: '市高法院2',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 6,
			// 		c: 7,
			// 		rr: 6,
			// 		cc: 7,
			// 		v: '市高法院2',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 5,
			// 		c: 7,
			// 		rr: 5,
			// 		cc: 7,
			// 		v: '市高法院2',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},

			// 	{
			// 		r: 2,
			// 		c: 7,
			// 		rr: 2,
			// 		cc: 7,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 2,
			// 		c: 8,
			// 		rr: 2,
			// 		cc: 8,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 2,
			// 		c: 9,
			// 		rr: 2,
			// 		cc: 9,
			// 		v: '市高法院4',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb440',
			// 	},
			// 	{
			// 		r: 3,
			// 		c: 7,
			// 		rr: 3,
			// 		cc: 7,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 50,
			// 		c: 0,
			// 		rr: 55,
			// 		cc: 7,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 56,
			// 		c: 3,
			// 		rr: 58,
			// 		cc: 7,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// 	{
			// 		r: 59,
			// 		c: 0,
			// 		rr: 62,
			// 		cc: 4,
			// 		v: '市高法院3',
			// 		id: '3a0b4b50-8f89-509a-5120-cb52e99cb444',
			// 	},
			// ],
			// superPermissions: abc.split(',').map((key) => {
			// 	let [r, c] = key.split('-').map(Number)
			// 	return {r, c, rr: r, cc: c, v: 'admin', id: '3a1d64cc-a3a0-d33b-9484-d0a0f2bc95ec'}
			// }),
			colCount: 120,
			rowCount: 1000,
		})

		console.log('配置已更新:', sheet.config)

		// ✅ 修复：手动同步 merged 配置到 mergedCells Map
		// if (sheet.hooks?.mergeHook?.refreshMerge) {
		// 	sheet.hooks.mergeHook.refreshMerge()
		// 	console.log('✅ 合并单元格已同步')
		// }

		// ✅ 修复：如果有公式配置，重新计算公式
		// if (sheetConfig.formulaed && Object.keys(sheetConfig.formulaed).length > 0) {
		// 	if (sheet.hooks?.editHook?.setFormulaValue) {
		// 		sheet.hooks.editHook.setFormulaValue()
		// 		console.log('✅ 公式已重新计算')
		// 	}
		// }

		// 强制渲染
		await nextTick()
		if (sheet.hooks.renderHook && sheet.hooks.renderHook.getRenderResult) {
			sheet.hooks.mergeHook.refreshMerge()
			sheet.hooks.editHook.setFormulaValue()
			sheet.state.lastMergeUpdate = Date.now()
			sheet.hooks.selectionRangeHook.setRange(0, 0, 0, 0)
		}
	}

	// 设置当前用户ID（用于权限控制）
	// ✅ 使用共享的 parseJwtToken 函数
	const tokenPayload = parseJwtToken(token)
	const currentUserId = tokenPayload?.sub || tokenPayload?.['ykz-id'] || null
	if (currentUserId) {
		sheetRef.value.setCurrentUserId(currentUserId)
		console.log('当前用户ID:', currentUserId, '用户名:', tokenPayload?.name)
	} else {
		console.error('无法从 token 中获取用户ID')
	}

	sheetRef.value.loading(false)
}

const synergyLeaveSheet = (id) => {
	sheetRef.value.asyncLeaveSheet(id)
}

const onAsyncRemoveSheet = (id) => {
	sheetRef.value.asyncRemoveSheet(id)
}

const asyncInputCell = (prev, value, cell) => {
	sheetRef.value.asyncInputCell({
		sheetId: sheetId.value,
		row: cell.r,
		col: cell.c,
		before: prev,
		after: value,
	})
}

const asyncConfig = (json) => {
	sheetRef.value.asyncConfig({
		sheetId: sheetId.value,
		config: JSON.stringify(json),
	})
}

const asyncCompleted = () => {
	completed.value = true
	synergyJoinSheet(sheetId.value, sheetRef.value.getSheet())
}

const allHistoryData = ref([{date: '2025-10-31', list: []}])
const cellHistoryData = ref([])
let historyCell = null
let historyCount = 0
let historyTotal = 0
const asyncCellHistory = async (ranged, callback) => {
	// cellHistoryData.value = cellHistoryData.value.concat([
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// 	{name: '张三', time: '2025-10-28 15:34:00', content: '修改了单元格内容'},
	// ])

	if (!historyCell || historyCell.r !== ranged.r || historyCell.c !== ranged.c) {
		cellHistoryData.value = []
		historyCell = ranged
		historyCount = 0
		historyTotal = 0
	}

	if (cellHistoryData.value.length >= historyTotal && cellHistoryData.value.length > 0) {
		callback && callback()
		return
	}

	const res = await axios.request({
		url: `http://100.92.2.93:8001/api/online-table/log/cell-log/${tableId.value}/${sheetId.value}/${ranged.r}/${ranged.c}`,
		method: 'GET',
		params: {
			skipCount: historyCount * 10,
			maxResultCount: 10,
		},
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})

	res.data.items.forEach((item) => {
		const user = JSON.parse(item.operationData)
		const cell = JSON.parse(item.afterSnapshot)
		cellHistoryData.value.push({
			name: `${user.UserName}-${user.BigDepartmentName}-${user.DepartmentName}`,
			time: item.operationTime,
			content: cell.CellValue,
			_raw: JSON.parse(JSON.stringify(item)),
		})
	})

	historyCount++
	historyTotal = res.data.totalCount
	callback && callback()
}

const asyncAllHistory = async (callback) => {
	allHistoryData.value[0].list.push({
		name: '张三',
		time: '10:58',
		content: '1234567890',
		r: 1,
		c: 1,
	})
	callback && callback()
}

const linked = ref(false)

watch(
	() => linked.value,
	(value) => {
		if (value) {
			console.log('joinSheet')
			sheetRef.value.asyncJoinSheet(sheetId.value)
		}
	}
)

watch(
	() => globalStore.hasLeave,
	(value) => {
		if (value) {
			if (value && sheetRef.value) {
				sheetRef.value.signalrStop()
			}
		} else {
			sheetRef.value.signalrReload()
		}
	}
)

onActivated(() => {
	// 获取sheets

	// const arr = {}
	// for (let i = 0; i < 4000; i++) {
	// 	arr[`${i}-${i}`] = {
	// 		bb: 1,
	// 		bt: 1,
	// 		br: 1,
	// 		bl: 1,
	// 	}
	// }
	// console.log(999, useBase64.sendCompressed(JSON.stringify(arr)))
	// console.log(999, JSON.stringify(arr))

	axios
		.request({
			url: 'http://100.92.2.93:8001/api/online-table/table/3a1d6a1c-c47b-02e3-65e3-54d4e5def775?autoCreate=true',
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		.then(async (res) => {
			const arr = []
			res.data.sheets.forEach((sheet) => {
				arr.push({
					id: sheet.id,
					name: sheet.sheetName,
					_raw: JSON.parse(JSON.stringify(sheet)),
				})
			})

			api.value = `http://100.92.2.93:8001/signalr-hubs/onlinetable?tableId=${arr[0]._raw.tableId}&isAuth=false`
			synergyData.value = arr
			tableId.value = arr[0]._raw.tableId
			sheetId.value = arr[0]._raw.id
			// await beatch()
			// const sheetConfig = await getSheetConfig()
			// Object.assign(config.value.config, {
			// 	...sheetConfig,
			// })
			// config.value.celldata = data.value
		})
	// setTimeout(() => {
	// 	console.log('config', config.value)
	// 	config.value.celldata = Array.from({length: 51200}, (_, r) => {
	// 		return Array.from({length: 20}, (_, c) => {
	// 			return `R${r + 1}-C${c + 1}`
	// 			// return undefined
	// 		})
	// 	})
	// }, 5000)
	// setTimeout(() => {
	// 	sheetRef.value.signalrStop()
	// }, 3000)

	// sheetRef.value.signalrReload()
})

onDeactivated(() => {
	sheetRef.value.signalrStop()
})
</script>
<template>
	<div style="height: 100%" class="df">
		<!-- <button @click="onClick">获取数据</button> -->
		<AirSheet
			ref="sheetRef"
			v-model="config"
			v-model:linked="linked"
			toolbarTabs="start,synergy"
			:api="api"
			:token="token"
			:async-sheet="synergyData"
			:allHistoryData="allHistoryData"
			:cellHistoryData="cellHistoryData"
			@add-sheet="addSheet"
			@asyncInputCell="asyncInputCell"
			@asyncEventCell="onAsyncEventCell"
			@asyncRemoveSheet="onAsyncRemoveSheet"
			@asyncJoinSheet="synergyJoinSheet"
			@asyncLeaveSheet="synergyLeaveSheet"
			@asyncConfig="asyncConfig"
			@asyncCompleted="asyncCompleted"
			@asyncAllHistory="asyncAllHistory"
			@asyncCellHistory="asyncCellHistory"
		></AirSheet>
		<!-- <AirSheet v-model="config2" :row-count="999" :col-count="120"></AirSheet> -->
	</div>
</template>
<route>
	{
		meta: {
			title: 'AirSheet',
		},
	}
</route>
<style scoped lang="scss"></style>
