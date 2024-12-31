<script setup>
import {ref, watch, computed, onMounted, nextTick} from 'vue'
import axios from 'axios'
import {ElMessage} from 'element-plus'

const emits = defineEmits([
	'change',
	'changeFile',
	'initRemoteComplete',
	'update:modelValue',
	'focus',
	'blur',
	'enter',
])
const props = defineProps({
	modelValue: {type: [String, Number, Array, Boolean], default: () => ''}, // 单独使用FormItem组件时, 传入的modelValue
	items: {type: Object, default: () => []}, // 表单项配置
	form: {type: Object, default: () => ({})}, // 表单对象, 用于双向绑定 form 组件表单数据
	formData: {type: Object, default: () => ({})}, // 表单项数据, 接口数据, 用于 TableV2 组件新增/编辑表单, 不是行内编辑
	formItems: {type: Array, default: () => []},
	size: {type: String, default: 'default'},
	grid: {type: Boolean, default: false},
	columnCount: {type: [Number, String], default: 1},

	isRowEdit: {type: Boolean, default: false},
	autoRemote: {type: Boolean, default: true},
	doNotInitRemote: {type: Array, default: () => []},

	expand: {type: Boolean, default: true}, // 默认展开折叠

	isClear: {type: Boolean, default: false},
	class: {type: String, default: ''},

	_fromForm: {type: Boolean, default: false},
	_fromTable: {type: Boolean, default: false},
	_formLabelWidth: {type: [String, Number], default: '100px'},
	_expandArray: {type: Array, default: () => []},
	_expandIndex: {type: Number, default: 0},
	_hasChanged: {type: Boolean, default: false},
	_inGrid: {type: Boolean, default: false},
})

const _form = ref(props.form)
const formItemRef = ref()
const activeNames = ref(props._expandArray)
const activeIndex = ref(props._expandIndex)
const currentActiveNames = ref([])

const loading = ref(false)
const count = ref(props.columnCount)
const flexSize = computed(() => (props.columnCount > 1 ? '10px' : '0px'))
const pb = computed(() => (props.columnCount > 1 ? '0px' : '20px'))
const uploadFileNames = ref([])

let remoteTimer = null

const remoteCompleted = (query, item, res, callback) => {
	const data = res.data.items || res.data
	if (Array.isArray(data)) {
		item.options = data.map((m) => {
			return {
				label: m[item.remoteLabel || 'name'],
				value: m[item.remoteValue || 'id'],
				raw: m,
			}
		})
	} else {
		item.options = [
			{
				label: data[item.remoteLabel || 'name'],
				value: data[item.remoteValue || 'id'],
				raw: data,
			},
		]
	}
	typeof callback === 'function' && callback(query, item)
}

const initRemoteValueById = (query, item) => {
	if (!item.remoteUrl || props.doNotInitRemote.indexOf(item.prop) > -1) return

	console.log('Form Item Init Remote: ', query, item)
	const [baseUrl, params] = item.remoteUrl.split('?')
	const remoteParams = {
		...item.remoteParams,
		...Object.fromEntries(new URLSearchParams(params)),
	}

	item.beforeInitRemote && item.beforeInitRemote(query, remoteParams, item)

	axios
		.request({
			url: item.useBaseUrl ? item.remoteUrl : `${baseUrl}/${query}`,
			method: 'get',
			params: remoteParams,
		})
		.then((res) => {
			remoteCompleted(query, item, res, () => {
				emits('initRemoteComplete', query, item)
			})
		})
}

const remoteMethod = (query, item, callback) => {
	const params = {
		...item.remoteParams,
	}
	params[item.remoteFilterKey || item.remoteLabel || 'name'] = query

	const isInit =
		item.hasOwnProperty('remoteInit') && typeof item.remoteInit === 'boolean'
			? item.remoteInit
			: null

	if (query || isInit) {
		loading.value = true
		let isContinue = true

		if (item.beforeRemote) {
			isContinue = item.beforeRemote(query, params, item)
		}

		if (!isContinue) {
			loading.value = false
			return
		}

		clearTimeout(remoteTimer)

		remoteTimer = setTimeout(() => {
			axios
				.request({
					url: item.remoteUrl,
					method: item.remoteMethod || 'get',
					params,
					headers: item.headers || {},
				})
				.then((res) => {
					loading.value = false
					remoteCompleted(query, item, res, callback)
				})
				.finally(() => {
					loading.value = false
				})
		}, 200)
	}
}

const onChange = (val, item) => {
	emits('update:modelValue', val)
	emits('change', val, item)
}

const onFocus = () => {
	emits('focus')
}

const onBlur = (item) => {
	console.log('Form Item Blur: ', item, props.isRowEdit, props._fromForm)

	if (item.formItemProps && item.formItemProps.rules) {
		// 单独使用FormItem组件时的校验
		const valid = customSignleFormItemValidator(item)
		emits('blur', valid)
	} else {
		emits('blur')
	}
}

const customSignleFormItemValidator = (item) => {
	let curvalid = true

	const idx = props.items.findIndex((f) => f.prop === item.prop)
	const fir = formItemRef.value[idx]

	item.formItemProps.rules.forEach((rule) => {
		if (rule.validator && typeof rule.validator === 'function') {
			rule.validator(rule, props.modelValue || _form.value[item.prop], (error) => {
				if (error) {
					fir.validateState = 'error'
					if (item.type === 'radio') {
						fir.validateMessage = '请任选一项'
					} else if (item.type === 'checkbox') {
						fir.validateMessage = '请至少选一项'
					} else if (item.type === 'select') {
						fir.validateMessage = '从下列选项中选择'
					} else {
						fir.validateMessage = error.message || '验证失败'
					}
				} else {
					fir.validateState = ''
					fir.validateMessage = ''
				}
			})
		}
	})

	return curvalid
}

const toBufferString = (buffer) => {
	let binary = ''
	let bytes = new Uint8Array(buffer)
	let length = bytes.byteLength
	for (let i = 0; i < length; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return binary
}

const toArrayBuffer = (buffer) => {
	let ab = new ArrayBuffer(buffer.length)
	let view = new Uint8Array(ab)
	for (let i = 0; i < buffer.length; ++i) {
		view[i] = buffer[i]
	}
	return ab
}

const onFileChange = (e, item) => {
	let files = e.target.files || e.dataTransfer.files
	if (!files.length) return

	let file = files[0]
	let maxSize = 1024 * 1024 * (item.size || 2)

	if (file.size > maxSize) {
		ElMessage.error(`文件大小不能超过${item.size || 2}M`)
		return
	}

	let reader = new FileReader()
	reader.onload = (re) => {
		// 转 ArrayBuffer 二进制
		// let arrayBuffer = reader.result
		// props._form[item.prop] = toBufferString(arrayBuffer)

		//  转 base64
		let base64String = re.target.result
		props._form[item.prop] = base64String.replace('data:application/pdf;base64,', '')

		// 下载
		// let a = document.createElement('a')
		// let blob = new Blob([arrayBuffer])
		// a.href = URL.createObjectURL(blob)
		// a.download = file.name
		// a.click()
	}

	uploadFileNames.value = [file.name]
	// reader.readAsArrayBuffer(file) // 转 ArrayBuffer 二进制
	reader.readAsDataURL(file) //  转 base64

	emits('changeFile', file, item)
}

const onCollapseChange = (val, index) => {
	console.log('Collapse Change: ', val)
}

const onCheckIsLastItem = (item, index) => {
	const len = props.items.filter((f) => !f.hasOwnProperty('children')).length
	return (
		((Math.floor((len - 1) / props.columnCount) * props.columnCount <= index && !item.full) ||
			index === len - 1) &&
		!props._inGrid
	)
}

const getFormLabel = (item) => {
	let label = ''
	if (item.hasOwnProperty('label')) {
		label =
			(!props.isRowEdit && parseInt(props._formLabelWidth) > 0) ||
			(parseInt(props._formLabelWidth) === 0 && item.hasOwnProperty('labelWidth')) ||
			(!item.hasOwnProperty('labelWidth') && parseInt(props._formLabelWidth) !== 0)
				? item?.label
				: ''
	}
	return label
}

watch(
	() => props.items,
	(newVal) => {
		if (props.expand) {
			const temp = []
			const loops = (arr, idx = 0) => {
				arr.forEach((item) => {
					if (item.children && item.children.length > 0) {
						!temp[idx] ? (temp[idx] = [item.prop]) : temp[idx].push(item.prop)
						loops(item.children, idx + 1)
					}
				})
			}
			newVal && loops(newVal)
			activeNames.value = temp
		}
	},
	{deep: true}
)

watch(
	() => props._expandArray,
	(val) => {
		activeNames.value = val
	},
	{
		deep: true,
	}
)

watch(
	() => props._expandIndex,
	(val) => {
		setTimeout(() => {
			activeIndex.value = val
			currentActiveNames.value = activeNames.value[val]
		}, 16.7)
	},
	{immediate: true}
)

watch(
	() => props.formData,
	(newVal) => {
		if (newVal && props.autoRemote) {
			const selectRemoteItems = props.items.filter((item) => item.type === 'selectRemote')
			selectRemoteItems.forEach((item) => {
				const value = newVal[item.prop]
				if (value) {
					initRemoteValueById(value, item)
				}
			})
		}
	},
	{deep: true}
)

watch(
	() => props.modelValue,
	(val) => {
		// 针对单独使用FormItem组件时, 传入的modelValue, 并且items只有一个时
		// console.log('Form Item modelValue Change: ', props.items, val, _form.value)
		let newVal = val
		// 表单内部不启用双向绑定 _fromForm: true
		if (props.items.length === 1 && !props._fromForm) {
			if (props.items[0].remoteInit && props.items[0].remoteUrl && newVal) {
				remoteMethod(newVal, props.items[0], () => {
					Object.assign(_form.value, {[props.items[0].prop]: newVal})
					// console.log('Form Item modelValue Remote Init Complete: ', _form.value, newVal)
				})
			} else {
				if (
					props.items[0].type === 'checkbox' &&
					typeof newVal === 'string' &&
					!newVal.length
				) {
					newVal = []
				} else if (
					props.items[0].type === 'text' &&
					props.items[0].inputType === 'number'
				) {
					newVal = Number(newVal)
				}
				Object.assign(_form.value, {[props.items[0].prop]: newVal})
			}
		}
	},
	{deep: true, immediate: true}
)

watch(
	() => props.form,
	(val) => {
		_form.value = val
		emits('update:modelValue', _form.value)
	},
	{deep: true}
)

onMounted(() => {})

defineExpose({
	initRemote: (query, item) => initRemoteValueById(query, item),
})
</script>
<template>
	<template v-for="(item, index) of items">
		<el-collapse
			v-if="item.children"
			v-model="currentActiveNames"
			class="group"
			@change="onCollapseChange(item.prop, index)"
		>
			<el-collapse-item :name="item.prop">
				<template #title>
					<div class="group-title">
						<Icons
							icon-name="ArrowRight2"
							color="var(--z-font-color)"
							size="15px"
							class="mg-right-5"
						></Icons>
						{{ item?.label }}
					</div>
				</template>
				<div class="form-items">
					<FormItem
						:items="item.children"
						:form="_form"
						:formItems="formItems"
						:formData="formData"
						:size="size"
						:grid="grid"
						:columnCount="count"
						:isRowEdit="isRowEdit"
						:autoRemote="autoRemote"
						:doNotInitRemote="doNotInitRemote"
						:expand="expand"
						:isClear="isClear"
						:class="class"
						:_expandArray="activeNames"
						:_expandIndex="activeIndex + 1"
						:_formLabelWidth="_formLabelWidth"
						:_inGrid="true"
						:_fromForm="_fromForm"
						:_fromTable="_fromTable"
						@init-remote-complete="onInitRemoteComplete"
						@change="onChange"
						@changeFile="onFileChange"
					>
						<template v-for="child of formItems" #[`form-${child.prop}`]="scope">
							<slot
								:name="`form-${child.prop}`"
								v-bind="scope"
								:form="form"
								:row="formData"
							></slot>
							<slot
								:name="`form-${child.prop}-error`"
								v-bind="scope"
								:form="form"
								:row="formData"
							></slot>
						</template>
					</FormItem>
				</div>
			</el-collapse-item>
		</el-collapse>

		<template v-else>
			<el-form-item
				ref="formItemRef"
				:label="getFormLabel(item)"
				:prop="item.prop"
				:inline-message="_fromTable"
				:label-width="
					item.hasOwnProperty('label') ? item.labelWidth || parseInt(_formLabelWidth) : 0
				"
				v-bind="{...$attrs, ...item.formItemProps}"
				:class="{
					full: item.full,
					'is-grid': grid,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
					'no-label': item.labelWidth === 0 || item.labelWidth === '0px',
					'space-between':
						typeof item.spaceBetween === 'boolean' ? item.spaceBetween : false,
					'has-changed': props._hasChanged,
				}"
			>
				<!-- 无type时(插槽) -->
				<div class="form-item" v-if="!item.type">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">{{ _form[item.prop] || '-' }}</template>
						<template v-else>
							-
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 文本框 -->
				<div class="form-item" v-if="item.type === 'text'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-if="!item.inputType"
								v-model.trim="_form[item.prop]"
								v-bind="item.attrs"
								type="text"
								:readonly="item.attrs?.readonly || item.readonly"
								:disabled="item.attrs?.disabled || item.disabled"
								:placeholder="item.placeholder || `请输入${item?.label}`"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								clearable
								@input="emits('update:modelValue', $event)"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
							/>
							<el-input-number
								v-else-if="item.inputType === 'number'"
								v-model.number="_form[item.prop]"
								v-bind="item.attrs"
								type="number"
								:min="item.min || 0"
								:max="item.max || 100000000"
								:readonly="item.attrs?.readonly || item.readonly"
								:disabled="item.attrs?.disabled || item.disabled"
								:placeholder="item.placeholder || `请输入${item?.label}`"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								:style="{width: columnCount > 1 ? '100%' : '100%'}"
								clearable
								@input="emits('update:modelValue', $event)"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 密码框 -->
				<div class="form-item" v-if="item.type === 'password'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-model.trim="_form[item.prop]"
								v-bind="item.attrs"
								type="password"
								:readonly="item.attrs?.readonly || item.readonly"
								:disabled="item.attrs?.disabled || item.disabled"
								:placeholder="item.placeholder || `请输入${item?.label}`"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								clearable
								@input="emits('update:modelValue', $event)"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 下拉框 -->
				<div class="form-item" v-if="item.type === 'select'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-select
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								:disabled="item.attrs?.disabled || item.disabled"
								:placeholder="item.placeholder || `请选择${item?.label}`"
								:filterable="item.attrs?.filterable || item.filterable"
								:multiple="item.attrs?.multiple || item.multiple"
								:multiple-limit="
									item.attrs?.multipleLimit || item.multipleLimit
										? item.attrs?.multipleLimit || item.multipleLimit
										: 0
								"
								:collapse-tags="item.attrs?.collapseTags || item.collapseTags"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								clearable
								style="flex: 1"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
								@keyup.enter="emits('enter')"
							>
								<el-option
									v-for="option of item.options"
									:label="option.otherLabel || option.label"
									:value="option.value"
								/>
							</el-select>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 下拉远程搜索 -->
				<div class="form-item" v-if="item.type === 'selectRemote'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{
								item?.options?.find((f) => f.value === _form[item.prop])?.label ||
								'-'
							}}
						</template>
						<template class="form-item" v-else>
							<el-select
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								reserve-keyword
								filterable
								clearable
								remote
								:placeholder="item.placeholder || `请输入关键字搜索${item?.label}`"
								:remote-method="(query) => remoteMethod(query, item)"
								:disabled="item.attrs?.disabled || item.disabled"
								:loading="loading"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								style="flex: 1"
							>
								<el-option
									v-for="option of item?.options"
									:label="option.otherLabel || option.label"
									:value="option.value"
								/>
							</el-select>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 日期/时间选择器 -->
				<div
					class="form-item"
					v-if="
						[
							'date',
							'year',
							'month',
							'week',
							'dates',
							'datetime',
							'daterange',
							'monthrange',
							'datetimerange',
						].includes(item.type)
					"
				>
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-date-picker
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								:readonly="item.attrs?.readonly || item.readonly"
								:disabled="item.attrs?.disabled || item.disabled"
								:disabled-date="item.attrs?.disabledDate || item.disabledDate"
								:type="item.type"
								:placeholder="item.placeholder || `请选择${item?.label}`"
								:value-format="
									item.type === 'datetime' || item.type === 'datetimerange'
										? 'YYYY-MM-DD HH:mm:ss'
										: 'YYYY-MM-DD'
								"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								:style="{width: item.full ? '100%' : '100%'}"
								range-separator="到"
								start-placeholder="开始时间"
								end-placeholder="结束时间"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
								@keydown.enter="emits('enter')"
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 多选 -->
				<div class="form-item" v-if="item.type === 'checkbox'" @click.stop>
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-checkbox-group
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								@change="onChange($event, item), nextTick(() => onBlur(item))"
							>
								<el-checkbox
									v-for="option of item.options"
									:value="option.value"
									:name="option.name"
									:disabled="option.disabled || item.disabled"
									:size="size"
									:validate-event="
										_fromForm || !item.hasOwnProperty('formItemProps')
									"
									@click.stop
								>
									{{ option.label }}
								</el-checkbox>
							</el-checkbox-group>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 单选 -->
				<div class="form-item" v-if="item.type === 'radio'" @click.stop>
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-radio-group
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								@change="onChange($event, item), nextTick(() => onBlur(item))"
							>
								<el-radio
									v-for="(option, index) of item.options"
									:value="option.value"
									:disabled="option.disabled || item.disabled"
									:size="size"
									:validate-event="
										_fromForm || !item.hasOwnProperty('formItemProps')
									"
									@click.stop
								>
									{{ option.label }}
								</el-radio>
							</el-radio-group>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 文本域 -->
				<div class="form-item" v-if="item.type === 'textarea'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-model.trim="_form[item.prop]"
								v-bind="item.attrs"
								type="textarea"
								resize="none"
								:rows="6"
								:readonly="item.attrs?.readonly || item.readonly"
								:disabled="item.attrs?.disabled || item.disabled"
								:placeholder="item.placeholder || `请输入${item?.label}`"
								:size="size"
								:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
								:maxlength="item.attrs?.maxlength || item.maxlength || 1000"
								@input="emits('update:modelValue', $event)"
								@change="onChange($event, item)"
								@focus.stop="onFocus"
								@blur.stop="onBlur(item)"
								@click.stop
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>

				<!-- 开关 -->
				<div class="form-item" v-if="item.type === 'switch'">
					<slot :name="`form-${item.prop}`" :item="item">
						<el-switch
							v-model="_form[item.prop]"
							v-bind="item.attrs"
							:disabled="item.attrs?.disabled || item.disabled"
							:active-text="item.activeText"
							:inactive-text="item.inactiveText"
							:size="size"
							:validate-event="_fromForm || !item.hasOwnProperty('formItemProps')"
							@change="onChange($event, item)"
							@click.stop
						/>
						<slot :name="`form-${item.prop}-right`"></slot>
					</slot>
				</div>

				<!-- 下拉联动 -->
				<div class="form-item" v-if="item.type === 'cascade'">
					<slot :name="`form-${item.prop}`" :item="item">
						<Cascade
							:grid="grid"
							:form-data="form"
							:isClear="isClear"
							:keys="item.cascadekeys"
							:maxLevel="item.cascadeMaxLevel"
							:options="item.cascadeItems"
							:static="item.cascadeStatic"
							:vertical="item.cascadeVertical"
							:oneSelect="item.cascadeOneSelect"
							:oneSelectProps="item.cascadeOneSelectProps"
							@change="onChange($event, item)"
						></Cascade>
						<slot :name="`form-${item.prop}-right`"></slot>
					</slot>
				</div>

				<!-- 下拉树 -->
				<div class="form-item" v-if="item.type === 'treeSelect'">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ _form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-tree-select
								v-model="_form[item.prop]"
								v-bind="item.attrs"
								:data="item.options"
								:render-after-expand="false"
								:multiple="item.multiple"
								:placeholder="item.placeholder || `请选择${item?.label}`"
								:filterable="item.filterable"
								:check-strictly="item.checkStrictly"
								@change="onChange($event, item)"
								style="width: 100%"
							/>
						</template>
					</slot>
				</div>

				<!-- 上传: 返回base64, 非流直接上传 -->
				<div class="form-item" v-if="item.type === 'upload'">
					<slot :name="`form-${item.prop}`" :item="item">
						<div class="form-upload">
							<el-button type="primary" size="small">
								<i class="icon i-ic-round-upload-file"></i>
								选择文件
							</el-button>
							<span class="filename">
								{{
									uploadFileNames.join(',') ||
									`只支持格式 ${item.accept} 文件, 且文件大小不超过${
										item.size || 2
									}M`
								}}
							</span>
							<input
								type="file"
								:accept="item.accept"
								:multiple="item.multiple"
								@change="onFileChange($event, item)"
							/>
						</div>
						<slot :name="`form-${item.prop}-right`"></slot>
					</slot>
				</div>

				<template #error="scoped">
					<slot :name="`form-${item.prop}-error`" :item="item"></slot>
				</template>
			</el-form-item>
		</template>
	</template>
</template>
<style scoped lang="scss">
.middle {
	width: calc(100% / v-bind(count) + 100% / v-bind(count) + 1px) !important;
}
.full {
	width: 100% !important;
}

:deep(.el-form-item__content),
:deep(.el-form-item__label) {
	color: var(--z-font-color);
}

.group {
	border-radius: torem(5px);
	border: 1px solid rgba(var(--z-line-rgb), 1);
	overflow: hidden;
	margin-bottom: torem(10px);
	width: 100%;

	.group-title {
		align-items: center;
		display: flex;
		font-size: torem(14px);
		font-weight: 500;
		height: torem(40px);
		line-height: torem(40px);
		padding-left: torem(10px);
		text-align: left;
		width: 100%;
		.icon {
			color: var(--z-font-color);
			scale: 0.8;
			position: relative;
			top: -1px;
			opacity: 1;
		}
	}

	:deep(.el-collapse-item__header) {
		border-bottom: 1px solid rgba(var(--z-line-rgb), 1);
		background-color: var(--z-bg-secondary);
		color: var(--z-font-color);
		height: torem(40px);
	}

	:deep(.el-collapse-item__content) {
		padding: torem(10px) torem(10px) torem(20px) torem(10px);
	}
}

.row-edit {
	margin-bottom: 0 !important;
	transform: translateX(torem(-5px));
}

.no-label {
	:deep(.el-form-item__label) {
		display: none;
	}
}

.space-between {
	align-items: center;
	display: flex;
	justify-content: space-between;
	:deep(.el-form-item__label) {
		// flex: 1;
	}
	:deep(.el-form-item__content) {
		flex: none;
	}
}

.form-item {
	align-items: center;
	color: var(--z-font-color);
	display: flex;
	flex-wrap: wrap;
	font-size: $default-font-size;
	overflow: hidden;
	// padding: 0 torem(5px);
	text-overflow: ellipsis;
	width: 100%;
}

.form-upload {
	align-items: center;
	display: flex;
	height: torem(30px);
	position: relative;
	overflow: hidden;
	.filename {
		font-size: torem(12px);
		margin-left: torem(10px);
	}
	input {
		cursor: pointer;
		font-size: torem(100px);
		left: 0;
		opacity: 0.01;
		position: absolute;
		top: 0;
		z-index: 1;
	}
}
.form-items {
	display: flex;
	flex-wrap: wrap;

	:deep(.el-form-item) {
		align-items: flex-start;
		margin-right: v-bind(flexSize);
		width: calc(100% / v-bind(columnCount) - v-bind(flexSize));
	}
}
</style>
