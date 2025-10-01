import {reactive, unref, toRaw, nextTick, shallowReactive} from 'vue'
import {defineStore} from 'pinia'
import {useStyle} from '../hooks/useStyle'
import {useResize} from '../hooks/useResize'
import {useMerge} from '../hooks/useMerge'
import {useCopy} from '../hooks/useCopy'
import {useEdit} from '../hooks/useEdit'
import {useTools} from '../hooks/useTools'
import {useHistory} from '../hooks/useHistory'
import {useRender} from '../hooks/useRender'
import {useContextMenu} from '../hooks/useContextMenu'
import {useSelectionRange} from '../hooks/useSelectionRange'
import {useExcel} from '../hooks/useExcel'
import {useSynergy} from '../hooks/useSynergy'

const defaultSheet = {
	props: {},
	config: {
		howHorizontalScreen: true, // 移动端不是横向提醒
		showToolBar: true, // 工具栏
		showstateBar: true, // 状态栏
		font: true, // 字体
		format: true, // 单元格格式
		color: true, // 颜色
		fill: true, // 填充
		bold: true, // 加粗
		strikethrough: true, // 删除线
		italic: true, // 斜体
		underline: true, // 下划线
		merge: true, // 合并单元格
		align: true, // 对齐方式
		border: true, // 边框
		addRow: true, // 添加行
		removeRow: true, // 删除行
		addColumn: true, // 添加列
		removeColumn: true, // 删除列
		export: true, // 导出
		import: true, // 导入
		edit: true, // 编辑
		lock: true, // 锁定
		unlock: true, // 解锁
		formula: true, // 公式
		copy: true, // 复制
		paste: true, // 粘贴
		zoom: 1, //缩放
		freeze: false, // 冻结
		full: true, // 全屏
		filter: true, // 筛选
		find: true, // 查找
		synergy: false, // 协同

		online: [], // 协同高亮在线的, 当前sheet的
		merged: {}, // 已合并单元格
		locked: {}, // 锁定单元格
		styled: {}, // 有样式的单元格
		formulaed: {}, // 有公式的单元格
		formulaMap: {}, // 被公式引用的单元格
		filtered: {}, // 有筛选的单元格
		rResize: {}, // 有调整大小的行
		cResize: {}, // 有调整大小的列
		keys: [], //  配置单元格的 Key

		freezeCount: {
			r: 0,
			c: 0,
		},

		rowCount: 40,
		colCount: 20,
	},
	history: null, // 历史记录
	hooks: {}, // 扩展对象
	state: {
		changeSheet: false, // 是否正在切换sheet
		render: false, // 是否正在渲染
		loading: false, // 是否正在加载
		importing: false, // 是否正在导入
		exporting: false, // 是否正在导出
		scrolling: false, // 是否正在滚动
		completed: false, // 是否初始化完成
		filter: false, // 是否开启筛选
		search: false, // 是否开启查找
		formula: false, // 是否进入公式状态

		msg: '正在加载数据...',
		progress: -1,
	},
	name: 'Sheet',
	id: '',
	original: {},
	_temp: {},
}

export const useAirSheetStore = defineStore('AirSheet', {
	persist: true, // 开启持久化
	state: () => {
		return {
			sheets: null,
			online: [], // 整个表在线的用户
			linked: false, // 是否协同链接成功
		}
	},
	getters: {
		getMapSheets: (state) => {
			return state.sheets
		},
		getAllSheet: (state) => {
			return [...state?.sheets]
		},
		getSheet: (state) => (key) => {
			if (!state.sheets) return null
			for (const [_, sheet] of state.sheets) {
				if (sheet.original.sheetId === key || sheet.id === key) {
					return sheet
				}
			}
			return null
		},
		getLoading: (state) => (key) => state.sheets?.get(key)?.loading,
		getCompleted: (state) => (key) => state.sheets?.get(key)?.completed,
		getTempAttr: (state) => (key, attr) => state.sheets?.get(key)?._temp[attr],
		getLastSheet: (state) => {
			let lastValue = null
			for (const [key, value] of state.sheets) {
				lastValue = value
			}
			return lastValue
		},
		getLinked: (state) => state.linked,
		getOnline: (state) => state.online,
	},
	actions: {
		init: async function (sheet, containerId, componentProps, emits, callback) {
			if (!this.sheets) {
				this.sheets = new Map()
			}

			let key = sheet
			let name = ''

			if (typeof sheet === 'object') {
				key = sheet.id
				name = sheet.name
			}

			if (!this.sheets.has(key)) {
				const clone = structuredClone(defaultSheet)

				clone.id = key
				clone.original = {sheetId: key}
				clone.containerId = containerId
				clone.name = name || `Sheet${this.sheets.size + 1}`
				clone.history = shallowReactive(new Map()) // 同一个引用
				clone.celldata = shallowReactive(new Map()) // 同一个引用
				clone.filterCellData = shallowReactive(new Map()) // 同一个引用
				clone.config = {
					...clone.config,
					...structuredClone(
						toRaw(componentProps?.modelValue?.config || componentProps?.config)
					),
				}

				const jsonProps = JSON.parse(JSON.stringify(componentProps))
				if (jsonProps?.modelValue?.config) {
					clone.original.config = jsonProps?.modelValue?.config // 原始配置
				}
				delete jsonProps.modelValue
				clone.props = {...clone.props, ...jsonProps}

				this.sheets.set(key, clone)

				const re = this.sheets.get(key)
				if (containerId && this.sheets.size === 1) {
					re.emits = emits
					re.hooks = {
						renderHook: useRender().init(key),
						styleHook: useStyle().init(key),
						resizeHook: useResize().init(key),
						mergeHook: useMerge().init(key),
						copyHook: useCopy().init(key),
						toolsHook: useTools().init(key),
						historyHook: useHistory().init(key),
						editHook: useEdit().init(key, containerId),
						selectionRangeHook: useSelectionRange().init(key, containerId),
						contextMenuHook: useContextMenu().init(key, containerId),
						excelHook: useExcel().init(key),
						synergyHook: useSynergy().init(key),
					}
				} else {
					re.containerId = this.sheets.values().next().value.containerId
					re.emits = this.sheets.values().next().value.emits
					re.hooks = this.sheets.values().next().value.hooks
				}
				re.state.completed = true
			}
			setTimeout(() => callback && callback(this.sheets.get(key)), 0)
			console.log('inited AirSheet', this.sheets.get(key))
		},

		initSynergySheets: async function (sheets, containerId, componentProps) {
			let count = 0
			for (const [key, value] of this.sheets) {
				value.original.sheetId = sheets[count].id
				value.name = sheets[count].name
				count++
			}
			if (count < sheets.length) {
				for (let i = count; i < sheets.length; i++) {
					await this.init(sheets[i], containerId, componentProps)
				}
			}
		},

		addSheet: async function (sheet, componentProps, emits, callback) {
			await this.init(sheet, null, componentProps, emits, callback)
		},
		setTempAttr: function (key, attr, value) {
			if (!this.sheets.has(key)) return
			this.sheets.get(key)._temp[attr] = value
		},
		deleteTempAttr: function (key, attr) {
			if (!this.sheets.has(key)) return
			delete this.sheets.get(key)._temp[attr]
		},
		setSheetName: function (key, name) {
			for (const [_, sheet] of this.sheets) {
				if (sheet.original.sheetId === key || sheet.id === key) {
					sheet.name = name
					break
				}
			}
		},
		deleteSheet: function (key) {
			let deleteId = ''

			for (let [key, value] of this.sheets) {
				if (value.id === key) {
					deleteId = value.id
				} else if (value.original.sheetId === key) {
					deleteId = value.original.sheetId
				}
			}

			if (deleteId) {
				this.sheets.delete(deleteId)
			}
		},
		setLinked: function (value) {
			this.linked = value
		},
		setOnline: function (arr) {
			this.online = arr
		},

		removeOnlineUser: function (userId) {
			this.online = this.online.filter((item) => item.id !== userId)
		},
	},
})
