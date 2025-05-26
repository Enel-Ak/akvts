<script setup name="flow">
import {ref} from 'vue'
const flowRef = ref()
const flowConfig = ref({
	id: 'abc',
	label: '发起人',
	type: 'input',
	childNode: [
		{
			id: 'def',
			label: '主任务',
			type: 'main',
			data: {label: '123'},
			childNode: [
				{
					id: 'ghi',
					label: '子任务',
					type: 'sub',
				},
			],
		},
	],
})
</script>
<template>
	<Block
		title="流程组件"
		height="600"
		:enable-fixed-height="false"
		:enable-expand="true"
		:enable-expand-content="false"
	>
		<Flow ref="flowRef" v-model="flowConfig" width="100%"> </Flow>
	</Block>
</template>
<route>
    {
        meta: {
            title: '消息通知',
        },
    }
</route>
