<script setup>
import {
	nextTick,
	onActivated,
	onMounted,
	onUnmounted,
	ref,
	toRaw,
	watch,
	onDeactivated,
	computed,
} from 'vue'
import {useGlobal} from '@/store/useGlobal'
import axios from 'axios'
import TableColumn from './TableColumn.vue'
import {ElMessage} from 'element-plus'
import FormItem from './FormItem.vue'

const global = useGlobal()
const emits = defineEmits([
	'beforeComplete',
	'completed',
	'beforeCreate',
	'created',
	'beforeUpdate',
	'updated',
	'beforeDelete',
	'deleted',
	'clickButton',
	'formReset',
	'formClear',
	'formChanged',
	'formBeforeSubmit',
	'formBeforeEdit',
	'dialogOpen',
	'dialogClose',
	'dialogClosed',
	'dialogOpened',
])
const props = defineProps({
	rowKey: {type: String, default: 'id'},
	autoLoad: {type: Boolean, default: true},
	emptyText: {type: String, default: '暂无数据'},
	columns: {type: Array, default: () => []},
	formRules: {type: Object, default: () => {}},
	formLabelWidth: {type: [Number, String], default: '80px'},
	formColumnCount: {type: Number, default: 1},

	url: String,
	reqData: {type: Object, default: () => ({})},
	reqParams: {type: Object, default: () => ({})},
	headers: {type: Object, default: () => ({})},
	defaultTableData: {type: Object, default: () => []},
	buttons: {type: Array, default: () => []},

	autoHeight: {type: Boolean, default: false},
	height: {type: [Number, String], default: 0},
	disabled: {type: Boolean, default: false},
	scrollbarAlways: {type: Boolean, default: false},
	dialogFullScreen: {type: Boolean, default: false},

	enableRequestParamsLoad: {type: Boolean, default: true}, // 参数修改时发起请求
	enableToolbar: {type: Boolean, default: true},
	enableDelete: {type: Boolean, default: true},
	enableCreate: {type: Boolean, default: true},
	enableEdit: {type: Boolean, default: true},
	enableSelection: {type: Boolean, default: false},
	enableIndex: {type: Boolean, default: true},
	enableRowEdit: {type: Boolean, default: false}, // 启用行内编辑
	enableLatestData: {type: Boolean, default: true}, // 组件内编辑启用获取最新数据

	createHideColunms: {type: Array, default: () => []},
	updateHideColunms: {type: Array, default: () => []},

	createText: {type: String, default: '新增'},
	editText: {type: String, default: '编辑'},
	deleteText: {type: String, default: '删除'},

	pagination: {type: Object, default: () => ({total: 0, size: 10, page: 1})},
	stripe: {type: Boolean, default: true},
})

const initializing = ref(false)
const tableComponentRef = ref()
const total = ref(0)
const tableData = ref([])
const tableColumns = ref([])
const customSlots = ref([])

const formRef = ref()
const dialogTitle = ref('')
const dialogVisible = ref(false)
const defaultData = ref(null)

const currentCell = ref(null)
const currentEditRow = ref(null)
const currentEditRows = ref([])
const currentEditColumns = ref([])
const currentEidtEls = ref(null)

const disableTable = ref(props.disabled)
const disabledLastTdAlign = ref(props?.disabled ? 'flex-start' : 'center')
const showStripe = ref(props.stripe ? 'var(--z-table-even-bg)' : 'transparent')

const loading = ref(false)

const __height = ref(0)
const __fnWidth = ref(142)
let __requestTimer = null
let isCreate = false

watch(
	() => [props.url, props.reqParams, props.reqData],
	(newVal) => {
		if (!props.enableRequestParamsLoad) return
		if (__requestTimer) {
			clearTimeout(__requestTimer)
		}
		__requestTimer = setTimeout(() => getList(), 16.7)
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
			console.log('BasicTable Component columns not changed')
			return
		}

		console.log('BasicTable Component columns changed')
		const arr = []
		const loops = (cols) => {
			for (const col of cols) {
				if (col.children) {
					loops(col.children)
				} else {
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

const getList = () => {
	if (!props.url && props.autoLoad) {
		console.log('Error: BasicTabel Component url is required')
		setFnWidth() // 没接口或者不自动加载时也需要默认重新计算操作列宽度
		return
	}
	let isEvent = false
	let timer = null
	axios
		.request({
			url: props.url,
			method: 'GET',
			params: props.reqParams,
			headers: props.headers,
		})
		.then((res) => {
			const items = res.data.items || res.data
			const totalCount = res.data.totalCount || items.length
			const _next = (calldata) => {
				tableData.value = calldata ?? items
				total.value = totalCount
				emits('completed', 'get')
				nextTick(() => setFnWidth(true))
			}

			emits('beforeComplete', {
				items,
				next: (calldata) => {
					clearTimeout(timer)
					// 如果有数据修改父组件需要调用 next(data),并把data传递进来
					console.log('BasicTable beforeComplete Next')
					isEvent = true
					_next(calldata)
				},
			})

			timer = setTimeout(() => {
				if (!isEvent) {
					console.log('BasicTable beforeComplete')
					_next()
				}
			}, 256)
		})
		.catch((err) => {})
		.finally(() => {
			setTimeout(() => {
				if (!isEvent) {
					__requestTimer = null
					emits('completed', 'get')
				}
			}, 256)
		})
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
		.catch((err) => {})
		.finally(() => {
			emits('completed', 'post')
		})
}

const onUpdate = (data, isBatch = false) => {
	if (!props.url && props.autoLoad) {
		console.log('Error: BasicTabel Component url is required')
		return
	}
	emits('beforeUpdate', data)

	if (isBatch) {
		return axios.request({
			url: `${props.url}/${data.id}?time=${new Date().getTime()}`,
			method: 'PUT',
			data,
			headers: props.headers,
		})
	}

	axios
		.request({
			url: `${props.url}/${data.id}?time=${new Date().getTime()}`,
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
				defaultData.value = null
				dialogVisible.value = false
				getList()
			}
		})
		.catch((err) => {})
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
		.catch((err) => {})
		.finally(() => {
			emits('completed', 'delete')
		})
}

const onClear = () => nextTick(() => (tableData.value = []))

const onFormBeforeSubmit = (form) => {
	emits('formBeforeSubmit', form)
}

const onFormSubmit = (form) => {
	if (defaultData.value) {
		onUpdate({...defaultData.value, ...form})
	} else {
		onCreate(form)
	}
}

const onDialog = async (type, scope) => {
	console.log('Basic Table Component onDialog', type, scope)
	isCreate = type === 'create'
	const str = isCreate ? props.createText : props.editText

	dialogTitle.value = str
	dialogVisible.value = true

	setTimeout(() => {
		if (isCreate) {
			formRef.value?.clear()
			defaultData.value = null
		} else if (props.enableLatestData) {
			axios
				.request({
					url: `${props.url}/${scope.row.id}`,
				})
				.then((res) => {
					emits('formBeforeEdit', res.data, toRaw(scope.row))
					defaultData.value = res.data
				})
		} else {
			defaultData.value = toRaw(scope.row)
		}
	}, 0)
}

const onDialogOpen = () => {
	emits('dialogOpen', defaultData.value)
}

const onDialogClose = () => {
	emits('dialogClose')
}

const onDialogClosed = () => {
	defaultData.value = null
	emits('dialogClosed')
}

const onDialogOpened = () => {
	emits('dialogOpened', defaultData.value)
}

const onClickButton = (btn, row, index) => {
	emits('clickButton', {row, btn, index})
}

const onDoubleClickRow = (row, column, cell) => {
	console.log('BasicTable Component Double Click Row', row)
	if (props.enableRowEdit) {
		row.__enableEdit = true
		currentEditRow.value = row
		currentCell.value = cell
		setGroupWidth()
	}
}

const onFormChanged = (val, item) => {
	emits('formChanged', {value: val, item, tableFormRef: formRef.value})
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
	if (
		!currentEditColumns.value.some(
			(si) => item.rid === currentEditRow.value.id && item.prop === si.prop
		)
	) {
		currentEditColumns.value.push({rid: currentEditRow.value.id, prop: item.prop})
	}

	nextTick(() => {
		currentEidtEls.value = document.querySelectorAll('.table-component .has-changed')
		currentEidtEls.value.forEach((el) => {
			const td = el.closest('td')
			if (td) {
				td.classList.add('has-changed')
			}
		})
	})

	console.log(
		'Table Component Edit Rows:',
		val,
		item,
		currentEditRows.value,
		currentEditColumns.value
	)
}

const onTableRowEditSaveAll = () => {
	if (currentEditRows.value.length === 0) {
		return
	}

	const temp = []
	currentEditRows.value.forEach((item) => temp.push(onUpdate(item, true)))

	const res = Promise.all(temp)
	res.then(() => {
		ElMessage.success('全部更新成功')
		currentEditRow.value = null
		currentEditRows.value = []
		currentEidtEls.value.forEach((el) => {
			const td = el.closest('td')
			if (td) {
				td.classList.remove('has-changed')
			}
		})
		currentEditColumns.value = []
		getList()
	})
}

const onTableRowEditCancel = () => {
	currentEditRow.value = null
	currentEditRows.value = []
	currentEidtEls.value?.forEach((el) => {
		const td = el.closest('td')
		if (td) {
			td.classList.remove('has-changed')
		}
	})
	currentEditColumns.value = []
	tableData.value = tableData.value.map((item) => {
		delete item.__enableEdit
		return item
	})
	setGroupWidth(true)
	getList()
}

const setGroupWidth = (isReset = false) => {
	nextTick(() => {
		const loops = (arr) =>
			arr.forEach((item) => {
				if (item.children) {
					loops(item.children)
				} else {
					item.width = isReset ? undefined : 200
				}
			})

		loops(tableColumns.value)

		if (isReset) {
			currentCell.value = null
		}
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

const setFnWidth = (again = false) => {
	const el = tableComponentRef.value?.$el
	let width = 0

	if (el) {
		let btns = el.querySelector('.table-component-btns')?.children

		if (again) {
			el.querySelectorAll('.el-table__body tbody tr').forEach((tr) => {
				const buttons = tr.querySelector('td:last-child .cell')?.children
				if (buttons?.length > btns?.length) {
					btns = buttons
				} else {
					const totalWidth = (arr) => Array.from(arr || []).reduce((a, b) => a + b.offsetWidth, 0)
					if (totalWidth(buttons) > totalWidth(btns)) {
						btns = buttons
					}
				}
			})
		}

		if (btns) {
			width += btns.length * 12 + 20
			for (const btn of btns) {
				width += btn.offsetWidth
			}
		}

		if (btns?.length === 0) {
			width = 142
			setTimeout(() => setFnWidth(true), 1)
		}
	}

	if (!again) {
		if (props.enableEdit) {
			width += 70
		}

		if (props.enableDelete) {
			width += 70
		}
	}
	__fnWidth.value = width
}

const setEval = (str, row) => eval(str)

const getFormItemByProp = (prop, arr = tableColumns.value) => {
	for (const item of arr) {
		if (item.prop === prop) {
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
	initializing.value = true
	nextTick(() => {
		console.log('BasicTable Component mounted')
		setTableHeight()
		// setFnWidth()

		if (props.defaultTableData.length > 0) {
			tableData.value = props.defaultTableData
		}

		if (props.autoLoad) {
			getList()
		}

		window.addEventListener('resize', setTableHeight)
		initializing.value = false
	})
}

onMounted(() => init())

onActivated(() => init())

onDeactivated(() => {
	initializing.value = false
})

onUnmounted(() => {
	console.log('BasicTable Component unmounted')
	window.removeEventListener('resize', setTableHeight)
})

defineExpose({
	clear: () => onClear(),
	disabled: (bool = true) => {
		nextTick(() => {
			disableTable.value = bool
		})
	},
	reload: () => getList(),
	isCreate: () => isCreate,
	create: (data) => onCreate(data),
	update: (data) => onUpdate(data),
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
	getUpdateRow: () => tableData.value.find((item) => item.id === defaultData.value?.id),
	getTableData: () => tableData.value,
	getFormData: () => formRef.value?.getData(),
	getFormValue: (key) => formRef.value?.getValue(key),
	getSelectionRows: () => tableComponentRef.value?.getSelectionRows(),
	clearSelection: () => tableElRef.value?.clearSelection(),

	setRowEditData: (val, data, formItem) => {
		// 外部自定义插槽编辑行的时候设置当前编辑行数据
		if (data.__enableEdit && props.enableRowEdit) {
			currentEditRow.value = data
			// 从tableData中找到当前编辑行
			onTableFormRowEditChange(val, formItem)
		}
	},
	setFormValue: (key, value) => formRef.value?.setValue(key, value),
	setFormAttr: (key, attr, value) => formRef.value?.setAttr(key, attr, value),

	visibleFormDialog: (bool, data = null) => {
		dialogVisible.value = bool
		defaultData.value = data
	},
})
</script>
<template>
	<div class="table-component">
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
						<el-button type="primary" size="small">
							<i class="icon i-ic-baseline-save-all"></i>
							批量保存
						</el-button>
					</template>
				</el-popconfirm>
				<el-button
					v-if="currentEditRow"
					size="small"
					v-escape="onTableRowEditCancel"
					@click="onTableRowEditCancel"
				>
					<i class="icon i-ic-outline-cancel"></i>
					取消
				</el-button>

				<el-button v-if="enableCreate" type="primary" size="small" @click="onDialog('create')">
					<i class="icon i-ic-baseline-library-add"></i>
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
			v-loading="loading"
			:row-key="rowKey"
			:height="autoHeight ? (tableData.length === 0 ? 250 : 'auto') : __height"
			:data="tableData"
			:empty-text="emptyText"
			:scrollbar-always-on="scrollbarAlways"
			border
			stripe
			@row-dblclick="onDoubleClickRow"
		>
			<el-table-column
				v-if="enableSelection && !disableTable"
				:reserve-selection="true"
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
				label="序号"
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
					<template v-for="slot of customSlots" #[slot]="scope">
						<slot :name="slot" v-bind="scope" :form-item="getFormItemByProp(slot)">
							<template v-if="scope.row.__enableEdit && enableRowEdit">
								<FormItem
									:items="[getFormItemByProp(slot)]"
									:form="scope.row"
									:is-row-edit="true"
									:class="{
										'has-changed': currentEditColumns.some(
											(item) => item.rid === scope.row.id && item.prop === slot
										),
									}"
									@change="onTableFormRowEditChange"
									size="small"
								></FormItem>
							</template>
							<template v-else>
								{{ scope.row[slot] || '-' }}
							</template>
						</slot>
					</template>
				</TableColumn>
			</template>

			<!-- 操作列 -->
			<el-table-column
				v-if="
					((enableEdit || enableDelete || buttons.length > 0) && !disableTable) ||
					buttons.some((f) => f.important)
				"
				label="操作"
				align="center"
				fixed="right"
				:width="__fnWidth"
				class="table-component-btns"
			>
				<template #="{row, column, $index}">
					<slot name="buttons" :row="row"></slot>
					<template v-for="btn of buttons.filter((f) => (disableTable ? f.important : f))">
						<template v-if="btn.hasOwnProperty('show') ? setEval(btn.show, row) : true">
							<el-button
								v-if="!btn.popconfirm"
								:type="btn.type"
								:disabled="btn.hasOwnProperty('disabled') ? setEval(btn.disabled, row) : false"
								size="small"
								@click="onClickButton(btn, row, $index)"
							>
								<i v-if="btn.icon" :class="['icon', btn.icon]"></i>
								{{ btn.label }}
							</el-button>

							<el-popconfirm
								v-else-if="btn.popconfirm"
								:title="btn.popconfirm"
								confirm-button-text="确定"
								cancel-button-text="取消"
								@confirm="onClickButton(btn, row, $index)"
							>
								<template #reference>
									<el-button
										:type="btn.type"
										:disabled="btn.hasOwnProperty('disabled') ? setEval(btn.disabled, row) : false"
										size="small"
									>
										<i v-if="btn.icon" :class="['icon', btn.icon]"></i>
										{{ btn.label }}
									</el-button>
								</template>
							</el-popconfirm>
						</template>
					</template>

					<el-button
						v-if="enableEdit && !disableTable"
						type="primary"
						size="small"
						@click="onDialog('edit', {row, column, $index})"
					>
						<i class="icon i-ic-baseline-edit-note"></i>
						{{ props.editText }}
					</el-button>

					<el-popconfirm
						v-if="enableDelete && !disableTable"
						title="确认删除?"
						confirm-button-text="确定"
						cancel-button-text="取消"
						@confirm="onDelete({row: toRaw(row), column, $index})"
					>
						<template #reference>
							<el-button size="small" type="danger">
								<i class="icon i-ic-baseline-delete-forever"></i>
								{{ props.deleteText }}
							</el-button>
						</template>
					</el-popconfirm>
				</template>
			</el-table-column>

			<template #empty>
				<slot name="empty">
					<el-empty :image-size="autoHeight ? 100 : 200" description="暂无数据" />
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
			<slot name="dialogForm" :row="defaultData">
				<Form
					ref="formRef"
					button-align="flex-end"
					:rules="formRules"
					:loading="!global?.getLoadEnd"
					:data="
						tableColumns.filter((col) =>
							dialogTitle === props.editText
								? !updateHideColunms.includes(col.prop)
								: !createHideColunms.includes(col.prop)
						)
					"
					:default-data="defaultData"
					:label-width="formLabelWidth"
					:column-count="formColumnCount"
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
			justify-content: v-bind(disabledLastTdAlign);
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

	:deep(.form-item) > * {
		width: 100% !important;
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
