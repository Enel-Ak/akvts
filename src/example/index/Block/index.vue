<script setup>
import {useRouter} from 'vue-router'
const router = useRouter()
const onClick = () => {
	router.push({
		path: '/Block/testdetail',
	})
}
const onClick2 = () => {
	router.push({
		path: '/Block/testdetail',
		query: {
			id: 1,
		},
	})
}
</script>
<template>
	<Block title="测试标题" :enable-fixed-height="false">
		<el-link @click="onClick">跳转测试</el-link> <br />
		<el-link @click="onClick2">跳转测试2</el-link>
	</Block>
</template>
<route>
	{
		meta: {
			title: '代办通知',
		}
	}
</route>
<style scoped lang="scss"></style>
