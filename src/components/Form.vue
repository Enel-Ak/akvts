<script setup>
import {computed, onMounted, ref, toRaw, watch, nextTick} from 'vue'
import axios from 'axios'
import Lock from './Lock.vue'

const emits = defineEmits([
	'beforeSubmit',
	'submit',
	'clear',
	'reset',
	'change',
	'focus',
	'blur',
	'initRemoteComplete',
	'update:modelValue',
])
const props = defineProps({
	modelValue: {type: Object, default: () => ({})}, // v-model
	autoRemote: {type: Boolean, default: true},
	loading: {type: Boolean, default: false},
	disable: {type: Boolean, default: false},
	data: {type: Array, default: () => []}, // 默认值可以从配置的value设置, 但是不支持重置
	props: {type: Object, default: () => []}, // 表单配置, 同data, 后续会废弃data
	defaultData: {type: Object, default: () => ({})}, // 用于重置表单
	rules: {type: Object, default: () => ({})},
	labelWidth: {type: [String, Number], default: '80px'},
	grid: {type: Boolean, default: false},

	confirmText: {type: String, default: '提交'},
	buttonAlign: {type: String, default: 'center'},
	buttonVertical: {type: String, default: 'bottom'}, // top bottom flowing

	enableButton: {type: Boolean, default: true},
	enableReset: {type: Boolean, default: true},
	enableClear: {type: Boolean, default: true},
	enableEnterPush: {type: Boolean, default: true},

	columnCount: {type: [Number, String], default: 1},
	size: {type: String, default: 'default'},
	notClearKeys: {type: Array, default: () => []},
	notInitRemoteKeys: {type: Array, default: () => []},
})

watch(
	() => props.modelValue,
	(to) => Object.assign(form.value, {...stringToTimeRange(to)}),
	{deep: true}
)

watch(
	() => props.defaultData,
	(to) => {
		if (to) {
			console.log('Form Default Data Change', stringToTimeRange(to))
			// form.value = {...stringToTimeRange(to)}
			Object.assign(form.value, {...stringToTimeRange(to)})
			// emits('update:modelValue', form.value)
		}
	},
	{deep: true}
)

watch(
	() => props.data,
	(newVal) => {
		if (JSON.stringify(newVal) !== JSON.stringify(formProps.value)) {
			formProps.value = newVal
			updateColunms()
		}
	},
	{deep: true}
)

watch(
	() => props.props,
	(newVal) => {
		if (JSON.stringify(newVal) !== JSON.stringify(formProps.value)) {
			formProps.value = newVal
			updateColunms()
		}
	},
	{deep: true}
)

watch(
	() => props.grid,
	(newVal) => {
		for (const key in props.rules) {
			if (props.rules[key].length > 0) {
				props.rules[key].forEach((m) => {
					m.required = !newVal
				})
			}
		}
		setTimeout(() => {
			if (!newVal) {
				formRef.value.clearValidate()
			}
		}, 1)
	},
	{deep: true}
)

const isLoading = computed(() => props.loading)
const isFocus = ref(false)
const formRef = ref()
const formItemRef = ref()
const form = ref(props.modelValue)
const formProps = ref(props.props)
const formItems = ref([])
const flexSize = computed(() => (props.columnCount > 1 ? '10px' : '0px'))
const formItemsPadding = computed(() => {
	let val
	if (props.grid) {
		val = props.columnCount >= 1 ? '0' : '20px'
	} else {
		val = props.columnCount > 1 ? '0' : '20px'
	}
	return val
})
const formDisabled = ref(props.disabled)
const isClear = ref(false)
const unLock = ref(0)

const timeRangeToString = (output) => {
	// 时间范围转换字符串
	const __output = toRaw(output)
	for (const key in __output) {
		if (Array.isArray(__output[key]) && __output[key].length === 2) {
			const [start, end] = __output[key]
			if (start && end) {
				const reg = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
				if (reg.test(start) && reg.test(end)) {
					__output[key] = [start, end].join(',')
				}
			}
		}
	}
	return __output
}

const stringToTimeRange = (input) => {
	// 时间范围转换数组
	const __input = toRaw(input)
	for (const key in __input) {
		if (typeof __input[key] === 'string' && __input[key].includes(',')) {
			const [start, end] = __input[key].split(',')
			const reg = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
			if (reg.test(start) && reg.test(end)) {
				__input[key] = [start, end]
			}
		}
	}
	return __input
}

const onSubmit = () => {
	emits('beforeSubmit', form.value)
	formRef.value.validate((valid) => {
		if (valid) {
			console.log('submit validate!', valid, toRaw(form.value))
			const formValue = JSON.parse(JSON.stringify(form.value))
			emits('submit', timeRangeToString(formValue))
		}
	})
}

const onEnterSubmit = () => {
	if (props.enableEnterPush && isFocus.value && !isLoading.value) {
		// 在 form change 之后执行
		setTimeout(() => {
			console.log('Form Enter Submit', isFocus.value)
			onSubmit()
		}, 16.7)
	}
}

const onResetFields = () => {
	onClear(false)
	// form.value = {...props.defaultData}
	Object.assign(form.value, {...props.defaultData})
	emits('reset')
}

const updateColunms = () => {
	const temp_arr = []
	const loops = (data) => {
		for (const item of data) {
			if (item.children) {
				loops(item.children)
			} else {
				temp_arr.push(item)
			}
		}
	}
	loops(formProps.value)
	formItems.value = temp_arr
	// form.value = {...stringToTimeRange(form.value)}
	Object.assign(form.value, {...stringToTimeRange(form.value)})
	console.log('Form Update Columns', form.value)
}

const setDefault = async () => {
	console.log('Form Set Default', props.props)

	// 兼容处理
	if (props.data.length > 0) {
		formProps.value = props.data
	}

	for (const item of formProps.value) {
		if (item.value) {
			form.value[item.prop] = item.value
		}
		if (item.dataUrl) {
			const res = await axios.get(item.dataUrl)
			let {items} = res.data
			if (item.dataCallBack) {
				items = item.dataCallBack(items)
			}
			item.options = items?.map((data) => ({
				label: data[item.dataKey],
				value: data[item.dataValue],
			}))
		}

		if (item.type === 'selectRemote') {
			if (item.value) {
				formItemRef.value.initRemote(item.value, item)
			}
		}

		if (item.type === 'cascade') {
			item.cascadeItems.forEach((m, index) => {
				if (m.value) {
					form.value[m.prop] = m.value
				}
			})
		}
	}
	updateColunms()
	emits('update:modelValue', form.value)
}

const onClear = (needEmit = true, clearAll = false) => {
	const notClearColumns = {}

	for (const key in form.value) {
		if (props.notClearKeys.includes(key)) {
			notClearColumns[key] = form.value[key]
		} else {
			switch (typeof form.value[key]) {
				case 'string':
					form.value[key] = ''
					break
				case 'number':
					form.value[key] = null
					break
				case 'boolean':
					form.value[key] = false
					break
				case 'object':
					if (Array.isArray(form.value[key])) {
						form.value[key] = []
					} else {
						form.value[key] = {}
					}
					break
				default:
					form.value[key] = null
			}
		}
	}

	formProps.value.forEach((item) => {
		if (item.type === 'selectRemote') {
			item.options = []
		}
	})

	// formRef.value.resetFields()
	if (needEmit) {
		// 返回不需要清空的字段作为 props.defaultData的默认值
		emits('clear', notClearColumns)
	}

	isClear.value = true

	if (!clearAll) {
		Object.assign(form.value, {...notClearColumns})
	}
	console.log('Form Not Clear', notClearColumns)
	console.log('Form Clear', form.value)
	emits('update:modelValue', form.value)
	nextTick(() => (isClear.value = false))
}

const onInitRemoteComplete = (query, item) => {
	console.log('Form Init Remote Complete', query, item)
	emits('initRemoteComplete', query, item)
}

const onFormChange = (val, item) => {
	console.log('Form Item Change', val, item)
	if (item.type === 'selectRemote' && item.setRemoteValueToColumn) {
		form.value[item.setRemoteValueToColumn] = val
	}

	if (item.type === 'cascade') {
		for (const [key, value] of Object.entries(val)) {
			if (key !== item.prop) {
				form.value[key] = value
			}
		}
	}

	emits('update:modelValue', form.value)
	emits('change', val, item)
}

const onFocus = (isFocusEnter = false) => {
	isFocus.value = true
	console.log('Form Focus', isFocus.value)
	if (isFocusEnter) {
		onEnterSubmit()
	}
	emits('focus')
}

const onBlur = () => {
	isFocus.value = false
	console.log('Form Blur', isFocus.value)
	emits('blur')
}

const getIconSize = () => {
	let size = 16
	if (props.size === 'large') {
		size = 20
	} else if (props.size === 'small') {
		size = 14
	}
	return size
}

onMounted(() => {
	console.log('Form Mounted')
	nextTick(() => setDefault())
})

defineExpose({
	clear: (clearAll = false) => onClear(true, clearAll),
	resetFields: () => onResetFields(),
	validate: (callback) => formRef.value.validate((valid) => callback(valid)),
	submit: () => onSubmit(),
	disabled: (bool = true) => {
		console.log('Form Disabled', bool)
		// important 无论是否有disabled属性都设置
		nextTick(() => {
			formItems.value.forEach((item) => {
				if (!item.alwaysDisabled) {
					item.disabled = bool
				}
			})
			formDisabled.value = bool
		})
	},
	getData: () => {
		console.log('Form Get Data', form.value)
		return form.value
	},
	getValue: (key) => form.value[key],
	setValue: (key, value) => {
		if (typeof key === 'object') {
			for (const k in key) {
				form.value[k] = key[k]
			}
		} else {
			form.value[key] = value
		}
		console.log('Form Set Value', key, value, form.value)
		emits('update:modelValue', form.value)
	},
	setAttr: (key, attr, val) => {
		// formItems的属性设置
		formItems.value.forEach((m) => {
			if (m.prop === key) {
				m[attr] = val
			}
		})
	},
})
</script>
<template>
	<div
		class="form-component"
		v-enter="onEnterSubmit"
		:class="{'form-grid': grid, 'form-component-flowing': buttonVertical === 'flowing'}"
	>
		<el-form
			ref="formRef"
			v-bind="$attrs"
			:model="form"
			:rules="rules"
			:label-width="labelWidth"
			:class="{'not-label': labelWidth === 0 || labelWidth === '0'}"
			:size="size"
		>
			<el-form-item
				class="btns top"
				v-if="buttonVertical === 'top' && enableButton && !formDisabled && !grid"
			>
				<el-button v-if="enableReset" @click="onResetFields" :size="size">
					<Icons icon-name="Reset" class="mg-right-5" :size="getIconSize()"></Icons>
					重置
				</el-button>
				<el-button v-if="enableClear" @click="onClear" :size="size">
					<Icons icon-name="Clear" class="mg-right-5" :size="getIconSize()"></Icons>
					清空
				</el-button>
				<slot name="buttons"></slot>
				<el-button :loading="isLoading" type="primary" @click="onSubmit" :size="size">
					<Icons
						v-if="!isLoading"
						icon-name="Send"
						color="#fff"
						class="mg-right-5"
						:size="getIconSize()"
					></Icons>
					{{ $props.confirmText }}
				</el-button>
			</el-form-item>

			<div class="form-items">
				<FormItem
					ref="formItemRef"
					:grid="grid"
					:size="size"
					:form="form"
					:formItems="formItems"
					:formData="defaultData"
					:items="
						formProps.filter((f) => (f.hasOwnProperty('formShow') ? f.formShow : true))
					"
					:columnCount="columnCount"
					:autoRemote="autoRemote"
					:notInitRemoteKeys="notInitRemoteKeys"
					:isClear="isClear"
					@init-remote-complete="onInitRemoteComplete"
					@change="onFormChange"
					@changeFile="onFormChange"
					@focus="onFocus"
					@blur="onBlur"
				>
					<template v-for="item of formItems" #[`form-${item.prop}`]="scope">
						<!-- row: 表格内, value: 普通表单 -->
						<slot
							v-bind="scope.item"
							:name="`form-${scope.item.prop}`"
							:row="scope.row"
							:form="form"
							:value="form[item.prop]"
						></slot>
					</template>
					<template v-for="item of formItems" #[`form-${item.prop}-right`]="scope">
						<slot :name="`form-${item.prop}-right`"></slot>
					</template>
				</FormItem>

				<el-form-item
					class="btns flowing"
					v-if="buttonVertical === 'flowing' && enableButton && !formDisabled && !grid"
				>
					<el-button v-if="enableReset" @click="onResetFields" :size="size">
						<Icons icon-name="Reset" class="mg-right-5" :size="getIconSize()"></Icons>
						重置
					</el-button>
					<el-button v-if="enableClear" @click="onClear" :size="size">
						<Icons icon-name="Clear" class="mg-right-5" :size="getIconSize()"></Icons>
						清空
					</el-button>
					<slot name="buttons"></slot>
					<el-button :loading="isLoading" type="primary" @click="onSubmit" :size="size">
						<Icons
							v-if="!isLoading"
							icon-name="Send"
							color="#fff"
							class="mg-right-5"
							:size="getIconSize()"
						></Icons>
						{{ $props.confirmText }}
					</el-button>
				</el-form-item>
			</div>

			<el-form-item
				class="btns bottom"
				v-if="buttonVertical === 'bottom' && enableButton && !formDisabled && !grid"
			>
				<el-button v-if="enableReset" @click="onResetFields" :size="size">
					<Icons icon-name="Reset" class="mg-right-5" :size="getIconSize()"></Icons>
					重置
				</el-button>
				<el-button v-if="enableClear" @click="onClear" :size="size">
					<Icons icon-name="Clear" class="mg-right-5" :size="getIconSize()"></Icons>
					清空
				</el-button>
				<slot name="buttons"></slot>
				<el-button :loading="isLoading" type="primary" @click="onSubmit" :size="size">
					<Icons
						v-if="!isLoading"
						icon-name="Send"
						color="#fff"
						class="mg-right-5"
						:size="getIconSize()"
					></Icons>
					{{ $props.confirmText }}
				</el-button>
			</el-form-item>
		</el-form>
		<Lock v-model="unLock"></Lock>
	</div>
</template>
<style scoped lang="scss">
.form-component {
	.btns {
		padding: torem(10px);
		:deep(.el-form-item__content) {
			display: flex;
			justify-content: v-bind(buttonAlign);
			margin-left: 0 !important;
		}

		&.top {
			margin-bottom: torem(15px) !important;
		}

		&.flowing {
			margin-left: 0;
			padding: 0;
			:deep(.el-form-item__content) {
				justify-content: flex-start;
			}
		}

		&.bottom {
			border-top: 1px solid rgba(var(--z-line-rgb), 0.5);
			position: relative;

			&::after {
				content: '';
				border-top: 1px solid var(--z-theme);
				height: 0;
				left: 0;
				position: absolute;
				top: 0;

				width: 100%;
			}
		}
	}

	.form-items {
		display: flex;
		flex-wrap: wrap;
		padding-bottom: v-bind(formItemsPadding);

		:deep(.el-form-item) {
			align-items: flex-start;
			margin-right: v-bind(flexSize);
			width: calc(100% / v-bind(columnCount) - v-bind(flexSize));
		}

		:deep(.el-input__wrapper),
		:deep(.el-select .el-input__wrapper) {
			background-color: var(--z-theme);
			box-shadow: 0 0 0 1px var(--z-line, var(--z-line)) inset;

			&:hover {
				box-shadow: 0 0 0 1px var(--z-nav-hover, var(--z-nav-hover)) inset;
			}
		}

		:deep(.el-input__wrapper.is-focus) {
			box-shadow: 0 0 0 1px var(--z-nav-hover, var(--z-nav-hover)) inset;
		}

		:deep(.el-textarea__inner) {
			background-color: var(--z-theme);
			box-shadow: 0 0 0 1px var(--z-line, var(--z-line)) inset;

			&:focus {
				box-shadow: 0 0 0 1px var(--z-nav-hover, var(--z-nav-hover)) inset;
			}
		}
	}

	.not-label :deep(.el-form-item) {
		margin-bottom: torem(13px);
	}

	.not-label :deep(.form-item) {
		padding: 0;
	}

	:deep(.el-form-item) {
		&:last-child {
			margin-bottom: 0;
		}
	}

	&.form-grid {
		background-color: var(--z-theme);
		.form-items {
			border-radius: torem(5px);
			border: 1px solid var(--z-line);
			overflow: hidden;
		}

		:deep(.el-form-item) {
			border: 1px solid var(--z-line);
			border-right: 0;
			display: flex;
			margin: 0;
			margin-top: -1px;
			margin-left: -1px;
			width: calc(100% / v-bind(columnCount) + 1px);

			&.full {
				.el-form-item__label {
					height: 100%;
				}

				.el-form-item__content {
					white-space: wrap;
				}
			}

			&.last-item {
				border-bottom: 0;
			}
		}

		:deep(.el-form-item__label) {
			align-items: center;
			border-right: 1px solid var(--z-line);
			background-color: var(--z-bg-secondary);
			display: flex;
			font-weight: 500;
			height: 100%;
			opacity: 0.8;
		}

		:deep(.el-form-item__content) {
			color: var(--z-font-color);
			height: 100%;
			padding: torem(5px);
			white-space: nowrap;
		}
	}
}
</style>
