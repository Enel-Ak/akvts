<script setup>
import {ref, watch, onMounted} from 'vue'
import axios from 'axios'

const emits = defineEmits(['change', 'elChange', 'update:modelValue', 'focus', 'blur'])

const props = defineProps({
	modelValue: {type: Object, default: () => ({})},
	grid: {type: Boolean, default: false},
	options: {type: Array, default: () => []},
	keys: {type: Array, default: () => ['name', 'id']},
	maxLevel: {type: [Number, String], default: 1},
	isClear: {type: Boolean, default: false},
	vertical: {type: Boolean, default: false},
	static: {type: Boolean, default: false},
	oneSelect: {type: Boolean, default: false},
	oneSelectProps: {type: Object, default: () => ({})},
	labelWidth: {type: [String, Number], default: '100px'},
	addEmptyOption: {type: Boolean, default: false},
})

/* ------------------ state ------------------ */

const form = ref({...props.modelValue})
const cascade = ref(props.modelValue)
const cascadeRef = ref()
const cascadeProps = ref(props.oneSelectProps)

const _options = ref([])

/* ------------------ emit helper ------------------ */

const updateModel = (val) => {
	emits('update:modelValue', val)
}

/* ------------------ axios helper ------------------ */

const request = async (config) => {
	const res = await axios.request(config)
	const data = res?.data?.items || res?.data || []
	return Array.isArray(data) ? data : []
}

/* ------------------ change handler ------------------ */

const onFormItemChange = async (val, item, index, init = true, isDefault = false) => {
	const nextIndex = index + 1
	const next = _options.value[nextIndex]

	if (next) {
		if (!isDefault) {
			for (let i = nextIndex; i < _options.value.length; i++) {
				_options.value[i].options = []
				form.value[_options.value[i].prop] = ''
			}
		}

		if (typeof item.beforeInitOptions === 'function') {
			item.beforeInitOptions(val, next, item)
		}

		if (props.static) {
			const children = item.options?.find((i) => i.value === val)?.children ?? []
			next.options = children
		} else if (form.value[item.prop] && init && item.cascadeUrl) {
			await initOptions(next, nextIndex)
		}
	}

	if (index >= props.maxLevel - 1) {
		emits('change', form.value)
		updateModel(form.value)
	}
}

/* ------------------ cascader change ------------------ */

const onElCascaderChange = (val) => {
	emits('elChange', val, cascadeRef.value?.getCheckedNodes?.())
	updateModel(val || [])
}

/* ------------------ default data ------------------ */

const setDefaultData = async (val) => {
	const isAllEmpty = val.every((item) => !item.value)

	for (let i = 0; i < val.length; i++) {
		const item = val[i]

		form.value[item.prop] = item.value || (item.multiple ? [] : cascade.value[item.prop] || '')

		if (!props.grid) {
			if (item.hasOwnProperty('cascadeUrl')) {
				if (
					(isAllEmpty && i === 0 && !item.options?.length) ||
					item.value ||
					val[i - 1]?.value
				) {
					await initOptions(item, i)
				}
			}

			const isInit = !!form.value[item.prop]

			if (props.static || isInit) {
				await onFormItemChange(item.value || form.value[item.prop], item, i, isInit, true)
			}

			if (item.hasOwnProperty('value')) {
				await onFormItemChange(item.value, item, i, false)
			}
		}
	}
}

/* ------------------ lazy load ------------------ */

const oneSelectLazyLoad = async (node, resolve) => {
	const {level} = node

	let {url, method, data, query, beforeCompleted} = props.oneSelectProps

	let requestData = {...data}
	let requestQuery = {...query}

	if (beforeCompleted) {
		const result = beforeCompleted(node, data, query, url) || {}

		if (result.data) requestData = {...requestData, ...result.data}
		if (result.query) requestQuery = {...requestQuery, ...result.query}
		if (result.url) url = result.url
	}

	if (!url) {
		resolve([])
		return
	}

	try {
		const data = await request({
			url,
			method: method || 'GET',
			params: requestQuery,
			data: requestData,
		})

		const nodes = data.map((d) => ({
			label: d[props.keys[0]],
			value: d[props.keys[1]],
			leaf: level >= props.maxLevel ? true : d.isLeaf || d.leaf || false,
			raw: JSON.parse(JSON.stringify(d)),
		}))

		resolve(nodes)
	} catch {
		resolve([])
	}
}

/* ------------------ focus blur ------------------ */

const onFocus = () => emits('focus')
const onBlur = () => emits('blur')

/* ------------------ init options ------------------ */

const initOptions = async (item, level = 0) => {
	if (!item.cascadeUrl) return

	const data = await request({
		url: item.cascadeUrl,
		method: item.method || 'post',
		params: item.cascadeParams || {},
		data: item.cascadeData || {},
		headers: {...item?.headers},
	})

	item.options = data.map((d) => ({
		label: d[props.keys[0]],
		value: d[props.keys[1]],
		level: level >= props.maxLevel ? true : d.isLeaf || d.leaf || false,
		raw: JSON.parse(JSON.stringify(d)),
	}))

	if (props.addEmptyOption) {
		item.options.unshift({
			label: '为空',
			value: 'empty',
			level: true,
			raw: {},
		})
	}
}

/* ------------------ clear ------------------ */

const onClear = () => {
	if (!props.oneSelect) {
		_options.value.forEach((item, index) => {
			form.value[item.prop] = ''
			if (index) item.options = []
		})
	} else {
		cascade.value = []
	}

	updateModel(props.oneSelect ? cascade.value : form.value)
}

/* ------------------ lifecycle ------------------ */

onMounted(() => {
	if (props.oneSelect) {
		cascadeProps.value.lazyLoad = oneSelectLazyLoad
	}
})

/* ------------------ watch ------------------ */

watch(
	() => props.modelValue,
	(val = {}) => {
		if (!props.oneSelect) {
			form.value = {...val}

			if (Object.keys(val).length === 0) {
				for (let i = 1; i < _options.value.length; i++) {
					_options.value[i].options = []
				}
			}
		} else {
			cascade.value = val
		}
	},
	{deep: true}
)

watch(
	() => props.options,
	(val) => {
		if (!props.oneSelect) {
			_options.value = JSON.parse(JSON.stringify(val || []))
			setDefaultData(_options.value)
		}
	},
	{immediate: true}
)

watch(
	() => props.isClear,
	(val) => {
		if (val) onClear()
	}
)

/* ------------------ expose ------------------ */

defineExpose({
	clear: () => onClear(),
	setValue: (key, value) => (form.value[key] = value),
})
</script>

<template>
	<div class="cascade-component" :class="{vertical}">
		<template v-if="grid">
			{{
				Object.entries(form)
					.map(([key, value]) => value)
					.join('-')
			}}
		</template>

		<el-cascader
			v-else-if="oneSelect"
			ref="cascadeRef"
			v-model="cascade"
			v-bind="$attrs"
			:options="options"
			:props="cascadeProps"
			clearable
			filterable
			@change="onElCascaderChange"
			@focus="onFocus"
			@blur="onBlur"
		>
			<template #default="{data}">
				<slot name="default" :node="data">
					<span>{{ data.label }}</span>
				</slot>
			</template>
		</el-cascader>

		<FormItem
			v-else
			v-for="(item, index) of _options"
			:key="index"
			v-model="form[item.prop]"
			:items="[{...item, labelWidth: labelWidth}]"
			@change="(val, item) => onFormItemChange(val, item, index)"
			@focus="onFocus"
			@blur="onBlur"
		/>
	</div>
</template>

<style scoped lang="scss">
.cascade-component {
	display: flex;
	width: 100%;

	&.vertical {
		flex-direction: column;

		:deep(> div) {
			margin-right: 0 !important;
			margin-bottom: 10px;

			&:last-child {
				margin-bottom: 0;
			}
		}
	}

	:deep(> div) {
		flex: 1;
		margin-right: 10px !important;

		&:last-child {
			margin-right: 0 !important;
		}

		.form-item {
			padding: 0;
		}
	}
}
</style>

<style lang="scss">
.el-cascader-panel {
	.in-active-path,
	.is-active {
		.el-cascader-node__label,
		.el-cascader-node__prefix,
		.el-cascader-node__label span {
			color: var(--z-nav-hover);
		}
	}
}
</style>
