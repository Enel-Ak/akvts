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
	// celldata: Array.from({length: 400}, (_, r) => {
	// 	return Array.from({length: 10}, (_, c) => {
	// 		return `R${r + 1}-C${c + 1}`
	// 		// return undefined
	// 	})
	// }),
	celldata: [],
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
	globalStyle: {
		merge: {},
		rowlen: {1: 29.901378631591797},
		columnlen: {},
		customHeight: {},
		customWidth: {},
		rowhidden: {},
		colhidden: {},
		borderInfo: [
			{
				rangeType: 'cell',
				value: {
					row_index: 2,
					col_index: 1,
					t: {style: 1, color: 'rgb(0, 0, 0)'},
					b: {style: 1, color: 'rgb(0, 0, 0)'},
					l: {style: 1, color: 'rgb(0, 0, 0)'},
					r: {style: 1, color: 'rgb(0, 0, 0)'},
				},
			},
			{
				rangeType: 'range',
				borderType: 'border-all',
				color: '#000',
				style: '1',
				range: [
					{
						left: 0,
						width: 130,
						top: 106,
						height: 24,
						left_move: 0,
						width_move: 261,
						top_move: 106,
						height_move: 149,
						row: [4, 9],
						column: [0, 1],
						row_focus: 4,
						column_focus: 0,
					},
				],
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
					sqref: 'A1',
					password: '63f17f9d-1fd3-0a12-e6c3-4b7c80481951',
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
	header: [{r: 0, c: 0, v: {v: '1', ct: {fa: 'General', t: 'n'}, m: '1', bg: '#eee'}}],
}

const bba = {
	totalCount: 29,
	items: [
		{
			rowNum: 2,
			rawData:
				'[{"r":1,"c":0,"v":{"v":"31","fc":"#000000","ht":2,"ct":{"fa":"@","t":"n"},"m":"31"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: '517081f3-2fca-e44c-737f-98350aa3c585',
		},
		{
			rowNum: 3,
			rawData:
				'[{"r":2,"c":0,"v":{"v":"2","bg":"#1a0a52","it":1,"un":1,"st":1,"fc":"#01c7fc","ct":{"fa":"@","t":"n"},"m":"2"}},{"r":2,"c":1,"v":{"v":"5","fc":"#000000","ht":2,"ct":{"fa":"@","t":"n"},"m":"5"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: '34ac9f3b-3775-462a-b80e-316c5a09e750',
		},
		{
			rowNum: 4,
			rawData: '[{"r":3,"c":0,"v":{"v":"3","ct":{"fa":"@","t":"n"},"m":"3"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: '86b4798a-ffee-efea-f742-300a27d3d6e9',
		},
		{
			rowNum: 5,
			rawData:
				'[{"r":4,"c":0,"v":{"v":"1","ct":{"fa":"@","t":"n"},"m":"1"}},{"r":4,"c":1,"v":{"v":"2","ct":{"fa":"General","t":"n"},"m":"2"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: 'ea18995a-2ced-0a63-1335-98fa1ff557d2',
		},
		{
			rowNum: 6,
			rawData:
				'[{"r":5,"c":0,"v":{"v":"3","ct":{"fa":"General","t":"n"},"m":"3"}},{"r":5,"c":1,"v":{"v":"4","ct":{"fa":"General","t":"n"},"m":"4"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: 'c07206c0-c532-8cc8-aa85-36fc50cd4912',
		},
		{
			rowNum: 7,
			rawData:
				'[{"r":6,"c":0,"v":{"v":"5","ct":{"fa":"General","t":"n"},"m":"5"}},{"r":6,"c":1,"v":{"v":"6","ct":{"fa":"General","t":"n"},"m":"6"}}]',
			reportTableId: '3a170390-f8d0-a3f6-6a74-a6b4e26449b3',
			originalReportTableId: null,
			creationTime: '2025-03-11 16:47:34',
			creatorId: '3a0b509b-cc30-8570-c2a9-363a93e8e7f1',
			id: 'c3f5fce6-9917-05d2-7290-3340f812ae7f',
		},
	],
}

onMounted(() => {
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
		// sheetRef.value.airToLucky().then((res) => {
		// 	console.log(99, res)
		// })
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
