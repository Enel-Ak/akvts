<script setup>
const formProps = [
	{prop: 'a', label: 'a', type: 'text'},
	{prop: 'b', label: 'b', type: 'text'},
	{prop: 'c', label: 'c', type: 'select'},
	{prop: 'd', label: 'd', type: 'select'},
	{prop: 'e', label: 'e', type: 'select'},
]
</script>
<template>
	<div>
		<Form :props="formProps" :column-count="3"></Form>
	</div>
</template>
<style scoped lang="scss"></style>
