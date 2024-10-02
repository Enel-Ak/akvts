<script setup>
import {ref, watch, computed, onMounted} from 'vue'
import axios from 'axios'
import {ElMessage} from 'element-plus'

const emits = defineEmits(['change', 'changeFile', 'initRemoteComplete', 'update:modelValue'])
const props = defineProps({
	modelValue: {type: [String, Number, Array], default: () => ''},
	items: {type: Object, default: () => []}, // 表单项配置
	form: {type: Object, default: () => ({})}, // 表单对象, 用于双向绑定
	formData: {type: Object, default: () => ({})}, // 表单项数据, 接口数据
	formItems: {type: Array, default: () => []},
	size: {type: String, default: 'default'},
	grid: {type: Boolean, default: false},
	columnCount: {type: [Number, String], default: 1},

	isRowEdit: {type: Boolean, default: false},
	autoRemote: {type: Boolean, default: true},
	notInitRemoteKeys: {type: Array, default: () => []},

	expand: {type: Boolean, default: true}, // 默认展开折叠

	isClear: {type: Boolean, default: false},

	_expandArray: {type: Array, default: () => []},
	_expandIndex: {type: Number, default: 0},
})

const activeNames = ref(props._expandArray)
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
	if (!item.remoteUrl || props.notInitRemoteKeys.indexOf(item.prop) > -1) return

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
					remoteCompleted(query, item, res)
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
		// props.form[item.prop] = toBufferString(arrayBuffer)

		//  转 base64
		let base64String = re.target.result
		props.form[item.prop] = base64String.replace('data:application/pdf;base64,', '')

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
	return (
		(Math.floor((props.items.length - 1) / props.columnCount) * props.columnCount <= index &&
			!item.full) ||
		index === props.items.length - 1
	)
}

watch(
	() => props._expandIndex,
	(val) => {
		setTimeout(() => {
			currentActiveNames.value = activeNames.value[val]
		}, 16.7)
	},
	{
		immediate: true,
	}
)

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
		if (props.items.length === 1) {
			if (props.items[0].remoteInit && props.items[0].remoteUrl && val) {
				remoteMethod(val, props.items[0], () => {
					Object.assign(props.form, {[props.items[0].prop]: val})
				})
			} else if (!val) {
				Object.assign(props.form, {[props.items[0].prop]: val})
			}
		}
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
						<i class="icon i-ic-baseline-subdirectory-arrow-right" style="scale: 0.8"></i>
						{{ item.label }}
					</div>
				</template>
				<div class="form-items">
					<FormItem
						:form="form"
						:items="item.children"
						:formItems="formItems"
						:isRowEdit="isRowEdit"
						:columnCount="count"
						:_expandArray="activeNames"
						:_expandIndex="_expandIndex + 1"
						@change="onChange"
						@changeFile="onChange"
					>
						<template v-for="child of formItems" #[`form-${child.prop}`]="scope">
							<slot :name="`form-${child.prop}`" v-bind="scope" :form="form" :row="formData"></slot>
						</template>
					</FormItem>
				</div>
			</el-collapse-item>
		</el-collapse>

		<!-- 无type时(插槽) -->
		<template v-else>
			<el-form-item
				v-if="!item.type"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:label-width="item.labelWidth"
				:prop="item.prop"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">{{ form[item.prop] || '-' }}</template>
						<template v-else>
							-
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 文本框 -->
			<el-form-item
				v-if="item.type === 'text'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-if="!item.inputType"
								v-model="form[item.prop]"
								v-bind="item.attrs"
								type="text"
								:readonly="item.disabled"
								:placeholder="item.placeholder || `请输入${item.label}`"
								:size="size"
								clearable
								@change="onChange($event, item)"
							/>
							<el-input-number
								v-else-if="item.inputType === 'number'"
								v-model.number="form[item.prop]"
								v-bind="item.attrs"
								type="number"
								:min="item.min || 0"
								:max="item.max || 100000000"
								:readonly="item.disabled"
								:placeholder="item.placeholder || `请输入${item.label}`"
								:size="size"
								:style="{width: columnCount > 1 ? '100%' : '100%'}"
								clearable
								@change="onChange($event, item)"
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 密码框 -->
			<el-form-item
				v-if="item.type === 'password'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-model="form[item.prop]"
								v-bind="item.attrs"
								type="password"
								:readonly="item.disabled"
								:placeholder="item.placeholder || `请输入${item.label}`"
								:size="size"
								clearable
								@change="onChange($event, item)"
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 下拉框 -->
			<el-form-item
				v-if="item.type === 'select'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-select
								v-model="form[item.prop]"
								v-bind="item.attrs"
								:disabled="item.disabled"
								:placeholder="item.placeholder || `请选择${item.label}`"
								:filterable="item.filterable"
								:multiple="item.multiple"
								:multiple-limit="item.multipleLimit ? item.multipleLimit : 0"
								:collapse-tags="item.collapseTags"
								:size="size"
								clearable
								style="flex: 1"
								@change="onChange($event, item)"
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
			</el-form-item>

			<!-- 下拉远程搜索 -->
			<el-form-item
				v-if="item.type === 'selectRemote'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ item?.options?.find((f) => f.value === form[item.prop])?.label || '-' }}
						</template>
						<template class="form-item" v-else>
							<el-select
								v-model="form[item.prop]"
								v-bind="item.attrs"
								reserve-keyword
								filterable
								clearable
								remote
								:placeholder="item.placeholder || `请输入关键字搜索${item.label}`"
								:remote-method="(query) => remoteMethod(query, item)"
								:disabled="item.disabled"
								:loading="loading"
								:size="size"
								@change="onChange($event, item)"
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
			</el-form-item>

			<!-- 日期/时间选择器 -->
			<el-form-item
				v-if="
					[
						'date',
						'year',
						'month',
						'week',
						'datas',
						'datetime',
						'daterange',
						'monthrange',
						'datetimerange',
					].includes(item.type)
				"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-date-picker
								v-model="form[item.prop]"
								v-bind="item.attrs"
								:readonly="item.readonly"
								:disabled="item.disabled"
								:disabled-date="item.disabledDate"
								:type="item.type"
								:placeholder="item.placeholder || `请选择${item.label}`"
								:value-format="
									item.type === 'datetime' || item.type === 'datetimerange'
										? 'YYYY-MM-DD HH:mm:ss'
										: 'YYYY-MM-DD'
								"
								:size="size"
								:style="{width: item.full ? '100%' : '100%'}"
								range-separator="到"
								start-placeholder="开始时间"
								end-placeholder="结束时间"
								@change="onChange($event, item)"
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 多选 -->
			<el-form-item
				v-if="item.type === 'checkbox'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-checkbox-group
								v-model="form[item.prop]"
								v-bind="item.attrs"
								@change="onChange($event, item)"
							>
								<el-checkbox
									v-for="option of item.options"
									:value="option.value"
									:name="option.name"
									:disabled="option.disabled"
									:size="size"
								>
									{{ option.label }}
								</el-checkbox>
							</el-checkbox-group>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 单选 -->
			<el-form-item
				v-if="item.type === 'radio'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-radio-group
								v-model="form[item.prop]"
								v-bind="item.attrs"
								@change="onChange($event, item)"
							>
								<el-radio
									v-for="(option, index) of item.options"
									:value="option.value"
									:disabled="item.disabled"
									:size="size"
								>
									{{ option.label }}
								</el-radio>
							</el-radio-group>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 文本域 -->
			<el-form-item
				v-if="item.type === 'textarea'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-input
								v-model="form[item.prop]"
								v-bind="item.attrs"
								type="textarea"
								resize="none"
								:rows="6"
								:readonly="item.disabled"
								:placeholder="item.placeholder || `请输入${item.label}`"
								:size="size"
								:maxlength="item.maxlength || 1000"
								@change="onChange($event, item)"
							/>
							<slot :name="`form-${item.prop}-right`"></slot>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 开关 -->
			<el-form-item
				v-if="item.type === 'switch'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<el-switch
							v-model="form[item.prop]"
							v-bind="item.attrs"
							:disabled="item.disabled"
							:active-text="item.activeText"
							:inactive-text="item.inactiveText"
							:size="size"
							@change="onChange($event, item)"
						/>
						<slot :name="`form-${item.prop}-right`"></slot>
					</slot>
				</div>
			</el-form-item>

			<!-- 下拉联动 -->
			<el-form-item
				v-if="item.type === 'cascade'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<Cascade
							:grid="grid"
							:form-data="form"
							:isClear="isClear"
							:options="item.cascadeItems"
							@change="onChange($event, item)"
						></Cascade>
						<slot :name="`form-${item.prop}-right`"></slot>
					</slot>
				</div>
			</el-form-item>

			<!-- 下拉树 -->
			<el-form-item
				v-if="item.type === 'treeSelect'"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<template v-if="grid">
							{{ form[item.prop] || '-' }}
						</template>
						<template v-else>
							<el-tree-select
								v-model="form[item.prop]"
								v-bind="item.attrs"
								:data="item.options"
								:render-after-expand="false"
								:multiple="item.multiple"
								:placeholder="item.placeholder || `请选择${item.label}`"
								:filterable="item.filterable"
								:check-strictly="item.checkStrictly"
								@change="onChange($event, item)"
								style="width: 100%"
							/>
						</template>
					</slot>
				</div>
			</el-form-item>

			<!-- 上传: 返回base64, 非流直接上传 -->
			<el-form-item
				v-if="item.type === 'upload'"
				v-bind="$attrs"
				:label="!isRowEdit ? item.label : ''"
				:prop="item.prop"
				:label-width="item.labelWidth"
				:class="{
					full: item.full,
					'row-edit': isRowEdit,
					'last-item': onCheckIsLastItem(item, index),
				}"
			>
				<div class="form-item">
					<slot :name="`form-${item.prop}`" :item="item">
						<div class="form-upload">
							<el-button type="primary" size="small">
								<i class="icon i-ic-round-upload-file"></i>
								选择文件
							</el-button>
							<span class="filename">
								{{
									uploadFileNames.join(',') ||
									`只支持格式 ${item.accept} 文件, 且文件大小不超过${item.size || 2}M`
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
