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
import {usePermissions} from '../hooks/usePermissions'
import {useSuperPermissions} from '../hooks/useSuperPermissions'
import {useSignalrStop} from '@/hooks/useSignalr'

const defaultSheet = {
	props: {},
	config: {
		// 每个sheet公共的配置
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
		undo: true, // 撤销
		synergy: false, // 协同
		createSheet: true, // 添加新sheet
		online: [], // 协同高亮在线的, 当前sheet的
		rowCount: 40,
		colCount: 20,

		// 每个sheet独立的配置
		merged: {}, // 已合并单元格
		locked: {}, // 锁定单元格
		permissions: {}, // 权限
		deepPermissions: {}, // 深度锁定
		superPermissions: {}, // 权限控制, 优先级别高于 permissions
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
		auth: 0, // 0 不设置权限, 1 每行独立, 2 每列独立, 3 单元格独立
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
		openformula: false, // 是否打开公式菜单
		formulaStyle: {},

		msg: '正在加载数据...',
		progress: -1,
	},
	name: 'Sheet',
	id: '',
	original: {},
	_temp: {},
}

export const useAirSheetStore = defineStore(`AirSheet${Math.random().toString(36).slice(2)}`, {
	persist: true, // 开启持久化
	state: () => {
		return {
			sheets: null,
			online: [], // 整个表在线的用户
			linked: false, // 是否协同链接成功
			currentUserId: null, // 当前用户ID（用于权限控制）
		}
	},
	getters: {
		getMapSheets: (state) => {
			return state.sheets
		},
		getAllSheet: (state) => {
			if (!state.sheets) return []
			return [...state.sheets]
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
		getCurrentUserId: (state) => state.currentUserId,
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

			// 🔍 调试日志: 追踪 init 调用
			console.log('🔍 [DEBUG] sheetStore.init called', {
				key,
				containerId,
				hasKey: this.sheets.has(key),
				sheetsSize: this.sheets.size,
				stack: new Error().stack,
			})

			if (!this.sheets.has(key)) {
				const clone = structuredClone(defaultSheet)

				clone.id = key
				clone.original = {sheetId: key}
				clone.containerId = containerId
				clone.name = name || `Sheet${this.sheets.size + 1}`
				clone.history = shallowReactive(new Map()) // 同一个引用
				clone.celldata = shallowReactive(new Map()) // 同一个引用
				clone.filterCellData = shallowReactive(new Map()) // 同一个引用

				// 获取传入的配置
				const incomingConfig = componentProps?.modelValue?.config || componentProps?.config

				// 判断是否是创建新 sheet
				// containerId 为 null 表示是通过 addSheet 创建的新 sheet
				const isAddingNewSheet = containerId === null

				// 从 incomingConfig 中分离公共配置和独立配置
				// 独立配置（每个 sheet 独立的数据）
				const independentConfigKeys = [
					'merged',
					'locked',
					'styled',
					'formulaed',
					'formulaMap',
					'filtered',
					'rResize',
					'cResize',
					'permissions',
					'superPermissions',
					'online',
					'keys',
					'freezeCount',
					'auth',
				]

				let publicConfig = {} // 公共配置（组件功能配置）
				let independentConfig = {} // 独立配置（每个 sheet 的数据）

				if (incomingConfig) {
					// 分离公共配置和独立配置
					const tempPublic = {}
					const tempIndependent = {}

					for (const key in incomingConfig) {
						if (independentConfigKeys.includes(key)) {
							tempIndependent[key] = incomingConfig[key]
						} else {
							tempPublic[key] = incomingConfig[key]
						}
					}

					publicConfig = tempPublic
					independentConfig = tempIndependent
				}

				// 根据是否是新 sheet 来决定如何处理独立配置
				let finalIndependentConfig = {}
				if (isAddingNewSheet) {
					// 创建新 sheet：独立配置为空对象
					independentConfigKeys.forEach((key) => {
						if (key === 'keys') {
							finalIndependentConfig[key] = []
						} else if (key === 'freezeCount') {
							finalIndependentConfig[key] = {r: 0, c: 0}
						} else if (key === 'auth') {
							finalIndependentConfig[key] = 0
						} else {
							finalIndependentConfig[key] = {}
						}
					})
				} else {
					// 初始化已有 sheet：保留原有的独立配置
					independentConfigKeys.forEach((key) => {
						if (key === 'keys') {
							finalIndependentConfig[key] = independentConfig[key] || []
						} else if (key === 'freezeCount') {
							finalIndependentConfig[key] = independentConfig[key] || {r: 0, c: 0}
						} else if (key === 'auth') {
							finalIndependentConfig[key] = independentConfig[key] || 0
						} else {
							finalIndependentConfig[key] = independentConfig[key] || {}
						}
					})
				}

				clone.config = {
					...clone.config, // defaultSheet 的默认配置
					...structuredClone(toRaw(publicConfig)), // 公共配置（组件功能配置）
					...finalIndependentConfig, // 独立配置（每个 sheet 的数据）
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
					console.log('🔍 [DEBUG] Initializing hooks for first sheet')
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
						permissionsHook: usePermissions().init(key),
						superPermissionsHook: useSuperPermissions().init(key),
					}
				} else {
					console.log('🔍 [DEBUG] Reusing hooks from existing sheet')
					re.containerId = this.sheets.values().next().value.containerId
					re.emits = this.sheets.values().next().value.emits
					re.hooks = this.sheets.values().next().value.hooks
				}
				re.state.completed = true
			}
			setTimeout(() => callback && callback(this.sheets.get(key)), 0)
			console.log('inited AirSheet', this.sheets.get(key))
		},

		initSynergySheets: async function (sheets, containerId, componentProps, emits) {
			useSignalrStop()

			// 保留第一个
			// const firstKey = this.sheets.keys().next().value
			// const firstValue = this.sheets.get(firstKey)

			// firstValue.containerId = containerId

			this.sheets?.clear()
			// this.sheets.set(firstKey, firstValue)

			// if (!sheets.length) return Promise.resolve()

			// let count = 0
			// for (const [key, value] of this.sheets) {
			// 	value.original.sheetId = sheets[count].id
			// 	value.name = sheets[count].name
			// 	count++
			// }

			// if (count < sheets.length) {
			// 	for (let i = count; i < sheets.length; i++) {
			// 		await this.init(sheets[i], containerId, componentProps, emits)
			// 	}
			// }
			this.online.length = 0
			this.linked = false
			for (let i = 0; i < sheets.length; i++) {
				// 为每个 sheet 创建独立的 componentProps
				// 需要融合 v-model 的所有配置（公共 + 独立）和 sheet 自己的配置

				const cleanProps = {
					...componentProps,
				}
				await this.init(sheets[i], containerId, cleanProps, emits)
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
		deleteSheet: function (targetKey) {
			let deleteId = ''

			for (let [mapKey, value] of this.sheets) {
				if (value.id === targetKey) {
					deleteId = mapKey
					break
				} else if (value.original.sheetId === targetKey) {
					deleteId = mapKey
					break
				}
			}

			if (deleteId) {
				console.log('deleteSheet: 删除 sheet', {targetKey, deleteId})
				this.sheets.delete(deleteId)
			} else {
				console.warn('deleteSheet: 未找到要删除的 sheet', targetKey)
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

		setCurrentUserId: function (userId) {
			this.currentUserId = userId
			console.log('设置当前用户ID:', userId)
		},
	},
})
