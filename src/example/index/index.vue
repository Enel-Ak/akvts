<script setup></script>
<template>
	<Container>
		<template #header>
			<div>Header</div>
		</template>
		<template #aside> Aside </template>
		<Block title="测试组件" :enableFixedHeight="true">123</Block>
		<template #footer> Footer</template>
	</Container>
</template>
<style scoped lang="scss"></style>
