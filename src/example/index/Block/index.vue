<script setup>
import {useRouter} from 'vue-router'
const router = useRouter()
const onClick = () => {
	router.push({
		path: '/Block/testdetail',
	})
}
</script>
<template>
	<Block title="测试标题">
		<el-link @click="onClick">跳转测试</el-link>
	</Block>
</template>
<route>
	{
		meta: {
			title: '设置'
		}
	}
</route>
<style scoped lang="scss"></style>
