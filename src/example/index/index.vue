<script setup>
import {ref} from 'vue'
import Record from '../../components/Record.vue'
import Toolbar from '../../components/Toolbar.vue'
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
const recordData = ref([
	{label: '关联项目', time: '2021-08-06 12:20:00', user: '张三', text: '正常'},
	{
		label: '关联项目',
		time: '2021-08-07 12:20:00',
		user: '张三',
		text: '成功',
		type: 'success',
	},
	{label: '关联项目', time: '2021-08-08 12:20:00', user: '张三', text: '错误', type: 'error'},
	{
		label: '关联项目',
		time: '2021-08-09 12:20:00',
		user: '张三',
		text: '警告',
		type: 'warning',
	},
	{label: '关联项目', time: '2021-08-10 12:20:00', user: '张三', text: '危险', type: 'danger'},
	{label: '关联项目', time: '2021-08-11 12:20:00', user: '张三', text: '正在进行'},
])

const loaidng = ref(false)
const onSubmit = (data) => {
	console.log('onSubmit', data)

	loaidng.value = true
	setTimeout(() => (loaidng.value = false), 3000)
}
</script>
<template>
	<Container :frame="['header', 'default', 'footer', 'aside']">
		<template #header> header</template>
		<template #aside> aside </template>
		<template #top> </template>
		<Toolbar></Toolbar>
		<Block title="测试组件" :enableFixedHeight="true">
			<template #expand>
				<Form
					:props="[
						{prop: 'abc', label: '测试', type: 'text'},
						{prop: 'abc3', label: '测试', type: 'datetimerange'},
						{
							prop: 'abc2',
							label: '测试2',
							type: 'select',
							options: [
								{label: '测试', value: '1'},
								{label: '测试2', value: '2'},
								{label: '测试3', value: '3'},
							],
							attrs: {filterable: false, multiple: false, multipleLimit: 2},
						},
					]"
					:enableEnterPush="true"
					:loading="loaidng"
					@submit="onSubmit"
					class="pd-5"
				></Form>
			</template>
			<div class="df aic">
				<Icons icon-name="Home" color="#f00"></Icons>
				<Icons icon-name="Setting" size="16px"></Icons>
				<Icons icon-name="Create"></Icons>
				<Icons icon-name="Edit"></Icons>
				<Icons icon-name="Delete"></Icons>
				<Icons icon-name="Send"></Icons>
				<Icons icon-name="Cancel"></Icons>
				<Icons icon-name="Reset"></Icons>
				<Icons icon-name="Clear"></Icons>
				<Icons icon-name="Clear2"></Icons>
				<Icons icon-name="Eye"></Icons>
				<Icons icon-name="Lock"></Icons>
				<Icons icon-name="Unlock"></Icons>
				<Icons icon-name="Warning"></Icons>
				<Icons icon-name="User"></Icons>
				<Icons icon-name="ArrowRight"></Icons>
				<Icons icon-name="ArrowRight2"></Icons>
				<Icons icon-name="RotateRight"></Icons>
				<Icons icon-name="Sun"></Icons>
				<Icons icon-name="Moon"></Icons>
				<Icons icon-name="List"></Icons>
				<Icons icon-name="File"></Icons>
				<Icons icon-name="Upload"></Icons>
				<Icons icon-name="Download"></Icons>
				<Icons icon-name="Appendix"></Icons>
				<Icons icon-name="Notifications"></Icons>
				<Icons icon-name="Done"></Icons>
				<Icons icon-name="Back"></Icons>
			</div>
			<!-- <Record title="历史记录" :data="recordData">
				<template #label="scoped">{{ scoped.item.label }}</template>
			</Record> -->
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
		<Flow ref="flowRef" v-model="flowConfig"></Flow>
	</Container>
</template>
<style scoped lang="scss"></style>
