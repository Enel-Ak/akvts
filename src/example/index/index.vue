<script setup></script>
<template>
	<Container>
		<template #header> </template>
		<template #aside> </template>
		<Block title="测试组件" :enableFixedHeight="true">
			<Form :props="[{prop: 'abc', label: '测试', dataUrl: '/abc', type: 'text'}]"></Form>
			<TableV2
				:form-column-count="2"
				:columns="[
					{prop: 'abc', label: '测试', type: 'text'},
					{
						prop: 'def',
						label: '测试2',
						children: [
							{prop: 'defa', label: 'defa', type: 'text'},
							{
								prop: 'defb',
								label: 'defb',
								children: [
									{prop: 'defba', label: 'defba', type: 'text'},
									{prop: 'defbb', label: 'defbb', type: 'text'},
									{prop: 'defbc', label: 'defbc', type: 'text'},
								],
							},
						],
					},
				]"
			></TableV2>
		</Block>
		<template #footer> Footer</template>
	</Container>
</template>
<style scoped lang="scss"></style>
