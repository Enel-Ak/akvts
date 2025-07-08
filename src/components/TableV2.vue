<script setup>
import {
	nextTick,
	onActivated,
	onMounted,
	onUnmounted,
	ref,
	watch,
	onDeactivated,
	onBeforeUnmount,
	computed,
} from 'vue'

import axios from 'axios'
import TableColumn from './TableColumn.vue'
import {ElMessage} from 'element-plus'
import FormItem from './FormItem.vue'
import {useGuid} from '@/hooks'
import Lock from './Lock.vue'

const emits = defineEmits([
	'update:modelValue',
	'update:showForm',
	'beforeComplete',
	'completed',
	'beforeCreate',
	'created',
	'beforeUpdate',
	'updated',
	'beforeDelete',
	'deleted',
	'beforeRowEdit',
	'clickRow',
	'clickButton',
	'selectionChange',
	'editChange',
	'sortChange',
	'formReset',
	'formClear',
	'formChanged',
	'formBeforeSubmit',
	'formBeforeEdit',
	'dialogOpen',
	'dialogClose',
	'dialogClosed',
	'dialogOpened',
	'loading',
	'error',
])
const props = defineProps({
	modelValue: {type: Array, default: () => []},
	showForm: {type: Boolean, default: false},

	rowKey: {type: String, default: 'id'},
	autoLoad: {type: Boolean, default: true},
	emptyText: {type: String, default: '暂无数据'},
	columns: {type: Array, default: () => []},
	formRules: {type: Object, default: () => {}},
	formLabelWidth: {type: [Number, String], default: '100px'},
	formColumnCount: {type: Number, default: 1},

	url: String,
	reqData: {type: Object, default: () => ({})},
	reqParams: {type: Object, default: () => ({})},
	method: {type: String, default: 'GET'},
	headers: {type: Object, default: () => ({})},
	defaultTableData: {type: Object, default: () => []},
	pagination: {type: Object, default: () => ({total: 0, size: 10, page: 1})},
	buttons: {type: Array, default: () => []},

	autoHeight: {type: Boolean, default: false},
	height: {type: [Number, String], default: 0},
	disabled: {type: Boolean, default: false},
	lastColumnAlign: {type: String, default: 'center'},
	scrollbarAlways: {type: Boolean, default: false},
	dialogFullScreen: {type: Boolean, default: false},

	enableRequestParamsLoad: {type: Boolean, default: true}, // 参数修改时发起请求
	enableOwnButton: {type: Boolean, default: true}, // 启用全部自带按钮, 新增, 编辑, 删除, 优先级高于enableCreate, enableEdit, enableDelete
	enableToolbar: {type: Boolean, default: false},
	enableDelete: {type: Boolean, default: false},
	enableCreate: {type: Boolean, default: false},
	enableEdit: {type: Boolean, default: false},
	enableSelection: {type: Boolean, default: false},
	enableIndex: {type: Boolean, default: true},
	enableRowEdit: {type: Boolean, default: false}, // 启用行内编辑
	enableSingleEdit: {type: Boolean, default: true}, // 单行编辑
	enableLatestData: {type: Boolean, default: true}, // 组件内编辑启用获取最新数据
	latestDataUrl: {type: String, default: ''}, // 获取最新数据接口
	latestDataMethod: {type: String, default: 'GET'}, // 获取最新数据接口方法
	latestDataParams: {type: Object, default: () => ({})}, // 获取最新数据接口参数
	latestDataData: {type: Object, default: () => ({})}, // 获取最新数据接口数据
	latestDataHeaders: {type: Object, default: () => ({})}, // 获取最新数据接口头

	createHideColunms: {type: Array, default: () => []},
	updateHideColunms: {type: Array, default: () => []},

	numberText: {type: String, default: '序号'},
	createText: {type: String, default: '新增'},
	editText: {type: String, default: '编辑'},
	deleteText: {type: String, default: '删除'},
	createIcon: {type: String, default: 'Create'},
	editIcon: {type: String, default: 'Edit'},
	deleteIcon: {type: String, default: 'Delete'},
	showButtonIcon: {type: Boolean, default: false},

	selectable: {type: Function, default: () => true},

	stripe: {type: Boolean, default: true},
	status: {type: String, default: 'none'},
	loading: {type: Boolean, default: false},
})

const TableStatusEnum = {
	None: 'none',
	Edit: 'edit',
}

const guid = useGuid()
const initializing = ref(false)
const tableComponentRef = ref()
const total = ref(0)
const tableData = ref([])
const tableColumns = ref([])
const customSlots = ref([])

const formRef = ref()
const formData = ref({})
const dialogTitle = ref('')
const dialogVisible = ref(props.showForm)

const currentEditRow = ref(null)
const currentEditRows = ref([])
const currentEditColumns = ref([])
const currentEidtEls = ref(null)

const disableTable = ref(props.disabled)
const lastAlign = ref(props.lastColumnAlign)
const showStripe = ref(props.stripe ? 'var(--z-table-even-bg)' : 'transparent')

const _loading = ref(props.loading)
const unLock = ref(0)

const __height = ref(0)
const __fnWidth = ref(142)
let __requestTimer = null
let clickTimer = null
let isCreate = false

watch(
	() => props.modelValue,
	(newVal) => {
		tableData.value = newVal
		nextTick(() => {
			if (newVal.length === 0) {
				setGroupWidth(true)
			} else {
				props.status === 'edit' && setTableStatus(props.status)
			}
		})
	},
	{deep: true}
)

watch(
	() => props.showForm,
	(newVal) => {
		if (newVal) {
			onDialog('create')
		}
	}
)

watch(
	() => [props.url, props.reqParams, props.reqData],
	(newVal) => {
		console.log('TableV2 Component Request Params Changed', newVal)

		if (!props.enableRequestParamsLoad) return
		// if (__requestTimer) {
		// 	console.log('TableV2 Component Request Params Changed Clear Timer')
		// 	clearTimeout(__requestTimer)
		// }
		getList()
	},
	{deep: true}
)

watch(
	() => props.columns,
	(newVal, oldVal) => {
		if (
			newVal.length === oldVal?.length &&
			newVal.every((item, index) => item.prop === oldVal[index].prop)
		) {
			console.log('TableV2 Component columns not changed')
			return
		}

		console.log('TableV2 Component columns changed')
		const arr = []
		const loops = (cols) => {
			for (const col of cols) {
				if (col.children) {
					loops(col.children)
				} else {
					if (col.hasOwnProperty('width')) {
						col._customWidth = col.width
					}
					arr.push(col.prop)
				}
			}
		}
		loops(newVal)

		tableData.value = []
		customSlots.value = arr
		nextTick(() => (tableColumns.value = newVal))
	},
	{deep: true, immediate: true}
)

watch(
	() => props.defaultTableData,
	(newVal) => {
		if (newVal) {
			tableData.value = newVal
			nextTick(() => {
				emits('update:modelValue', tableData.value)
				props.status === 'edit' && setTableStatus(props.status)
			})
		}
	},
	{deep: true}
)

watch(
	() => props.disabled,
	(newVal) => {
		disableTable.value = newVal
	}
)

watch(
	() => props.height,
	() => {
		setTableHeight()
	}
)

watch(
	() => props.loading,
	(val) => (_loading.value = val)
)

watch(
	() => formData.value,
	(newVal) => {
		const row = tableData.value.find((item) => item.id === newVal?.id)
		if (row) {
			for (const key in newVal) {
				row[key] = newVal[key]
			}
		}
	},
	{deep: true}
)

const getList = () => {
	console.log('TableV2 Component getList')
	clearTimeout(__requestTimer)
	__requestTimer = setTimeout(() => {
		if (!props.url) {
			console.log('Error: BasicTabel Component url is required')
			setTimeout(() => setFnWidth(true), 16.7) // 没接口或者不自动加载时也需要默认重新计算操作列宽度
			return
		}

		if (_loading.value) {
			return
		}

		let isEvent = false
		let timer = null

		_loading.value = true
		emits('loading', _loading.value)

		tableData.value = []
		axios
			.request({
				url: props.url,
				method: props.method,
				params: props.reqParams,
				data: props.reqData,
				headers: props.headers,
			})
			.then((res) => {
				const items = res.data.items || res.data
				const totalCount = res.data.totalCount || items.length
				const _next = (calldata) => {
					tableData.value = calldata || items
					total.value = totalCount
					_loading.value = false
					emits('update:modelValue', tableData.value)
					emits('loading', _loading.value)
					emits('completed', props.method)
					nextTick(() => {
						props.status === 'edit' && setTableStatus(props.status)
						setFnWidth(true)
					})
					console.log('TableV2 Component Next Finish', tableData.value, total.value)
				}

				emits('beforeComplete', {
					items,
					next: (calldata) => {
						clearTimeout(timer)
						isEvent = true
						// 如果有数据修改父组件需要调用 next(data),并把data传递进来
						_next(calldata)
					},
				})

				timer = setTimeout(() => {
					if (!isEvent) {
						console.log('TableV2 beforeComplete', items)
						_next()
					}
				}, 256)
			})
			.catch((err) => {
				console.log('TableV2 Component getList Error', err)
				_loading.value = false
				emits('error', err)
			})
			.finally(() => {
				console.log('TableV2 Component getList Finally')
				if (!isEvent) {
					clearTimeout(__requestTimer)
					__requestTimer = null
				}
			})
	}, 16.7)
}

const onCreate = (data) => {
	if (!props.url && props.autoLoad) {
		console.log('Error: BasicTabel Component url is required')
		return
	}
	emits('beforeCreate', data)
	axios
		.request({
			url: props.url,
			method: 'POST',
			data,
			headers: props.headers,
		})
		.then((res) => {
			emits('created', res.data)
			ElMessage.success('添加成功')
			dialogVisible.value = false
			getList()
		})
		.catch((err) => {
			emits('error', err)
		})
		.finally(() => {
			emits('completed', 'post')
		})
}

const onUpdate = (data, isBatch = false) => {
	if (!props.url && props.autoLoad && !isBatch) {
		console.log('Error: BasicTabel Component url is required')
		return
	}
	emits('beforeUpdate', data)

	if (isBatch) {
		if (!props.url) {
			return Promise.reject('Error: BasicTabel Component url is required')
		}
		return axios.request({
			url: `${props.url}/${data.id}?_t=${Date.now()}`,
			method: 'PUT',
			data,
			headers: props.headers,
		})
	}

	axios
		.request({
			url: `${props.url}/${data.id}?_t=${Date.now()}`,
			method: 'PUT',
			data,
			headers: props.headers,
		})
		.then((res) => {
			emits('updated', res.data)
			if (callback) {
				typeof callback === 'function' && callback()
			} else {
				ElMessage.success('更新成功')
				formData.value = null
				dialogVisible.value = false
				getList()
			}
		})
		.catch((err) => {
			emits('error', err)
		})
		.finally(() => {
			emits('completed', 'put')
		})
}

const onDelete = ({row}) => {
	emits('beforeDelete', row)

	// 仅删除本地表格数据
	if (props.url === undefined) {
		tableData.value.splice(tableData.value.indexOf(row), 1)
		return
	}

	if (!props.url && props.autoLoad) {
		console.log('Error: BasicTabel Component url is required')
		return
	}

	axios
		.request({
			url: `${props.url}/${row.id}`,
			method: 'DELETE',
			headers: props.headers,
		})
		.then(() => {
			emits('deleted', row)
			ElMessage.success('删除成功')
			dialogVisible.value = false
			getList()
		})
		.catch((err) => {
			emits('error', err)
		})
		.finally(() => {
			emits('completed', 'delete')
		})
}

const onClear = () => nextTick(() => (tableData.value = []))

const onFormBeforeSubmit = (form) => {
	emits('formBeforeSubmit', form)
}

const onFormSubmit = (form) => {
	if (formData.value && formData.value.id) {
		onUpdate({...formData.value, ...form})
	} else {
		onCreate(form)
	}
}

const onDialog = async (type, scoped = null) => {
	console.log('Basic Table Component onDialog', type, scoped)

	isCreate = type === 'create'
	const str = !scoped ? props.createText : props.editText

	dialogTitle.value = str
	dialogVisible.value = true

	setTimeout(() => {
		if (!scoped) {
			formRef.value?.clear()
			formData.value = {}
		} else if (props.enableLatestData && props.url) {
			axios
				.request({
					url: props.latestDataUrl || `${props.url}/${scoped.row.id}`,
					method: props.latestDataMethod || 'GET',
					params: props.latestDataParams || {},
					data: props.latestDataData || {},
					headers: props.latestDataHeaders || {},
				})
				.then((res) => {
					emits('formBeforeEdit', res.data, scoped.row)
					formData.value = Object.assign(scoped.row, res.data)
				})
		} else {
			formData.value = scoped.row
		}
	}, 0)
}

const onDialogOpen = () => {
	emits('dialogOpen', formData.value)
}

const onDialogClose = () => {
	emits('dialogClose')
}

const onDialogClosed = () => {
	formData.value = null
	emits('dialogClosed')
	emits('update:showForm', false)
}

const onDialogOpened = () => {
	emits('dialogOpened', formData.value)
	emits('update:showForm', true)
}

const onClickButton = (btn, row, index) => {
	emits('clickButton', {row, btn, index})
}

const onClickRow = (row, column) => {
	clickTimer && clearTimeout(clickTimer)
	clickTimer = setTimeout(
		() => {
			console.log('TableV2 Component Click Row', row, column)
			if (disableTable.value) {
				return
			}

			if (props.enableSelection) {
				tableComponentRef.value.toggleRowSelection(row)
			}

			emits('clickRow', {row, column})
		},
		props.enableRowEdit ? 256 : 0
	)
}

const onDoubleClickRow = (row, column, event) => {
	if (row.id === currentEditRow.value?.id) {
		return
	}
	if (props.enableRowEdit) {
		clickTimer && clearTimeout(clickTimer)
		clickTimer = null

		emits('beforeRowEdit', row, column, event)

		row.__enableEdit = true
		if (props.enableSingleEdit && currentEditRow.value) {
			currentEditRow.value.__enableEdit = false
		}

		currentEditRow.value = row
		setGroupWidth(false, column)
		console.log('TableV2 Component Double Click Row', row, column, event)
	}
}

const onSelectionChange = (val) => {
	emits('selectionChange', val)
}

const onSortChange = (val) => {
	console.log('TableV2 Component Sort Change', val)
	emits('sortChange', val)
}

const onFormChanged = (val, item) => {
	console.log('TableV2 Component Form Changed', val, item)

	emits('formChanged', {
		value: val,
		item,
		tableFormRef: formRef.value,
		row: formData.value,
	})
}

const onTableFormItemFocus = (row) => {
	if (props.enableRowEdit) {
		row.__enableEdit = true
		currentEditRow.value = row
		setTimeout(() => {
			console.log('TableV2 Component Table Form Item Focus', row)
			clickTimer && clearTimeout(clickTimer)
		}, 0) // 256ms 为单击事件的延迟
	}
}

const onTableFormItemBlur = (valid, row) => {
	if (props.enableRowEdit) {
		setTimeout(() => {
			console.log('TableV2 Component Table Form Item Blur', valid, row)
			clickTimer && clearTimeout(clickTimer)
		}, 0) // 256ms 为单击事件的延迟
	}
}

const onTableFormRowEditChange = (val, item) => {
	if (val === undefined || currentEditRow.value === null) {
		return
	}

	if (item.type === 'selectRemote') {
		if (!item.setRemoteValueToColumn) {
			console.error('Error: Table Component Row Edit FormItem remoteValue is required')
			return
		}
		currentEditRow.value[item.prop] =
			item?.options.find((option) => option.value === val)?.label ?? ''
		currentEditRow.value[item.setRemoteValueToColumn] = val
	}

	const index = currentEditRows.value.findIndex((item) => item.id === currentEditRow.value.id)

	if (index > -1) {
		currentEditRows.value.splice(index, 1, currentEditRow.value)
	} else {
		currentEditRows.value.push(currentEditRow.value)
	}

	// 记录修改过的行和列
	const cur = currentEditColumns.value.find(
		(si) => si.rid === currentEditRow.value.id && si.prop === item.prop
	)

	if (cur) {
		cur.value = val
	} else {
		currentEditColumns.value.push({rid: currentEditRow.value.id, prop: item.prop, value: val})
	}

	console.log(
		'Table Component Edit Rows:',
		val,
		currentEditColumns.value,
		currentEditRow.value,
		currentEditRows.value,
		item
	)

	emits(
		'editChange',
		val,
		currentEditColumns.value,
		currentEditRow.value,
		currentEditRows.value,
		item
	)

	nextTick(() => {
		const tableEl = tableComponentRef.value.$el
		currentEidtEls.value = tableEl.querySelectorAll('.has-changed')
		currentEidtEls.value.forEach((el) => {
			const td = el.closest('td')
			if (td) {
				td.classList.add('has-changed')
			}
		})
	})
}

const onTableRowEditSaveAll = () => {
	if (currentEditRows.value.length === 0) {
		return
	}

	console.log('TableV2 Component onTableRowEditSaveAll', currentEditRows.value)

	const temp = []
	currentEditRows.value.forEach((item) => temp.push(onUpdate(item, true)))

	const res = Promise.all(temp)
	res.then(() => {
		ElMessage.success('全部更新成功')
		currentEditRow.value = null
		currentEditRows.value.length = 0
		currentEidtEls.value.forEach((el) => {
			const td = el.closest('td')
			if (td) {
				td.classList.remove('has-changed')
			}
		})
		currentEditColumns.value.length = 0
		if (reload) getList()
	}).catch(() => {
		ElMessage.error('全部更新失败')
	})
}

const onTableRowEditCancel = (ids = [], reload = true) => {
	if (ids.length > 0) {
		if (ids.includes(currentEditRow.value?.id)) {
			currentEditRow.value = null
		}
		currentEditRows.value = currentEditRows.value.filter((item) => !ids.includes(item.id))
		currentEditColumns.value = currentEditColumns.value.filter(
			(item) => !ids.includes(item.rid)
		)
		tableData.value = tableData.value.map((item) => {
			if (ids.includes(item.id)) {
				delete item.__enableEdit
			}
			return item
		})
	} else {
		currentEditRow.value = null
		currentEditRows.value = []
		currentEditColumns.value = []

		currentEidtEls.value?.forEach((el) => {
			const td = el.closest('td')
			if (td) {
				td.classList.remove('has-changed')
			}
		})

		tableData.value = tableData.value.map((item) => {
			delete item.__enableEdit
			return item
		})
	}

	setGroupWidth(true)
	reload && getList()
}

const setGroupWidth = (isReset = false, column = null) => {
	nextTick(() => {
		const loops = (arr) =>
			arr.forEach((item) => {
				if (item.children) {
					loops(item.children)
				} else {
					let width = item._customWidth ?? 200
					if (isReset) {
						width = item._customWidth ?? undefined
					}
					item.width = width
				}
			})

		loops(tableColumns.value)
	})
}

const setTableHeight = () => {
	let height = document.body.offsetHeight
	const header = document.querySelector('.el-header.header')
	const tableToolbar = document.querySelector('.table-component-toolbar')
	const toolbar = document.querySelector('.toolbar-component')
	const pagination = document.querySelector('.pageination-component')
	const footer = document.querySelector('.el-footer.footer')

	if (header) {
		height -= header.offsetHeight
	}

	if (footer) {
		height -= footer.offsetHeight
	}

	if (toolbar) {
		height -= toolbar.offsetHeight
	}

	if (pagination) {
		height -= pagination.offsetHeight
	}

	if (tableToolbar) {
		height -= tableToolbar.offsetHeight
	}

	const finallyHeight = props.height > 0 ? props.height : height - 50
	__height.value = finallyHeight < 200 ? 200 : finallyHeight
}

let setFnWidthCount = 0
const setFnWidth = (again = false) => {
	const el = tableComponentRef.value?.$el
	let width = 0

	if (el) {
		let btns = el.querySelector('.table-component-btns')?.children

		if (again) {
			console.log('TableV2 Component setFnWidth', 'Again')
			el.querySelectorAll('.el-table__body tbody tr').forEach((tr) => {
				const buttons = tr.querySelector('td:last-child .cell')?.children
				if (buttons?.length > btns?.length) {
					btns = buttons
				} else {
					const totalWidth = (arr) =>
						Array.from(arr || []).reduce((a, b) => a + b.offsetWidth, 0)
					if (totalWidth(buttons) > totalWidth(btns)) {
						btns = buttons
					}
				}
			})
		}

		if (btns) {
			width += btns.length * 12 + 23
			for (const btn of btns) {
				width += btn.offsetWidth
			}
		}

		if (btns?.length === 0) {
			console.log('TableV2 Component setFnWidth No Buttons')
			width = 142
			if (setFnWidthCount > 10) {
				setFnWidthCount = 0
				return
			}
			setTimeout(() => {
				setFnWidthCount++
				setFnWidth(true)
			}, 1)
		}
	}

	if (!again) {
		if (props.enableOwnButton && props.enableEdit) {
			width += 70
		}

		if (props.enableOwnButton && props.enableDelete) {
			width += 70
		}
	}
	__fnWidth.value = width
}

const setEval = (str, row) => {
	try {
		const func = new Function('row', `return ${str}`)
		return func(row)
	} catch (e) {
		console.error('Error: TableV2 Component setEval', e)
	}
	// return eval(str)
}

const setTableStatus = (status) => {
	if (status === TableStatusEnum.Edit) {
		tableData.value.forEach((row) => {
			row.__enableEdit = true
		})
	} else {
		tableData.value.forEach((row) => {
			delete row.__enableEdit
		})
	}
	setGroupWidth()
}

const getFormItemByProp = (prop, arr = tableColumns.value) => {
	for (const item of arr) {
		if (item.prop === prop && !item.children) {
			return item
		}
		if (item.children) {
			const res = getFormItemByProp(prop, item.children)
			if (res) {
				return res
			}
		}
	}
	return null
}

const init = () => {
	if (initializing.value) {
		return
	}
	console.log('TableV2 Component mounted')

	initializing.value = true

	if (props.defaultTableData.length > 0) {
		tableData.value = props.defaultTableData
	}

	if (props.autoLoad) {
		console.log('TableV2 Component Auto Load')
		getList()
	}

	nextTick(() => {
		setTableHeight()
		// setFnWidth()
		window.addEventListener('resize', setTableHeight)
		initializing.value = false
	})
}

onMounted(() => init())

onActivated(() => init())

onDeactivated(() => {
	initializing.value = false
})

onBeforeUnmount(() => {
	console.log('TableV2 Component beforeUnmount')
	clearTimeout(__requestTimer)
	window.removeEventListener('resize', setTableHeight)
})

onUnmounted(() => {
	console.log('TableV2 Component unmounted')
})

defineExpose({
	clear: () => onClear(),
	cancelEdit: (ids, reload = true) => onTableRowEditCancel(ids, reload),
	disabled: (bool = true) => {
		nextTick(() => {
			disableTable.value = bool
		})
	},
	reload: () => getList(),
	isCreate: () => isCreate, // 弃用
	create: (data) => onCreate(data),
	update: (data) => onUpdate(data),
	delete: (data) => onDelete({row: data}),
	push: (data, key = '__id', isReplace = true) => {
		const setId = (row) => {
			if (!data.hasOwnProperty(key) && !data.hasOwnProperty('id')) {
				row[key] = useGuid()
			}
		}

		if (Array.isArray(data)) {
			if (data.length < 1) {
				tableData.value = []
				dialogVisible.value = false
				return
			}
			data.forEach((row) => setId(row))
			if (isReplace) {
				tableData.value = data
			} else {
				tableData.value.push(...data)
			}
		} else {
			setId(data)
			const index = tableData.value.findIndex((item) => item[key] === data[key])
			if (index > -1) {
				tableData.value.splice(index, 1, data)
			} else {
				tableData.value.push(data)
			}
		}
		dialogVisible.value = false
		nextTick(() => setFnWidth())
	},
	remove: (val, key = '__id') => {
		tableData.value = tableData.value.filter((item) => item[key] !== val)
	},
	getElTableRef: () => tableComponentRef.value,
	getTotal: () => total.value,
	getUpdateRow: () => tableData.value.find((item) => item.id === formData.value?.id),
	getTableData: () => tableData.value,
	getFormData: () => formRef.value?.getData(),
	getFormValue: (key) => formRef.value?.getValue(key),
	getSelectionRows: () => tableComponentRef.value?.getSelectionRows(),
	clearSelection: () => tableComponentRef.value?.clearSelection(),
	toggleRowSelection: (row, bool) => tableComponentRef.value?.toggleRowSelection(row, bool),
	toggleAllSelection: () => tableComponentRef.value?.toggleAllSelection(),

	setRowValue: (id, prop, val) => {
		tableData.value.find((item) => item.id === id)[prop] = val
	},
	setFormValue: (key, value) => formRef.value?.setValue(key, value),
	setFormAttr: (key, attr, value) => formRef.value?.setAttr(key, attr, value),

	visibleFormDialog: (bool, data = null) => {
		dialogVisible.value = bool
		formData.value = data
	},
})
</script>
<template>
	<div :key="guid" class="table-component" v-action:escape="onTableRowEditCancel">
		<div v-if="enableToolbar && !disableTable" class="table-component-toolbar">
			<div class="left">
				<slot name="toolbarBegin"> </slot>
				<el-popconfirm
					v-if="currentEditRows.length > 0 && currentEidtEls?.length > 0"
					title="确认保存修改?"
					confirm-button-text="确定"
					cancel-button-text="取消"
					@confirm="onTableRowEditSaveAll"
				>
					<template #reference>
						<el-button type="primary" size="small"> 批量保存 </el-button>
					</template>
				</el-popconfirm>
				<el-button v-if="currentEditRow" size="small" @click="onTableRowEditCancel">
					取消
				</el-button>

				<el-button
					v-if="enableOwnButton && enableCreate && !disableTable"
					type="primary"
					size="small"
					@click="onDialog('create')"
				>
					<Icons
						v-if="showButtonIcon"
						:name="createIcon"
						color="var(--z-nav-font-color)"
						size="16"
					/>
					{{ props.createText }}
				</el-button>
				<slot name="toolbarLeft"> </slot>
			</div>
			<div class="center">
				<slot name="toolbarCenter"> </slot>
			</div>
			<div class="right">
				<slot name="toolbarRight"> </slot>
			</div>
		</div>

		<el-table
			ref="tableComponentRef"
			v-bind="$attrs"
			v-loading="_loading"
			:row-key="rowKey"
			:height="autoHeight ? (tableData.length === 0 ? 250 : 'auto') : __height"
			:data="tableData"
			:empty-text="emptyText"
			:scrollbar-always-on="scrollbarAlways"
			border
			stripe
			@row-click="onClickRow"
			@row-dblclick="onDoubleClickRow"
			@selection-change="onSelectionChange"
			@sort-change="onSortChange"
		>
			<el-table-column
				v-if="enableSelection && !disableTable"
				:reserve-selection="true"
				:selectable="selectable"
				type="selection"
				width="60"
				align="center"
				fixed="left"
			/>

			<el-table-column
				v-if="enableIndex"
				type="index"
				:width="pagination.page < 100 ? 60 : pagination.page < 10000 ? 80 : 100"
				align="center"
				:label="numberText"
				fixed="left"
			>
				<template #default="scope">
					<span class="table-component-number">
						{{ pagination.size * (pagination.page - 1) + scope.$index + 1 }}
					</span>
				</template>
			</el-table-column>

			<!-- 表头列表 -->
			<template v-for="col of tableColumns" :key="col.prop">
				<TableColumn
					v-if="col.hasOwnProperty('tableShow') ? col.tableShow : true"
					:col="col"
					:customSlots="customSlots"
					:enableRowEdit="currentEditRow !== null"
				>
					<template v-for="slot of customSlots" #[`header-${slot}`]="scope">
						<slot :name="`header-${slot}`" v-bind="scope"></slot>
					</template>
					<template v-for="slot of customSlots" #[slot]="scope">
						<slot
							v-if="scope.row.__enableEdit && enableRowEdit"
							:name="`edit-${slot}`"
							v-bind="scope"
							:form-item="getFormItemByProp(slot)"
						>
							<FormItem
								v-model="scope.row[slot]"
								:items="[getFormItemByProp(slot)]"
								:is-row-edit="true"
								:_form-label-width="0"
								:_fromTable="true"
								:_hasChanged="
									currentEditColumns.some(
										(item) => item.rid === scope.row.id && item.prop === slot
									)
								"
								@change="onTableFormRowEditChange"
								@focus="onTableFormItemFocus(scope.row)"
								@blur="(valid) => onTableFormItemBlur(valid, scope.row)"
								size="small"
							>
								<template #[`form-${slot}-error`]>
									<slot
										:name="`edit-${slot}-error`"
										v-bind="scope"
										:form-item="getFormItemByProp(slot)"
									></slot>
								</template>
							</FormItem>
						</slot>
						<slot
							v-else
							:name="slot"
							v-bind="scope"
							:form-item="getFormItemByProp(slot)"
						>
							{{
								typeof scope.row[slot] === 'number'
									? scope.row[slot]
									: scope.row[slot] || '-'
							}}
						</slot>
					</template>
				</TableColumn>
			</template>

			<!-- 操作列 -->
			<el-table-column
				v-if="
					((enableEdit || enableDelete || buttons.length > 0) && !disableTable) ||
					buttons.some((f) => f.important) ||
					$slots.buttons
				"
				label="操作"
				align="center"
				fixed="right"
				:width="__fnWidth"
				class="table-component-btns"
			>
				<template #="scoped">
					<template
						v-for="btn of buttons.filter(
							(f) => (disableTable ? f.important : f) && !f.hasOwnProperty('more')
						)"
					>
						<template
							v-if="
								scoped.row && btn.hasOwnProperty('show')
									? setEval(btn.show, scoped.row)
									: true
							"
						>
							<el-button
								v-if="!btn.popconfirm"
								:type="btn.type"
								:disabled="
									btn.hasOwnProperty('disabled')
										? setEval(btn.disabled, scoped.row)
										: false
								"
								size="small"
								@click.stop="onClickButton(btn, scoped.row, scoped.$index)"
							>
								<Icons
									v-if="btn.icon"
									:name="btn.icon"
									:size="btn.iconSize || 14"
									:color="btn.iconColor || 'var(--z-nav-font-color)'"
								/>
								{{ btn.label }}
							</el-button>

							<el-popconfirm
								v-else-if="btn.popconfirm"
								:title="btn.popconfirm"
								confirm-button-text="确定"
								cancel-button-text="取消"
								@confirm.stop="onClickButton(btn, scoped.row, scoped.$index)"
							>
								<template #reference>
									<el-button
										:type="btn.type"
										:disabled="
											btn.hasOwnProperty('disabled')
												? setEval(btn.disabled, scoped.row)
												: false
										"
										size="small"
										@click.stop
									>
										<Icons
											v-if="btn.icon"
											:name="btn.icon"
											:size="btn.iconSize || 14"
											:color="btn.iconColor || 'var(--z-nav-font-color)'"
										/>
										{{ btn.label }}
									</el-button>
								</template>
							</el-popconfirm>
						</template>
					</template>

					<el-button
						v-if="enableOwnButton && enableEdit && !disableTable"
						type="primary"
						size="small"
						@click.stop="onDialog('edit', scoped)"
					>
						<Icons name="Edit" color="var(--z-nav-font-color)" size="16" />
						{{ props.editText }}
					</el-button>

					<el-popconfirm
						v-if="enableOwnButton && enableDelete && !disableTable"
						title="确认删除?"
						confirm-button-text="确定"
						cancel-button-text="取消"
						@confirm.stop="onDelete(scoped)"
					>
						<template #reference>
							<el-button size="small" type="danger" @click.stop>
								<Icons name="Delete" color="var(--z-nav-font-color)" size="14" />
								{{ props.deleteText }}
							</el-button>
						</template>
					</el-popconfirm>

					<slot name="buttons" :row="scoped.row"></slot>
				</template>
			</el-table-column>

			<el-table-column align="center" fixed="right" :width="70">
				<template #="scoped">
					<el-dropdown placement="bottom">
						<span class="el-dropdown-link" @click.stop>更多</span>
						<template #dropdown>
							<el-dropdown-menu>
								<el-dropdown-item
									v-for="btn of buttons.filter((f) => f.more)"
									:key="btn.label"
									@click.stop="onClickButton(btn, scoped.row, scoped.$index)"
								>
									{{ btn.label }}
								</el-dropdown-item>
							</el-dropdown-menu>
						</template>
					</el-dropdown>
				</template>
			</el-table-column>

			<template #empty>
				<slot name="empty">
					<el-empty
						:image-size="autoHeight ? 100 : 150"
						:description="
							_loading && tableData.length === 0 ? '努力获取中...' : '暂无数据'
						"
					/>
				</slot>
			</template>
		</el-table>

		<Dialog
			v-model="dialogVisible"
			:title="dialogTitle"
			:enable-button="false"
			:fullscreen="dialogFullScreen"
			:destroy-on-close="true"
			@open="onDialogOpen"
			@close="onDialogClose"
			@opened="onDialogOpened"
			@closed="onDialogClosed"
		>
			<slot name="dialogForm" :row="formData">
				<Form
					ref="formRef"
					v-model="formData"
					:rules="formRules"
					:loading="_loading"
					:props="
						tableColumns.filter((col) =>
							dialogTitle === props.editText
								? !updateHideColunms.includes(col.prop)
								: !createHideColunms.includes(col.prop)
						)
					"
					:label-width="formLabelWidth"
					:column-count="formColumnCount"
					:_fromTable="true"
					button-align="flex-end"
					@beforeSubmit="onFormBeforeSubmit"
					@submit="onFormSubmit"
					@reset="emits('formReset')"
					@clear="emits('formClear')"
					@change="onFormChanged"
					@file-change="onFormChanged"
				>
					<template v-for="slot of customSlots" #[`form-${slot}`]="scope">
						<slot :name="`form-${slot}`" v-bind="scope" :row="scope.row" />
					</template>
					<template #buttons>
						<slot name="formButtons"></slot>
					</template>
				</Form>
			</slot>
		</Dialog>
		<Lock v-model="unLock"></Lock>
	</div>
</template>
<style lang="scss" scoped>
.table-component {
	border-radius: torem(5px) torem(5px) torem(3px) torem(3px);
	overflow: hidden;
	width: 100%;

	.icon {
		margin-right: 3px;
	}

	.table-component-number {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 100%;
	}

	:deep(td.has-changed) {
		position: relative;
		&::after {
			content: '';
			border: torem(5px) solid transparent;
			border-left-color: var(--z-warning);
			left: torem(-5px);
			position: absolute;
			top: torem(-5px);
			transform: rotate(225deg);
		}
	}

	:deep(.el-table),
	:deep(.el-table tr) {
		background-color: var(--z-theme);
		.el-popper {
			max-width: torem(500px);
		}
	}

	:deep(.el-table__header) {
		thead th .cell {
			> * {
				display: inline-block;
			}

			.caret-wrapper {
				transform: translateY(-1px);
			}
		}
	}

	:deep(.el-table td.el-table__cell),
	:deep(.el-table--border th.el-table__cell) {
		border-color: var(--z-line) !important;
	}
	:deep(.el-table__cell) {
		color: var(--z-font-color);
		.link-click {
			display: block;
		}
	}
	:deep(.el-table__row) {
		.el-table__cell {
			padding: torem(5px);
		}

		td:last-child:not(.el-table__expand-column) .cell {
			align-items: center;
			display: flex;
			flex-wrap: nowrap;
			height: torem(30px);
			justify-content: v-bind(lastAlign);
		}
	}

	:deep(.el-table--border::after),
	:deep(.el-table__border-left-patch),
	:deep(.el-table__inner-wrapper::before),
	:deep(.el-table--border .el-table__inner-wrapper::after) {
		background-color: var(--z-line);
	}
	:deep(.el-table__body tr.hover-row > td.el-table__cell) {
		background-color: rgba($color: var(--z-bg-secondary-rgb), $alpha: 1) !important;
	}
	:deep(.el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell) {
		// background-color: rgba($color: var(--z-table-even-bg-rgb), $alpha: 1);
		background-color: v-bind(showStripe);
	}

	:deep(.el-table th.el-table__cell),
	:deep(.el-table thead.is-group th.el-table__cell) {
		background-color: rgba($color: var(--z-bg-secondary-rgb), $alpha: 1);
		font-size: torem(13px);
		.el-tooltip__trigger {
			display: inline;
			white-space: nowrap;
			text-overflow: ellipsis;
			overflow: hidden;
		}
	}

	:deep(.el-table.is-scrolling-right .el-table-fixed-column--left.is-last-column::before),
	:deep(.el-table.is-scrolling-middle .el-table-fixed-column--left.is-last-column::before) {
		box-shadow: inset 10px 0 10px -10px rgba(var(--z-font-color-rgb), 0.15);
	}

	:deep(.el-table.is-scrolling-left .el-table-fixed-column--right.is-first-column::before),
	:deep(.el-table.is-scrolling-middle .el-table-fixed-column--right.is-first-column::before) {
		box-shadow: inset -10px 0 10px -10px rgba(var(--z-font-color-rgb), 0.15);
	}

	:deep(.el-table__expanded-cell) {
		background-color: var(--z-bg-secondary) !important;
	}

	:deep(.form-item) {
		> * {
			width: 100% !important;
		}

		.el-checkbox-group,
		.el-radio-group {
			display: flex;
			flex-wrap: wrap;
			label {
				margin-right: 10px;
			}
		}
	}

	:deep(.el-dropdown-link) {
		cursor: pointer;
	}
}

.table-component-toolbar {
	align-items: center;
	background: var(--z-bg-secondary);
	display: flex;
	height: torem(40px);
	margin-bottom: torem(10px);
	padding: 0 torem(10px);

	> div {
		align-items: center;
		display: flex;
		&.left {
			flex: 1;
			justify-content: flex-start;
		}
		&.center {
			justify-content: center;
		}
		&.right {
			flex: 2;
			justify-content: flex-end;
		}
	}

	:deep(.table-toolbar-search) {
		align-items: center;
		display: flex;
		width: 100%;
		> * {
			margin-left: torem(10px);
		}

		.btns {
			align-items: center;
			display: flex;
			flex: none;
			justify-content: flex-end;
			width: 132px;
		}
	}
}
</style>
