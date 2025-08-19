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
		zoom: 1, //缩放
		freeze: false, // 冻结
		full: true, // 全屏

		online: [], // 协同高亮在线的
		merged: {}, // 已合并单元格
		locked: {}, // 锁定单元格
		styled: {}, // 有样式的单元格
		formulaed: {}, // 有公式的单元格
		rResize: {}, // 有调整大小的行
		cResize: {}, // 有调整大小的列
		keys: [], //  配置单元格的 Key

		freezeCount: {
			row: 0,
			col: 0,
		},

		rowCount: 0,
		colCount: 0,
	},
	selectedCell: null, // 单个单元格选中
	selectedRange: null, // 范围单元格选中
	selectedRows: null, // 点击行号选中
	selectedColumns: null, // 点击列号选中
	history: null, // 历史记录
	hooks: {}, // 扩展对象
	state: {
		render: false, // 是否正在渲染
		loading: false, // 是否正在加载
		scrolling: false, // 是否正在滚动
		completed: false, // 是否初始化完成
		msg: '正在加载数据...',
		progress: -1,
	},
}

export const useAirSheetStore = defineStore('AirSheet', {
	persist: true, // 开启持久化
	state: () => {
		return {
			sheets: null,
		}
	},
	getters: {
		getSheet: (state) => (key) => state.sheets?.get(key),
		getLoading: (state) => (key) => state.sheets?.get(key)?.loading,
		getCompleted: (state) => (key) => state.sheets?.get(key)?.completed,
	},
	actions: {
		init: async function (key, componentProps, callback) {
			if (!this.sheets) {
				this.sheets = new Map()
			}
			if (!this.sheets.has(key)) {
				const clone = structuredClone(defaultSheet)
				clone.id = key
				clone.history = shallowReactive(new Map()) // 同一个引用
				clone.celldata = shallowReactive(new Map()) // 同一个引用
				clone.config = {
					...clone.config,
					...structuredClone(toRaw(componentProps.modelValue.config)),
				}

				const jsonProps = JSON.parse(JSON.stringify(componentProps))
				delete jsonProps.modelValue
				clone.props = {...clone.props, ...jsonProps}

				this.sheets.set(key, clone)

				const re = this.sheets.get(key)
				re.hooks = {
					renderHook: useRender().init(re),
					styleHook: useStyle().init(key),
					resizeHook: useResize().init(re),
					mergeHook: useMerge().init(re),
					copyHook: useCopy().init(re),
					toolsHook: useTools().init(key),
					historyHook: useHistory().init(key),
					editHook: useEdit().init(key, re),
					selectionRangeHook: useSelectionRange().init(key, re),
					contextMenuHook: useContextMenu().init(key, re),
				}
				re.fn = {
					render: () => this.render(key),
				}
				re.state.completed = true
			}
			setTimeout(() => callback && callback(), 0)
			console.log('inited AirSheet', this.sheets.get(key))
		},
	},
})
