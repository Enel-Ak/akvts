<script setup name="airsheet">
import {onActivated, ref, onMounted, watch, nextTick, toRaw, triggerRef, onDeactivated} from 'vue'
import {useRoute} from 'vue-router'
import axios from 'axios'

const route = useRoute()
const sheetRef = ref()
const config = ref({
	config: {
		synergy: true,
		showHorizontalScreen: false,
		auth: 0,
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
	? 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjA5NTg1NTEsImV4cCI6MTc2MTEzMDU1MSwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWNhZjctZjVkMC00MDlmLWFiMGFkYzllMGRjMCIsImF1dGhfdGltZSI6MTc2MDk1ODU1MCwiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzk5NjM3MTg4N0BpbnNwdXIuY29tIiwieWt6LWlkIjoiMzU0MDkyIiwieWt6LWVtcGxveWVlLWNvZGUiOiJHRV8xNjM1MDg4MzAwNjQ3OTExNDI0Iiwicm9sZSI6WyLlj7DotKbkuIrkuIvnur8iLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5bel5L2c5Lq65ZGYIl0sInBob25lX251bWJlcl92ZXJpZmllZCI6IkZhbHNlIiwiZW1haWxfdmVyaWZpZWQiOiJGYWxzZSIsIm5hbWUiOiJ5a3otMTM5OTYzNzE4ODciLCJidXNpbmVzc1JvbGUiOiLlt6XkvZzkurrlkZgiLCJkZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYyLWQzMmQtYmEzYi02MmM4ZDgyODgzMTMiLCJiaWdEZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYyLWJkZTMtZTY0ZS02MWExZjNhZWM5OTAiLCJpYXQiOjE3NjA5NTg1NTEsInNjb3BlIjpbImFkZHJlc3MiLCJlbWFpbCIsImluc3B1ci1hYnAtYXBwbGljYXRpb24iLCJpbnNwdXItbGVkZ2VyIiwib3BlbmlkIiwicGhvbmUiLCJwcm9maWxlIiwicm9sZSIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJBdXRoQ29kZSJdfQ.euSGcgEfru1dA0gTVQM5NdvoUwN3RVwD6UvYVDGn9kn30l8BIyXjJW4twnWA2KlWieAJfCeO2vj1v8qvut0gDVsHTQ_9KuWQYeh4jL_JuALzDfuOzwd7-vjQ2gHy5TZRNwm1FANGfqXyFXiSVirLg_lgKeJEhESvx4HQstYg0AhiHwy3rzon-zRBjbhea_wa-tvN3j5cfzArgFCxQwj9woJNyH-_GTdJQBNIFoCp9fSntlMv2oF-iGt166B0mqdvfHxjDcfnUi5XZeTcgb3fOuvUhZK7Oej8zDkUo3GjsL0u9Z77k6QRGbDexAMP7AcO5o7itqxRQ86yMqkTBlIMmw'
	: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjY4RDU4RkU5MDdBN0FFMjk3OEI0RjE5MkIyNzI2RjZCIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjA5NTg1MTQsImV4cCI6MTc2MTEzMDUxNCwiaXNzIjoiaHR0cDovLzEyNy4wLjAuMSIsImF1ZCI6WyJpbnNwdXItYWJwLWFwcGxpY2F0aW9uIiwiaW5zcHVyLWxlZGdlciJdLCJjbGllbnRfaWQiOiJ2dWUtYWRtaW4tZWxlbWVudCIsInN1YiI6IjNhMGI1MDliLWNjMzAtODU3MC1jMmE5LTM2M2E5M2U4ZTdmMSIsImF1dGhfdGltZSI6MTc2MDk1ODUxMywiaWRwIjoibG9jYWwiLCJlbWFpbCI6Inlrei0xMzk4MzcwMDk2MEBpbnNwdXIuY29tIiwicm9sZSI6WyJsZWRnZXItc3VwZXItYWRtaW4iLCLliIbnrqHpooblr7wiLCLliqDop6Plr4YiLCLlj7DotKbkuIrkuIvnur8iLCLln7rnoYDlip_og70t5rid5b-r5pS_Iiwi5aSn5bGP5p-l55yLIiwi5biC5Yy66am-6am26IixIiwi5pWw5o2u6ZuG566h55CGIiwi5pWw5o2u6aKG5a-8Il0sInBob25lX251bWJlciI6IjE2NjIzNjYzNjc4IiwicGhvbmVfbnVtYmVyX3ZlcmlmaWVkIjoiRmFsc2UiLCJlbWFpbF92ZXJpZmllZCI6IkZhbHNlIiwibmFtZSI6Inljc3Rqc2pnbGciLCJidXNpbmVzc1JvbGUiOiLliIbnrqHpooblr7ws5bel5L2c5Lq65ZGYLOaVsOaNrumihuWvvCzljLrljr_lj7DotKbov5Dnu7TlkZgiLCJkZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYxLWIzNmMtMGZjNy1kNmRjN2M5Y2YyYTciLCJiaWdEZXBhcnRtZW50SWQiOiIzYTBiNGI1MC05MDYxLTFjZDItYzJjYS1hMmVmMDJmZGIyNmIiLCJpYXQiOjE3NjA5NTg1MTQsInNjb3BlIjpbImFkZHJlc3MiLCJlbWFpbCIsImluc3B1ci1hYnAtYXBwbGljYXRpb24iLCJpbnNwdXItbGVkZ2VyIiwib3BlbmlkIiwicGhvbmUiLCJwcm9maWxlIiwicm9sZSIsIm9mZmxpbmVfYWNjZXNzIl0sImFtciI6WyJBdXRoQ29kZSJdfQ.L9L2lrupzmupS9lUg_SoPFCVcSqLeB77Ar6PNB1h3melT8UdBRTU93BKsw_qsWDtw69QE2YabTtiiuFPVCp1tmG5h9orrX7LXEqWygI9zTCMXMeq_oinYWnYHd4umgYw6EVJMk4MJ_QfXnoj6DJeFtjjt27i2Gw4dLz6RueoQeFs5NJIOsCfCynzbGKpByD9fvOIFnWtDM0MDW8ySGCQ0VdeQ5GXK3Baa8v9po-TZEmMtUbHZZFPZYEOuRoM70Yo4AXiMyjYi3yjwI7si9BKZLf7z5-vy4VWkvz1S03CympP-rqgnL-PjquoHm98OzPvQYsQLIu9CFjf0mAT4t1qhQ'

const synergyData = ref([])
const tableId = ref('')
const sheetId = ref('')
const completed = ref(false)

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

const synergyJoinSheet = async (id, sheet) => {
	// if (!completed.value) return

	sheetId.value = id
	await sheetRef.value.asyncJoinSheet(sheetId.value)
	// config.value.celldata = [[1], [2]]
	// console.log('config', config.value)
	sheetRef.value.loading(true, '正在获取最新数据')
	await beatch()
	const sheetConfig = await getSheetConfig()

	console.log('sheetConfig', sheetConfig, sheet)

	if (sheet) {
		// 更新配置
		Object.assign(sheet.config, {
			...sheetConfig,
			permissions: {},
			deepPermissions: sheetConfig.deepPermissions || {}, //
			superPermissions: [{r: 2, c: 1, rr: 3, cc: 3, v: '权限区域'}],
		})

		console.log('配置已更新:', sheet.config)

		// ✅ 修复：手动同步 merged 配置到 mergedCells Map
		if (sheet.hooks?.mergeHook?.refreshMerge) {
			sheet.hooks.mergeHook.refreshMerge()
			console.log('✅ 合并单元格已同步')
		}

		// ✅ 修复：如果有公式配置，重新计算公式
		if (sheetConfig.formulaed && Object.keys(sheetConfig.formulaed).length > 0) {
			if (sheet.hooks?.editHook?.setFormulaValue) {
				sheet.hooks.editHook.setFormulaValue()
				console.log('✅ 公式已重新计算')
			}
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

onActivated(() => {
	// 获取sheets
	axios
		.request({
			url: 'http://100.92.2.93:8001/api/online-table/table/3a1d179d-6f3f-e4fb-81c4-7ff7e90831df?autoCreate=true',
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
			:api="api"
			:token="token"
			:async-sheet="synergyData"
			@add-sheet="addSheet"
			@asyncInputCell="asyncInputCell"
			@asyncEventCell="onAsyncEventCell"
			@asyncRemoveSheet="onAsyncRemoveSheet"
			@asyncJoinSheet="synergyJoinSheet"
			@asyncLeaveSheet="synergyLeaveSheet"
			@asyncConfig="asyncConfig"
			@asyncCompleted="asyncCompleted"
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
