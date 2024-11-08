<script setup>
import {ref} from 'vue'
const flowRef = ref()
const flowConfig = ref({
	id: 'abc',
	label: '发起人',
	type: 'input',
	childNode: [
		{
			id: 'def',
			label: '填报',
			type: 'report',
			childNode: [
				{
					id: 'ghi',
					label: '审核',
					type: 'review',
				},
			],
		},
	],
})
</script>
<template>
	<Container :frame="['header', 'default', 'footer', 'aside']">
		<template #header> header</template>
		<template #aside> aside </template>
		<template #top> top </template>
		<Block title="测试组件" :enableFixedHeight="true">
			<template #expand>
				<Form :props="[{prop: 'abc', label: '测试', dataUrl: '/abc', type: 'text'}]"></Form>
			</template>
			<TableV2
				:enableSelection="true"
				:auto-height="true"
				:form-column-count="2"
				:enableLatestData="false"
				:default-table-data="[{defbcff: 'defbcff'}]"
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
									{
										prop: 'defbcf',
										label: 'defbcf',
										type: 'text',
										children: [
											{prop: 'defbaf', label: 'defba', type: 'text'},
											{prop: 'defbbf', label: 'defbb', type: 'text'},
											{prop: 'defbcf', label: 'defbc', type: 'text'},
										],
									},
									{prop: 'defbcff', label: 'defbcff', type: 'text'},
									{prop: 'defbcffe', label: 'defbcffe', type: 'text'},
									{prop: 'defbcfff', label: 'defbcfff', type: 'text'},
								],
							},
							{prop: 'defc', label: 'defc', type: 'text'},
							{prop: 'defd', label: 'defc', type: 'text'},
							{prop: 'defe', label: 'defc', type: 'text'},
						],
					},
				]"
			></TableV2>
		</Block>
		<!-- <Flow ref="flowRef" v-model="flowConfig"></Flow> -->
	</Container>
</template>
<style scoped lang="scss"></style>
