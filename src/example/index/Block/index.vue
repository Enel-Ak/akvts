<script setup>
import {useRouter} from 'vue-router'
const router = useRouter()
const onClick = () => {
	router.push({
		path: '/Block/testdetail',
		query: {
			_l: '测试',
		},
	})
}
</script>
<template>
	<Block title="测试标题">
		<el-link @click="onClick">跳转测试</el-link>
	</Block>
</template>
<style scoped lang="scss"></style>
