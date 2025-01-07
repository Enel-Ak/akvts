<script setup lang="ts">
import {onMounted, onActivated} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {updateLabelTitle} from '@/hooks/useLabels'

const route = useRoute()
const router = useRouter()
onMounted(() => {})
onActivated(() => {
	console.log(123, route.query.id ? '编辑' : '新增', router.currentRoute.value.fullPath)

	updateLabelTitle({
		path: router.currentRoute.value.fullPath,
		title: route.query.id ? '编辑' : '新增',
	})
})
</script>
<template>
	<div class="testdetail">
		<el-button @click="$router.go(-1)">测试路由跳转</el-button>
		{{ router.currentRoute.value.fullPath }}
		<!-- ignoreLabel: true, -->
	</div>
</template>
<route>
	{
		meta: {
			childTitle: '测试详情2',
		}
	}
</route>
<style scoped lang="scss"></style>
