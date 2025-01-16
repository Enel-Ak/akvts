<script setup>
import {ref} from 'vue'
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
	<Block
		title="流程组件"
		height="600"
		:enable-fixed-height="false"
		:enable-expand="true"
		:enable-expand-content="false"
	>
		<Flow v-model="flowConfig" width="100%"> </Flow>
	</Block>
</template>
<route>
    {
        meta: {
            title: '消息通知',
        },
    }
</route>
