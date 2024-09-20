<script setup></script>
<template>
	<Container>
		<template #header>
			<div>Header</div>
		</template>
		<template #aside> </template>
		<Block title="测试组件" :enableFixedHeight="true">
			<Form :props="[{prop: 'abc', label: '测试', dataUrl: '/abc', type: 'text'}]"></Form>
		</Block>
		<template #footer> Footer</template>
	</Container>
</template>
<style scoped lang="scss"></style>
