<script setup>
import {ref, watch} from 'vue'
import axios from 'axios'
import {ElMessage} from 'element-plus'

const emits = defineEmits(['update:modelValue'])
const props = defineProps({
	moduleValue: {type: Boolean, default: false},
	title: {type: String, default: '导入数据'},
	autoUpload: {type: Boolean, default: false},
	url: {type: String, default: ''},
	multiple: {type: Boolean, default: false},
	accept: {type: String, default: '.xlsx'},
	tip: {type: String, default: '仅支持上传文件后缀为.xlsx'},

	enableDownloadTemplate: {type: Boolean, default: true},
	templateName: {type: String, default: '模版名称.xlsx'},
	templateDownloadUrl: {type: String, default: ''},

	finishedClose: {type: Boolean, default: false},
})

watch(
	() => props.moduleValue,
	(val) => {
		if (val) {
			uploadRef.value?.clearFiles()
		}
		visible.value = val
	}
)

const uploadRef = ref()
const baseUrl = import.meta.env.VITE_GLOBAL_API_URL
const visible = ref(props.modelValue)

const onDownloadTemplate = () => {
	console.log('ImportDialogDownloadTemplate')
	axios
		.request({
			url: props.templateDownloadUrl,
			method: 'GET',
			responseType: 'blob',
		})
		.then((res) => {
			const blob = new Blob([res.data])
			const fileName = props.templateName

			if ('download' in document.createElement('a')) {
				const link = document.createElement('a')
				link.download = fileName
				link.style.display = 'none'
				link.href = URL.createObjectURL(blob)
				document.body.appendChild(link)
				link.click()
				URL.revokeObjectURL(link.href)
				document.body.removeChild(link)
			}
			ElMessage.success('模版下载成功')
		})
		.catch(() => {
			ElMessage.error('模版下载失败')
		})
}

const onUploadFile = () => {
	console.log('ImportDialogUploadFile')
	uploadRef.value.submit()
	if (props.finishedClose) {
		emits('update:modelValue', false)
	}
}

const onClose = () => {
	console.log('ImportDialogClose')
	emits('update:modelValue', false)
}
</script>
<template>
	<Dialog
		v-model="visible"
		confirmText="确认上传"
		:title="title"
		@close="onClose"
		@click-close="onClose"
		@click-confirm="onUploadFile"
	>
		<div v-if="enableDownloadTemplate" class="download-template">
			<span>下载模版:</span>
			<span>{{ templateName }}</span>
			<el-button type="primary" size="small" @click="onDownloadTemplate">
				<i class="icon i-ic-baseline-download"></i>
				点击下载
			</el-button>
		</div>
		<el-upload
			drag
			v-bind="$attrs"
			ref="uploadRef"
			class="upload-component"
			:action="`${baseUrl}${url}`"
			:auto-upload="attrs.autoUpload || autoUpload"
			:multiple="attrs.multiple || multiple"
			:accept="attrs.accept || accept"
			:headers="
				attrs.headers || {
					Authorization: `Bearer ${global?.GetToken}`,
				}
			"
		>
			<el-icon class="el-icon--upload"><upload-filled /></el-icon>
			<div class="el-upload__text">将文件拖拽到这里上传或<em>点击</em></div>
			<template #tip>
				<div class="el-upload__tip">{{ tip }}</div>
			</template>
		</el-upload>
	</Dialog>
</template>
<style lang="scss" scoped>
.download-template {
	align-items: center;
	color: var(--z-font-color);
	display: flex;
	padding-bottom: torem(20px);

	span {
		margin-right: torem(20px);
	}
}

.upload-component {
	padding-bottom: torem(15px);
	:deep(.el-upload-dragger) {
		background-color: transparent;
		border-color: var(--z-line);
	}
}
.el-upload__tip {
	padding-bottom: torem(10px);
}
</style>
