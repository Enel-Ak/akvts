<script setup>
import {computed} from 'vue'
import VueOfficeDocx from '@vue-office/docx/lib/v3/vue-office-docx.mjs'
import VueOfficePdf from '@vue-office/pdf/lib/v3/vue-office-pdf.mjs'
import VueOfficeExcel from '@vue-office/excel/lib/v3/vue-office-excel.mjs'
import '@vue-office/docx/lib/v3/index.css'
import '@vue-office/excel/lib/v3/index.css'

const props = defineProps({
	src: {
		type: String,
		default: '',
	},
	mode: {
		type: String,
		default: 'docx', // docx, pdf, excel
	},
	width: {
		type: [String, Number],
		default: '100%',
	},
	height: {
		type: [String, Number],
		default: '100%',
	},
})

const w = computed(() => {
	return typeof props.width === 'number' ? `${props.width}px` : props.width
})

const h = computed(() => {
	return typeof props.height === 'number' ? `${props.height}px` : props.height
})
</script>
<template>
	<div class="file-preview-component" :style="{width: w, height: h}">
		<vue-office-docx v-if="props.mode === 'docx'" :src="props.src" />
		<vue-office-pdf v-if="props.mode === 'pdf'" :src="props.src" />
		<vue-office-excel v-if="props.mode === 'excel'" :src="props.src" />
	</div>
</template>
<style scoped lang="scss"></style>
