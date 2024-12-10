<script setup>
import {ref, watch, toRaw, onMounted} from 'vue'
import axios from 'axios'

const emits = defineEmits(['change', 'elChange', 'update:modelValue', 'focus', 'blur'])
const props = defineProps({
	modelValue: {type: Object, default: () => ({})}, // v-model
	grid: {type: Boolean, default: false},
	options: {
		type: Array,
		default: () => [],
	},
	keys: {
		type: Array,
		default: () => ['name', 'id'],
	},
	maxLevel: {
		type: [Number, String],
		default: 1, // 必须选择的级别
	},
	isClear: {
		type: Boolean,
		default: false,
	},
	vertical: {
		type: Boolean,
		default: false,
	},
	static: {
		type: Boolean,
		default: false,
	},
	oneSelect: {
		type: Boolean,
		default: false,
	},
	oneSelectProps: {
		type: Object,
		default: () => ({}),
	},
})

const form = ref(props.modelValue)
const cascade = ref(props.modelValue)
const cascadeRef = ref()
const cascadeProps = ref(props.oneSelectProps)

const _options = ref(props.options)

const onFormItemChange = (val, item, index, init = true) => {
	const nextIndex = index + 1
	const next = props.options[nextIndex]

	if (next) {
		for (let i = nextIndex; i < props.options.length; i++) {
			props.options[i].options = []
			form.value[props.options[i].prop] = ''
		}

		if (typeof item.beforeInitOptions === 'function') {
			item.beforeInitOptions(val, next, item)
		}

		if (props.static) {
			next.options = item.options.find((i) => i.value === val)?.children ?? []
		} else if (form.value[item.prop] && init && item.casecadeUrl) {
			initOptions(next, nextIndex)
		}
	}

	if (index >= props.maxLevel - 1) {
		console.log('Cascade Component Value: ', toRaw(form.value))
		emits('change', form.value)
		emits('update:modelValue', form.value)
	}
}

const onElCascaderChange = (val) => {
	console.log('Cascade Component ElCascader Change: ', val, cascadeRef.value.getCheckedNodes())
	emits('elChange', val, cascadeRef.value.getCheckedNodes())
	emits('update:modelValue', val || [])
}

const setDefaultData = async (val) => {
	const isAllEmpty = val.every((item) => !item.value)
	for (let i = 0; i < val.length; i++) {
		const item = val[i]

		form.value[item.prop] = item.value || (item.multiple ? [] : cascade.value[item.prop] || '')

		if (!props.grid) {
			if (item.hasOwnProperty('casecadeUrl')) {
				// val[i].options = []

				if (
					(isAllEmpty && i === 0 && !val[i].options.length) ||
					item.value ||
					val[i - 1]?.value
				) {
					await initOptions(val[i], i)
				}
			}

			if (props.static) {
				onFormItemChange(item.value || form.value[item.prop], item, i, false)
			}

			if (item.hasOwnProperty('value')) {
				onFormItemChange(item.value, item, i, false)
			}
		}
	}
}

const oneSelectLazyLoad = (node, resolve) => {
	const {level, children} = node
	console.log('Cascade Component OneSelectLazyLoad: ', node)

	let {url, method, data, query, beforeCompleted} = props.oneSelectProps

	let requestData = {...data}
	let requestQuery = {...query}

	if (beforeCompleted) {
		const result = beforeCompleted(node, data, query, url)

		if (result.data) requestData = {...requestData, ...result.data}
		if (result.query) requestQuery = {...requestQuery, ...result.query}
		if (result.url) url = result.url
	}

	if (!url) {
		console.log('Cascade Component oneSelectLazyLoad: 请配置 Url !')
		return
	}

	axios
		.request({
			url,
			method: method || 'GET',
			params: requestQuery,
			data: requestData,
		})
		.then((res) => {
			setTimeout(() => {
				// 根据后端数据修改
				const data = res.data.items || res.data || []

				if (!Array.isArray(data)) {
					resolve([])
					return
				}

				const nodes = data?.map((dataitem) => ({
					label: dataitem[props.keys[0]],
					value: dataitem[props.keys[1]],
					leaf:
						level >= props.maxLevel ? true : dataitem.isLeaf || dataitem.leaf || false,
					raw: JSON.parse(JSON.stringify(dataitem)),
				}))

				console.log('Cascade Component OneSelectLazyLoad Nodes: ', nodes)

				resolve(nodes)
			}, 0)
		})
		.catch((err) => {
			console.log('Cascade Component 3 Error: ', err)
			resolve([])
		})
		.finally(() => resolve([]))
}

const onFocus = () => {
	emits('focus')
}

const onBlur = () => {
	emits('blur')
}

const initOptions = (item, level = 0) => {
	if (!item.casecadeUrl) {
		return
	}

	return new Promise((resolve, reject) => {
		axios
			.request({
				url: item.casecadeUrl,
				method: item.method || 'post',
				params: item.casecadeParams || {},
				data: item.casecadeData || {},
				headers: {Urlkey: 'org'},
			})
			.then((res) => {
				// TODO: 这里需要根据实际情况处理返回数据
				// props.keys[0] 为 label,
				// props.keys[1] 为 value
				const data = res.data.items || res.data || []

				if (!Array.isArray(data)) {
					item.options = []
					resolve()
				} else {
					item.options = data?.map((dataitem) => ({
						label: dataitem[props.keys[0]],
						value: dataitem[props.keys[1]],
						level:
							level >= props.maxLevel
								? true
								: dataitem.isLeaf || dataitem.leaf || false,
						raw: JSON.parse(JSON.stringify(dataitem)),
					}))
					console.log('Cascade Component Options: ', item.options, props.keys)
				}
				resolve()
			})
			.catch((err) => {
				console.log('Cascade Component InitOptions Error: ', err)
				reject(err)
			})
			.finally(() => {
				resolve()
			})
	})
}

const onClear = () => {
	if (!props.oneSelect) {
		props.options.forEach((item, index) => {
			form.value[item.prop] = ''
			if (index) {
				item.options = []
			}
		})
	} else {
		cascade.value = []
	}
	emits('update:modelValue', props.oneSelect ? cascade.value : form.value)
	console.log('Cascade Component Clear: ', props.oneSelect ? cascade.value : form.value)
}

onMounted(() => {
	if (props.oneSelect) {
		cascadeProps.value.lazyLoad = oneSelectLazyLoad
	}
})

watch(
	() => props.modelValue,
	(val) => {
		if (!props.oneSelect) {
			console.log('Cascade Component Module Value Watch: ', val)
			form.value = val
			if (Object.keys(val).length === 0) {
				for (let i = 1; i < props.options.length; i++) {
					props.options[i].options = []
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
			console.log('Cascade Component Options Watch: ', val)
			_options.value = val
			setDefaultData(val)
		}
	},
	{immediate: true}
)

watch(
	() => props.isClear,
	(val) => {
		if (val) {
			onClear()
		}
	}
)

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
			v-for="(item, index) of options"
			v-model="form[item.prop]"
			:items="[item]"
			@change="(val, item) => onFormItemChange(val, item, index)"
			@focus="onFocus"
			@blur="onBlur"
		></FormItem>
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
