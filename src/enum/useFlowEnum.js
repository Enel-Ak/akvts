export const FlowNodeTypes = {
	Input: 'input',
	Output: 'output',
	Report: 'report',
	Review: 'review',
	Gateway: 'gateway',
	Condition: 'condition',
	Main: 'main',
	Sub: 'sub',
}

export const FlowNodeTypeNames = {
	[FlowNodeTypes.Input]: '发起流程',
	[FlowNodeTypes.Output]: '流程结束',
	[FlowNodeTypes.Report]: '填报',
	[FlowNodeTypes.Review]: '审核',
	[FlowNodeTypes.Gateway]: '网关',
	[FlowNodeTypes.Condition]: '条件',
	[FlowNodeTypes.Main]: '主任务',
	[FlowNodeTypes.Sub]: '子任务',
}
