<script setup lang="ts"></script>
<template>
	<div class="testdetail">
		<el-button @click="$router.go(-1)">测试路由跳转</el-button>
	</div>
</template>
<route>
	{
		meta: {
			childTitle: '测试详情',
		}
	}
</route>
<style scoped lang="scss"></style>
