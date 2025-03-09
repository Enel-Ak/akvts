<script setup name="airsheet">
import {onMounted, ref} from 'vue'

const sheetRef = ref()
const config = ref({
	config: {
		showHorizontalScreen: false,
		// showToolbar: false,
		// edit: true,
		freezeCount: {
			row: 1,
			col: 1,
		},
		cellKeys: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'],
		cellStyle: {},
	},
	celldata: Array.from({length: 40}, (_, r) => {
		return Array.from({length: 10}, (_, c) => {
			return `R${r + 1}-C${c + 1}`
			// return undefined
		})
	}),
	// celldata: [],
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
		// 		console.log(row, rowData)
		// 	},
		// },
	],
}

const fns = [
	// {
	// 	label: '操作',
	// 	click: (row, rowData) => {
	// 		console.log(row, rowData)
	// 	},
	// },
]

const aab = {
	name: 'ddd',
	displayName: 'ddd',
	externalId: null,
	theadBeginRowNum: 1,
	theadEndRowNum: 2,
	dataBeginRowNum: 1,
	dataBeginColumnNum: 1,
	globalStyle: {
		merge: {'0_0': {r: 0, c: 0, rs: 2, cs: 2}, '0_2': {r: 0, c: 2, rs: 1, cs: 2}},
		rowlen: {
			5: 23,
			6: 23,
			7: 23,
			8: 23,
			9: 23,
			10: 23,
			11: 23,
			12: 23,
			13: 23,
			14: 23,
			15: 23,
			16: 23,
			17: 23,
			18: 23,
			19: 23,
			20: 23,
			21: 23,
			22: 23,
			23: 23,
			24: 23,
			25: 23,
			26: 23,
			27: 23,
			28: 23,
			29: 23,
		},
		columnlen: {0: 123, 1: 196, 2: 444, 3: 88},
		customHeight: {0: 1},
		customWidth: {0: 1, 1: 1, 2: 1, 3: 1},
		rowhidden: {},
		colhidden: {},
		borderInfo: [
			{
				rangeType: 'cell',
				value: {
					row_index: 5,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 5,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 5,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 5,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 6,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 6,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 6,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 6,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 7,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 7,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 7,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 7,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 8,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 8,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 8,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 8,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 9,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 9,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 9,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 9,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 10,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 10,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 10,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 10,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 11,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 11,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 11,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 11,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 12,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 12,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 12,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 12,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 13,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 13,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 13,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 13,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 14,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 14,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 14,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 14,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 15,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 15,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 15,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 15,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 16,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 16,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 16,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 16,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 17,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 17,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 17,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 17,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 18,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 18,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 18,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 18,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 19,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 19,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 19,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 19,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 20,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 20,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 20,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 20,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 21,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 21,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 21,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 21,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 22,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 22,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 22,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 22,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 23,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 23,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 23,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 23,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 24,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 24,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 24,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 24,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 25,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 25,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 25,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 25,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 26,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 26,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 26,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 26,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 27,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 27,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 27,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 27,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 28,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 28,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 28,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 28,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 29,
					col_index: 0,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 29,
					col_index: 1,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 29,
					col_index: 2,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'cell',
				value: {
					row_index: 29,
					col_index: 3,
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
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
					sqref: 'C1:D1',
					password: 'da9a2edf-082f-79bf-be0a-c435bb21f058',
					name: 'NotEditableDiy',
					hintText: '单元格不可编辑!',
					algorithmName: 'None',
					saltValue: null,
				},
				{
					sqref: 'A1:B2',
					password: '1b3fd81b-0748-1ba5-6447-2dfa23a8abed',
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
	data: null,
	classType: null,
	reportTaskId: '3a187692-310e-921d-c1f0-ab662aa2fe2b',
	areaOrganizationUnitId: '3a0b4b50-9066-c974-96c0-7e04824205bf',
	header: '[{"r":0,"c":0,"v":{"v":"123","ct":{"fa":"General","t":"n"},"m":"123","mc":{"r":0,"c":0,"rs":2,"cs":2},"bg":"#eee"}},{"r":0,"c":2,"v":{"mc":{"r":0,"c":2,"rs":1,"cs":2},"v":"223","ct":{"fa":"General","t":"n"},"m":"223","bg":"#eee"}}]',
	tableType: 0,
	statisticCells: '[]',
	isStatistic: false,
	isAlien: false,
	reportTableRows: [],
	isDeleted: false,
	deleterId: null,
	deletionTime: null,
	lastModificationTime: '2025-03-05 16:24:42',
	lastModifierId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
	creationTime: '2025-03-05 11:41:58',
	creatorId: null,
	id: '3a187692-3149-25ac-2aa7-db0d8576feca',
}

const bba = {
	totalCount: 29,
	items: [
		{
			rowNum: 2,
			rawData:
				'[{"r":1,"c":2,"v":{"v":"4","ct":{"fa":"@","t":"n"},"m":"4"}},{"r":1,"c":3,"v":{"v":"5","ct":{"fa":"@","t":"n"},"m":"5"}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '0349cf04-e143-5697-9068-df8cd8228cd1',
		},
		{
			rowNum: 3,
			rawData:
				'[{"r":2,"c":0,"v":{"v":"1","ct":{"fa":"@","t":"n"},"m":"1"}},{"r":2,"c":1,"v":{"v":"2","ct":{"fa":"@","t":"n"},"m":"2"}},{"r":2,"c":2,"v":{"v":"3","ct":{"fa":"@","t":"n"},"m":"3"}},{"r":2,"c":3,"v":{"v":"6","ct":{"fa":"@","t":"n"},"m":"6"}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '76adfde3-bde5-eee2-a320-53b15d75daba',
		},
		{
			rowNum: 4,
			rawData:
				'[{"r":3,"c":0,"v":{"v":"2","ct":{"fa":"@","t":"n"},"m":"2"}},{"r":3,"c":1,"v":{"v":"3","ct":{"fa":"@","t":"n"},"m":"3"}},{"r":3,"c":2,"v":{"v":"4","ct":{"fa":"@","t":"n"},"m":"4"}},{"r":3,"c":3,"v":{"v":"5","ct":{"fa":"@","t":"n"},"m":"5"}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '5a9f8d23-ed0f-71a5-d571-d3e9442f5767',
		},
		{
			rowNum: 5,
			rawData:
				'[{"r":4,"c":0,"v":{"m":"ha","ct":{"fa":"General","t":"g"},"v":"ha"}},{"r":4,"c":1,"v":{"m":"你好","ct":{"fa":"General","t":"g"},"v":"你好"}},{"r":4,"c":2,"v":{"m":"啊啊啊","ct":{"fa":"General","t":"g"},"v":"啊啊啊"}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'c09233f3-843e-254a-ec21-646dd2a6a547',
		},
		{
			rowNum: 6,
			rawData:
				'[{"r":5,"c":0,"v":{"v":500151123,"ct":{"fa":"General","t":"n"},"m":"500151123","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":5,"c":1,"v":{"v":"侣俸镇","ct":{"fa":"General","t":"g"},"m":"侣俸镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":5,"c":2,"v":{"v":"重庆市/铜梁区/侣俸镇","ct":{"fa":"General","t":"g"},"m":"重庆市/铜梁区/侣俸镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":5,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '3ebfb8c8-4a2c-908c-3ebc-777856a1b026',
		},
		{
			rowNum: 7,
			rawData:
				'[{"r":6,"c":0,"v":{"v":500151124,"ct":{"fa":"General","t":"n"},"m":"500151124","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":6,"c":1,"v":{"v":"太平镇","ct":{"fa":"General","t":"g"},"m":"太平镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":6,"c":2,"v":{"v":"重庆市/铜梁区/太平镇","ct":{"fa":"General","t":"g"},"m":"重庆市/铜梁区/太平镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":6,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '21347bd3-8c56-7dc9-710c-d4aedd07a0ca',
		},
		{
			rowNum: 8,
			rawData:
				'[{"r":7,"c":0,"v":{"v":500152,"ct":{"fa":"General","t":"n"},"m":"500152","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":7,"c":1,"v":{"v":"潼南区","ct":{"fa":"General","t":"g"},"m":"潼南区","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":7,"c":2,"v":{"v":"重庆市/潼南区","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":7,"c":3,"v":{"v":"区县","ct":{"fa":"General","t":"g"},"m":"区县","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '71726fee-7b9b-bba2-4b9a-6e9b26167775',
		},
		{
			rowNum: 9,
			rawData:
				'[{"r":8,"c":0,"v":{"v":500152001,"ct":{"fa":"General","t":"n"},"m":"500152001","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":8,"c":1,"v":{"v":"桂林街道","ct":{"fa":"General","t":"g"},"m":"桂林街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":8,"c":2,"v":{"v":"重庆市/潼南区/桂林街道","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/桂林街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":8,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '3d7c1b01-a02d-b223-a25c-0f8a8f4a60fd',
		},
		{
			rowNum: 10,
			rawData:
				'[{"r":9,"c":0,"v":{"v":500152002,"ct":{"fa":"General","t":"n"},"m":"500152002","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":9,"c":1,"v":{"v":"梓潼街道","ct":{"fa":"General","t":"g"},"m":"梓潼街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":9,"c":2,"v":{"v":"重庆市/潼南区/梓潼街道","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/梓潼街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":9,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '0468cb14-b4f0-d617-b58b-6c4dd744faa6',
		},
		{
			rowNum: 11,
			rawData:
				'[{"r":10,"c":0,"v":{"v":500152003,"ct":{"fa":"General","t":"n"},"m":"500152003","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":10,"c":1,"v":{"v":"潼南区大佛街道","ct":{"fa":"General","t":"g"},"m":"潼南区大佛街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":10,"c":2,"v":{"v":"重庆市/潼南区/潼南区大佛街道","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/潼南区大佛街道","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":10,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'a83969cb-2c33-1d67-fd2a-bede761b6da7',
		},
		{
			rowNum: 12,
			rawData:
				'[{"r":11,"c":0,"v":{"v":500152101,"ct":{"fa":"General","t":"n"},"m":"500152101","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":11,"c":1,"v":{"v":"上和镇","ct":{"fa":"General","t":"g"},"m":"上和镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":11,"c":2,"v":{"v":"重庆市/潼南区/上和镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/上和镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":11,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '61bac381-0a6b-1516-3ea8-2c5c79c51f06',
		},
		{
			rowNum: 13,
			rawData:
				'[{"r":12,"c":0,"v":{"v":500152102,"ct":{"fa":"General","t":"n"},"m":"500152102","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":12,"c":1,"v":{"v":"龙形镇","ct":{"fa":"General","t":"g"},"m":"龙形镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":12,"c":2,"v":{"v":"重庆市/潼南区/龙形镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/龙形镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":12,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '050b4afe-634d-b577-d4ab-c0e24a27555d',
		},
		{
			rowNum: 14,
			rawData:
				'[{"r":13,"c":0,"v":{"v":500152103,"ct":{"fa":"General","t":"n"},"m":"500152103","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":13,"c":1,"v":{"v":"古溪镇","ct":{"fa":"General","t":"g"},"m":"古溪镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":13,"c":2,"v":{"v":"重庆市/潼南区/古溪镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/古溪镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":13,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'c1e3af94-0402-8010-9f46-b396e8330141',
		},
		{
			rowNum: 15,
			rawData:
				'[{"r":14,"c":0,"v":{"v":500152104,"ct":{"fa":"General","t":"n"},"m":"500152104","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":14,"c":1,"v":{"v":"宝龙镇","ct":{"fa":"General","t":"g"},"m":"宝龙镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":14,"c":2,"v":{"v":"重庆市/潼南区/宝龙镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/宝龙镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":14,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'b5ed4090-be41-da9b-2ec6-2728f4533678',
		},
		{
			rowNum: 16,
			rawData:
				'[{"r":15,"c":0,"v":{"v":500152107,"ct":{"fa":"General","t":"n"},"m":"500152107","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":15,"c":1,"v":{"v":"玉溪镇","ct":{"fa":"General","t":"g"},"m":"玉溪镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":15,"c":2,"v":{"v":"重庆市/潼南区/玉溪镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/玉溪镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":15,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'd9115358-c7ea-a3ed-e002-c0cee17e7c18',
		},
		{
			rowNum: 17,
			rawData:
				'[{"r":16,"c":0,"v":{"v":500152108,"ct":{"fa":"General","t":"n"},"m":"500152108","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":16,"c":1,"v":{"v":"米心镇","ct":{"fa":"General","t":"g"},"m":"米心镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":16,"c":2,"v":{"v":"重庆市/潼南区/米心镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/米心镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":16,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'f4bb2de6-43aa-e5ae-51bb-e8179df36f93',
		},
		{
			rowNum: 18,
			rawData:
				'[{"r":17,"c":0,"v":{"v":500152109,"ct":{"fa":"General","t":"n"},"m":"500152109","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":17,"c":1,"v":{"v":"群力镇","ct":{"fa":"General","t":"g"},"m":"群力镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":17,"c":2,"v":{"v":"重庆市/潼南区/群力镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/群力镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":17,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '5ef2951d-b528-a504-cbe1-ccb3e870ff8d',
		},
		{
			rowNum: 19,
			rawData:
				'[{"r":18,"c":0,"v":{"v":500152110,"ct":{"fa":"General","t":"n"},"m":"500152110","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":18,"c":1,"v":{"v":"双江镇","ct":{"fa":"General","t":"g"},"m":"双江镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":18,"c":2,"v":{"v":"重庆市/潼南区/双江镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/双江镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":18,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'e9a057c1-4404-5029-030d-6af0001ba45d',
		},
		{
			rowNum: 20,
			rawData:
				'[{"r":19,"c":0,"v":{"v":500152112,"ct":{"fa":"General","t":"n"},"m":"500152112","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":19,"c":1,"v":{"v":"花岩镇","ct":{"fa":"General","t":"g"},"m":"花岩镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":19,"c":2,"v":{"v":"重庆市/潼南区/花岩镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/花岩镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":19,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: 'b76b9508-880d-2d2f-3a34-ab0654072284',
		},
		{
			rowNum: 21,
			rawData:
				'[{"r":20,"c":0,"v":{"v":500152113,"ct":{"fa":"General","t":"n"},"m":"500152113","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":20,"c":1,"v":{"v":"柏梓镇","ct":{"fa":"General","t":"g"},"m":"柏梓镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":20,"c":2,"v":{"v":"重庆市/潼南区/柏梓镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/柏梓镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":20,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '4f9877bf-43b4-dce1-cb08-428bc66b0440',
		},
		{
			rowNum: 22,
			rawData:
				'[{"r":21,"c":0,"v":{"v":500152114,"ct":{"fa":"General","t":"n"},"m":"500152114","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":21,"c":1,"v":{"v":"崇龛镇","ct":{"fa":"General","t":"g"},"m":"崇龛镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":21,"c":2,"v":{"v":"重庆市/潼南区/崇龛镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/崇龛镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":21,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '4b8a662a-3e23-7e9c-5311-23dc364c46d0',
		},
		{
			rowNum: 23,
			rawData:
				'[{"r":22,"c":0,"v":{"v":500152115,"ct":{"fa":"General","t":"n"},"m":"500152115","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":22,"c":1,"v":{"v":"塘坝镇","ct":{"fa":"General","t":"g"},"m":"塘坝镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":22,"c":2,"v":{"v":"重庆市/潼南区/塘坝镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/塘坝镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":22,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '3b9c5ddc-8973-5a03-aa92-d97c84c43102',
		},
		{
			rowNum: 24,
			rawData:
				'[{"r":23,"c":0,"v":{"v":500152116,"ct":{"fa":"General","t":"n"},"m":"500152116","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":23,"c":1,"v":{"v":"新胜镇","ct":{"fa":"General","t":"g"},"m":"新胜镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":23,"c":2,"v":{"v":"重庆市/潼南区/新胜镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/新胜镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":23,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '3ee875a0-fba6-aad6-d357-411b01e917eb',
		},
		{
			rowNum: 25,
			rawData:
				'[{"r":24,"c":0,"v":{"v":500152117,"ct":{"fa":"General","t":"n"},"m":"500152117","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":24,"c":1,"v":{"v":"太安镇","ct":{"fa":"General","t":"g"},"m":"太安镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":24,"c":2,"v":{"v":"重庆市/潼南区/太安镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/太安镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":24,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '76f4cb59-8211-a60b-a2f7-f44b658099da',
		},
		{
			rowNum: 26,
			rawData:
				'[{"r":25,"c":0,"v":{"v":500152119,"ct":{"fa":"General","t":"n"},"m":"500152119","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":25,"c":1,"v":{"v":"小渡镇","ct":{"fa":"General","t":"g"},"m":"小渡镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":25,"c":2,"v":{"v":"重庆市/潼南区/小渡镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/小渡镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":25,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '6f64bde1-669e-f918-b79b-6c79a08d0657',
		},
		{
			rowNum: 27,
			rawData:
				'[{"r":26,"c":0,"v":{"v":500152120,"ct":{"fa":"General","t":"n"},"m":"500152120","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":26,"c":1,"v":{"v":"卧佛镇","ct":{"fa":"General","t":"g"},"m":"卧佛镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":26,"c":2,"v":{"v":"重庆市/潼南区/卧佛镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/卧佛镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":26,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '64a6d1e7-99b8-6315-936a-4ee04c1eff2a',
		},
		{
			rowNum: 28,
			rawData:
				'[{"r":27,"c":0,"v":{"v":500152121,"ct":{"fa":"General","t":"n"},"m":"500152121","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":27,"c":1,"v":{"v":"五桂镇","ct":{"fa":"General","t":"g"},"m":"五桂镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":27,"c":2,"v":{"v":"重庆市/潼南区/五桂镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/五桂镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":27,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '95359a3f-e7c6-7758-269e-50a4a97dee59',
		},
		{
			rowNum: 29,
			rawData:
				'[{"r":28,"c":0,"v":{"v":500152122,"ct":{"fa":"General","t":"n"},"m":"500152122","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":28,"c":1,"v":{"v":"田家镇","ct":{"fa":"General","t":"g"},"m":"田家镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":28,"c":2,"v":{"v":"重庆市/潼南区/田家镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/田家镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":28,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '7627f232-2b58-3b4e-1ae4-76754560379e',
		},
		{
			rowNum: 30,
			rawData:
				'[{"r":29,"c":0,"v":{"v":500152123,"ct":{"fa":"General","t":"n"},"m":"500152123","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":29,"c":1,"v":{"v":"别口镇","ct":{"fa":"General","t":"g"},"m":"别口镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":29,"c":2,"v":{"v":"重庆市/潼南区/别口镇","ct":{"fa":"General","t":"g"},"m":"重庆市/潼南区/别口镇","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}},{"r":29,"c":3,"v":{"v":"街镇乡","ct":{"fa":"General","t":"g"},"m":"街镇乡","bg":null,"bl":0,"it":0,"ff":5,"fs":12,"fc":"rgb(0, 0, 0)","ht":1,"vt":0}}]',
			reportTableId: '3a187692-3149-25ac-2aa7-db0d8576feca',
			originalReportTableId: null,
			creationTime: '2025-03-05 16:24:42',
			creatorId: '3a0b5071-fcdc-2e3c-0bf9-ef93850b30a3',
			id: '4016e7de-c399-522b-300c-5b1fe7c78733',
		},
	],
}

onMounted(() => {
	// sheetRef.value
	// 	.luckyToAir(aab.globalStyle, [
	// 		...JSON.parse(aab.header),
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
	// sheetRef.value.setMergeCell(5, 4, 4, 4)
	// sheetRef.value.setMergeCell(1, 5, 4, 4)
	// sheetRef.value.setCellValue(0, 0, 'hello')

	// config.value.config.cellStyle = {
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
		// sheetRef.value.setMergeCell(0, 0, 2, 4)
		// sheetRef.value.setRange(0, 0, 2, 4)
		// config.value.celldata[0][0] = '123'
		// config.value.celldata[0][0] = '123'
		sheetRef.value.airToLucky().then((res) => {
			console.log(99, res)
		})
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
		// 		console.log(99, res)
		// 		config.value.config = res.config
		// 		config.value.celldata = res.celldata
		// 	})
	}, 5000)
	// sheetRef.value.mergeCells(1, 3, 3, 3)
})

const onClick = () => {
	console.log(sheetRef.value.getSheet())
}
</script>
<template>
	<div style="height: 100%" class="df">
		<!-- <button @click="onClick">获取数据</button> -->
		<AirSheet ref="sheetRef" v-model="config" :fns="fns"></AirSheet>
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
