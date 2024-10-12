<script setup>
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {FlowNodeTypes, FlowNodeTypeNames} from '@/enum/useFlowEnum'
import {VueFlow, useVueFlow, MarkerType, Position, Handle} from '@vue-flow/core'
import {Background} from '@vue-flow/background'
import {Controls} from '@vue-flow/controls'
import {MiniMap} from '@vue-flow/minimap'

import {ElMessage} from 'element-plus'
import {useGuid, useLayout, useString} from '@/hooks'
import EdgeWithButton from './EdgeWithButton.vue'

const emits = defineEmits([
	'nodeClick',
	'nodeDblClick',
	'nodeMouseEnter',
	'nodeMouseLeave',
	'connect',
	'update:modelValue',
])
const props = defineProps({
	modelValue: {type: Object, default: () => ({})},
	snapToGrid: {type: Boolean, default: true},
	snapGrid: {type: Array, default: () => [200, 100]},
	elements: {type: Array, default: () => []},
	width: {type: [Number, String], default: ''},
	height: {type: [Number, String], default: ''},
	addNodeFitView: {type: Boolean, default: true},
	showButton: {
		type: String,
		default: `${FlowNodeTypes.Condition},${FlowNodeTypes.Report},${FlowNodeTypes.Review}`,
	},

	templateCode: {type: String, default: ''},
	getWorkflowByCode: {type: [Function, null], default: null},

	disabled: {type: Boolean, default: false},
	nodeInfoSize: {type: Array, default: () => ['20%', 'auto']},
	showNodeInfo: {type: Boolean, default: true},
})

const {toObject, addNodes, removeNodes, addEdges, removeEdges, findNode, findEdge, fitView} =
	useVueFlow()

const flowComponentRef = ref()
const flowInstance = ref(null)
const {graph, layout, previousDirection} = useLayout()
const nodeConfig = ref(props.templateCode ? {} : props.modelValue)
const completed = ref(false)

const endId = useGuid()
const nodeEnd = {
	id: endId,
	type: FlowNodeTypes.Output,
	label: '流程结束',
	position: {x: 0, y: 0},
	data: {depth: 0},
}

const nodes = ref([JSON.parse(JSON.stringify(nodeEnd))])
const edges = ref([])

const defaultNodeLabel = '点击配置'
const isMouseEnter = ref(false)
const nodeInfoWidth = computed(() => styleValueTypeVerify(props.nodeInfoSize[0]))
const nodeInfoHeight = computed(() => styleValueTypeVerify(props.nodeInfoSize[1]))
let nodeInfoEnterTimer = null
let nodeInfoLeaveTimer = null
let clickTimer = null
let clickDelay = 250

const styleValueTypeVerify = (value) => {
	const type = typeof value
	const isPercent = value.includes('%')
	const isPixel = value.includes('px')

	if (value === 'auto') {
		return value
	}

	switch (type) {
		case 'number':
			return `${value}px`
		case 'string':
			return isPercent || isPixel ? value : `${value}px`
	}
}

const setContainerSize = () => {
	const flow = flowComponentRef.value

	if (flow) {
		setTimeout(() => setOffsetHeight(flow), 200)
	}

	completed.value = true
}

const setOffsetHeight = (flow) => {
	const pw = props.width
	const ph = props.height

	if (props.height) {
		flow.style.height = typeof ph === 'number' ? ph + 'px' : ph
	} else {
		let parent = flow.parentElement
		while (parent && parent.tagName !== 'HTML' && !parent.classList.contains('container-body')) {
			if (parent.style.height) {
				break
			}
			parent = parent.parentElement
		}
		const cb = parent?.classList.contains('container-body')
		flow.style.height = `${parent.offsetHeight - (cb ? 40 : 30)}px`
	}

	if (props.width) {
		flow.style.width = typeof pw === 'number' ? pw + 'px' : props.width
	} else {
		flow.style.width = `100%`
	}

	setTimeout(() => {
		flowInstance.value?.fitView()
	}, 16.7)
}

const setDefalutNodes = () => {
	nodeConfigToFlow(nodeConfig.value)
	nextTick(() => {
		nodes.value.find((f) => f.type === FlowNodeTypes.Output).data.depth =
			Math.max(...nodes.value.map((m) => m.data.depth)) + 1

		nodes.value = layout(nodes.value, edges.value, 'TB', props.snapGrid)
	})
}

const nodeConfigToFlow = (node, parentNode, depth = 0) => {
	// 非网关节点
	if (!node) return
	if ([FlowNodeTypes.Input, FlowNodeTypes.Report, FlowNodeTypes.Review].includes(node.type)) {
		nodes.value.push({
			id: node.id,
			type: node.type,
			label: node.label,
			position: {x: 0, y: 0},
			data: {...node.data, depth},
		})
		parentNode &&
			edges.value.push({
				id: useGuid(),
				source: parentNode?.id,
				target: node.id,
				type: 'with-button',
				markerEnd: MarkerType.ArrowClosed,
			})
	}

	// 网关节点
	if ([FlowNodeTypes.Gateway].includes(node.type)) {
		nodes.value.push(
			...[
				{
					id: node.id,
					type: node.type,
					label: node.label,
					position: {x: 0, y: 0},
					data: {...node.data, depth},
				},
			]
		)

		parentNode &&
			edges.value.push(
				...[
					{
						id: useGuid(),
						source: parentNode?.id,
						target: node.id,
						type: 'with-button',
						markerEnd: MarkerType.ArrowClosed,
					},
				]
			)

		if (node.conditionNodes && node.conditionNodes.length > 0) {
			// 网关分支节点
			node.conditionNodes.forEach((condition, idx) => {
				nodes.value.push(
					...[
						{
							id: condition.id,
							type: condition.type,
							label: condition.label,
							position: {x: 0, y: 0},
							// data: {depth: depth + 1, canDelete: idx === 0},
							data: {...condition.data, depth: depth + 1, canDelete: true},
						},
					]
				)
				edges.value.push(
					...[
						{
							id: useGuid(),
							source: node.id,
							target: condition.id,
							type: 'with-button',
							markerEnd: MarkerType.ArrowClosed,
						},
					]
				)

				if (condition.childNode && condition.childNode.length > 0) {
					condition.childNode.forEach((child, idx) => {
						nodeConfigToFlow(child, condition, depth + 2)
					})
				} else {
					edges.value.push(
						...[
							{
								id: useGuid(),
								source: condition.id,
								target: endId,
								type: 'with-button',
								markerEnd: MarkerType.ArrowClosed,
							},
						]
					)
				}
			})
		}
	}

	if (node.childNode && node.childNode.length > 0) {
		node.childNode.forEach((child, idx) => {
			nodeConfigToFlow(child, node, depth + 1)
		})
	} else {
		if (node.type !== FlowNodeTypes.Gateway) {
			edges.value.push(
				...[
					{
						id: useGuid(),
						source: node.id,
						target: endId,
						type: 'with-button',
						markerEnd: MarkerType.ArrowClosed,
					},
				]
			)
		}
	}
}

const resetNode = async () => {
	edges.value = []
	nodes.value = [JSON.parse(JSON.stringify(nodeEnd))]
	nodeConfigToFlow(nodeConfig.value)
	await nextTick()

	nodes.value.find((f) => f.type === FlowNodeTypes.Output).data.depth =
		Math.max(...nodes.value.map((m) => m.data.depth)) + 1

	nodes.value = layout(nodes.value, edges.value, 'TB', props.snapGrid).sort(
		(a, b) => a.data.depth - b.data.depth
	)

	await nextTick()
	setTimeout(() => {
		if (props.addNodeFitView) {
			fitView()
		}
	}, 0)
	output()
}

const getNodeConfigById = (node, sourceId, parentNode = null, parentNodes = []) => {
	if (node.id === sourceId) {
		return {
			then: (callback) => {
				callback && callback(node, parentNode, parentNodes)
			},
		}
	}
	const currentParentNodes = [...parentNodes, node]

	const childNodes = [...(node.childNode || []), ...(node.conditionNodes || [])]
	for (const nextNode of childNodes) {
		if (nextNode) {
			const result = getNodeConfigById(nextNode, sourceId, node, currentParentNodes)
			if (result) return result
		}
	}
}

const init = () => {
	setTimeout(() => {
		completed.value = false
		setContainerSize()
		setDefalutNodes()
	}, 64)
}

const onAddConditionByGateway = (props) => {
	getNodeConfigById(nodeConfig.value, props.id).then((node) => {
		const conditionCount = toObject().nodes.filter((f) => f.type === FlowNodeTypes.Condition).length

		node.conditionNodes.push({
			id: useGuid(),
			type: FlowNodeTypes.Condition,
			label: `条件`, // ${conditionCount +1}
			childNode: [],
		})
		resetNode()
	})
}

const onAddCondition = (edgeProps) => {
	getNodeConfigById(nodeConfig.value, edgeProps.source).then((node) => {
		const conditionCount = toObject().nodes.filter((f) => f.type === FlowNodeTypes.Condition).length
		const newNode = {
			id: useGuid(),
			pid: node.id,
			type: FlowNodeTypes.Gateway,
			label: '排它网关',
			data: {},
			childNode: null,
			conditionNodes: [
				{
					id: useGuid(),
					type: FlowNodeTypes.Condition,
					label: `条件`, // ${conditionCount +1}
					childNode: node.childNode,
					data: {},
				},
				{
					id: useGuid(),
					type: FlowNodeTypes.Condition,
					label: `条件`, // ${conditionCount +2}
					childNode: [],
					data: {},
				},
			],
		}
		node.childNode = [newNode]
		resetNode()
	})
}

const onAddNodeDefault = (type, edgeProps) => {
	getNodeConfigById(nodeConfig.value, edgeProps.source).then((node) => {
		const nodeTypeCount = toObject().nodes.filter((f) => f.type === type).length

		const newNode = {
			id: useGuid(),
			type: type,
			label: `${FlowNodeTypeNames[type]}`, // ${nodeTypeCount +1}
			childNode: node.childNode && node.childNode.length > 0 ? node.childNode : null,
			data: {},
		}

		node.childNode = [newNode]
		resetNode()
	})
}

const onAddNode = (type, edgeProps) => {
	if (type === FlowNodeTypes.Condition) {
		onAddCondition(edgeProps)
	} else {
		onAddNodeDefault(type, edgeProps)
	}
}

const onEdgeCreated = (info) => {
	if (info.source === FlowNodeTypes.Start) {
		ElMessage.warning('不允许从开始节点创建连线')
		return
	}

	const edge = {
		id: useGuid(),
		source: info.source,
		target: info.target,
		type: 'with-button',
		markerEnd: MarkerType.ArrowClosed,
		animated: true,
	}
	addEdges([edge])
	console.log('Flow edge created: ', info, edge)
}

const onNodeClick = (info) => {
	if (props.disabled) return

	if (clickTimer !== null) {
		clearTimeout(clickTimer)
		clickTimer = null

		// info.event.target.closest('.flow-title') ||
		const el = info.event.target.closest('.flow-setting')
		if (el && !el.getAttribute('contenteditable')) {
			onDblClickNode(info)
		}
	} else {
		clickTimer = setTimeout(() => {
			console.log('Flow node click: ', info)
			clickTimer = null
			emits('nodeClick', info)
		}, clickDelay)
	}
}

const onDblClickNode = (info) => {
	console.log('Flow node dbl click: ', info)
	if (props.disabled) return
	setCaretAt(info.node, info.event.target)
	emits('nodeDblClick', info)
}

const onNodeMouseEnter = (event) => {
	if (
		event.node.type === FlowNodeTypes.Input ||
		event.node.type === FlowNodeTypes.Output ||
		event.node.type === FlowNodeTypes.Gateway
	)
		return
	clearTimeout(nodeInfoLeaveTimer)
	nodeInfoEnterTimer = setTimeout(() => {
		console.log('Flow node mouse enter: ', event)
		isMouseEnter.value = true
		getNodeConfigById(nodeConfig.value, event.node.id).then((currentNode) => {
			emits('nodeMouseEnter', event, currentNode)
		})
	}, clickDelay)
}

const onNodeMouseLeave = (event) => {
	if (event.node.type === FlowNodeTypes.Input || event.node.type === FlowNodeTypes.Output) return

	clearTimeout(nodeInfoEnterTimer)
	nodeInfoLeaveTimer = setTimeout(() => {
		console.log('Flow node mouse leave: ', event)
		isMouseEnter.value = false
		getNodeConfigById(nodeConfig.value, event.node.id).then((currentNode) => {
			emits('nodeMouseLeave', event, currentNode)
		})
	}, clickDelay)
}

const onRemoveNode = (id, node) => {
	getNodeConfigById(nodeConfig.value, id).then((curNode, curParentNode) => {
		if (!curNode.childNode || curNode.childNode?.length === 0) {
			console.log('Remove Node:', id, node, curNode, curParentNode)

			if (curNode.type === FlowNodeTypes.Condition) {
				// 当前 curParentNode 是网关节点
				if (curParentNode.conditionNodes.length > 2) {
					curParentNode.conditionNodes = curParentNode.conditionNodes.filter((f) => f.id !== id)
					resetNode()
				} else {
					getNodeConfigById(nodeConfig.value, curParentNode.pid).then((gatewayParentNode) => {
						const firstConditionChildNode = curParentNode.conditionNodes[0].childNode

						gatewayParentNode.childNode = gatewayParentNode.childNode.filter(
							(f) => f.id !== curParentNode.id
						)

						if (firstConditionChildNode) {
							gatewayParentNode.childNode =
								gatewayParentNode.childNode.concat(firstConditionChildNode)
						}
						resetNode()
					})
				}
			} else {
				curParentNode.childNode = curParentNode.childNode.filter((f) => f.id !== id)
				resetNode()
			}
		} else {
			ElMessage.warning('请先删除子节点')
		}
	})
}

const setCaretAt = (node, element, position = 'end') => {
	const range = document.createRange()
	const selection = window.getSelection()

	element.setAttribute('contenteditable', true)
	switch (position) {
		case 'start':
			range.selectNodeContents(element)
			range.collapse(true)
			break
		case 'end':
			range.selectNodeContents(element)
			range.collapse(false)
			break
		default:
	}

	selection.removeAllRanges()
	selection.addRange(range)

	const blur = () => {
		clickTimer = null
		let str = element.innerText.replace(/\s/g, '')

		if (useString.getStringLength(str) === 0) {
			ElMessage.warning('请输入标签')
			element.focus()
			return
		} else if (useString.getStringLength(str) > 20) {
			ElMessage.warning('最大长度限制中文10个, 英文20个, 总体不超过20个字符')
			str = useString.setSubstring(str, 20)
		}

		node.data.label = str
		element.innerText = str
		element.removeAttribute('contenteditable')
		element.removeEventListener('blur', blur)

		getNodeConfigById(nodeConfig.value, node.id).then((curNode, parentNode, parentNodes) => {
			Object.assign(curNode, {data: {label: str}})
		})
	}

	element.addEventListener('blur', blur)
	element.focus()
}

const onPaneReady = (vueFLowInstance) => {
	flowInstance.value = vueFLowInstance
}

const output = () => {
	nextTick(() => {
		console.log('Flow output: ', nodeConfig.value)
		emits('update:modelValue', nodeConfig.value)
	})
}

watch(
	() => props.modelValue,
	(val) => {
		console.log('Flow modelValue changed: ', val)

		if (JSON.stringify(val) !== JSON.stringify(nodeConfig.value) && !props.templateCode) {
			console.log('Flow modelValue changed: ', val)
			nodes.value = [JSON.parse(JSON.stringify(nodeEnd))]
			edges.value = []
			nodeConfig.value = val
			init()
		}
	},
	{immediate: true}
)

watch(
	() => [props.width, props.height],
	() => {
		setContainerSize()
	}
)

watch(
	() => props.templateCode,
	(val) => {
		console.log('Flow template Code changed: ', val)
		if (val && props.getWorkflowByCode && typeof props.getWorkflowByCode === 'function') {
			props.getWorkflowByCode(val).then((res) => {
				const {extend} = res.data.scheme
				if (extend) {
					nodes.value = [JSON.parse(JSON.stringify(nodeEnd))]
					edges.value = []
					nodeConfig.value = JSON.parse(extend)
					init()
				}
			})
		}
	},
	{immediate: true}
)

onMounted(() => {
	init()
})

defineExpose({
	getInstance: () => flowInstance.value,
	getNodeConfig: () => nodeConfig.value,
	getNodeBeforeById: (id) => getNodeConfigById(nodeConfig.value, id),
	getWorkflowEndNode: () => findNode(endId),
})
</script>
<template>
	<div ref="flowComponentRef" class="flow-component" v-resize="setContainerSize">
		<div v-if="showNodeInfo" class="node-info" :class="{on: isMouseEnter}">
			<div class="node-info-box">
				<slot name="node-info">节点信息</slot>
			</div>
		</div>
		<VueFlow
			v-if="completed"
			:nodes="nodes"
			:edges="edges"
			:nodes-draggable="false"
			:snap-to-grid="snapToGrid"
			:snap-grid="snapGrid"
			@node-click="onNodeClick"
			@node-mouse-enter="onNodeMouseEnter"
			@node-mouse-leave="onNodeMouseLeave"
			@connect="onEdgeCreated"
			@pane-ready="onPaneReady"
			fit-view-on-init
			class="flow-component-view"
		>
			<Background
				patternColor="#888"
				style="background-color: rgba(var(--z-bg-secondary-rgb), 0.3)"
			/>
			<Controls :showInteractive="false" />
			<MiniMap />

			<!-- 开始 -->
			<template #[`node-${FlowNodeTypes.Input}`]="props">
				<slot :name="`node-${FlowNodeTypes.Input}`" :props="props">
					<div>
						<div class="flow-title input">
							<span>{{ props.label ?? '-' }}</span>
						</div>
					</div>
				</slot>
				<Handle type="source" :position="Position.Bottom" />
			</template>

			<!-- 网关 -->
			<template #[`node-${FlowNodeTypes.Gateway}`]="props">
				<slot :name="`node-${FlowNodeTypes.Gateway}`" :props="props">
					<div class="vue-flow__node-default addCondition">
						<el-button
							v-if="!props.data.isEndGateway && !disabled"
							@click.stop="onAddConditionByGateway(props)"
						>
							添加条件
						</el-button>
						<span v-else>条件分支</span>
					</div>
				</slot>
			</template>

			<!-- 条件 -->
			<template #[`node-${FlowNodeTypes.Condition}`]="props">
				<Handle type="target" :position="Position.Top" />
				<slot :name="`node-${FlowNodeTypes.Condition}`" :props="props">
					<div class="vue-flow__node-default condition">
						<div class="flow-title condition">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 45 45">
								<g id="分支条件" transform="translate(-1244 -572)">
									<g id="组_17" data-name="组 17">
										<circle
											id="椭圆_42"
											data-name="椭圆 42"
											cx="22.5"
											cy="22.5"
											r="22.5"
											transform="translate(1244 572)"
											fill="#52c1f5"
										/>
										<g id="组_10" data-name="组 10" transform="translate(1013.946 504.588)">
											<path
												id="路径_24"
												data-name="路径 24"
												d="M738.987,785.844a2.484,2.484,0,1,0,2.484-2.484A2.491,2.491,0,0,0,738.987,785.844Z"
												transform="translate(-480.526 -687.648)"
												fill="#fff"
											/>
											<path
												id="路径_25"
												data-name="路径 25"
												d="M716.616,764.219a3.229,3.229,0,1,1,3.229-3.229A3.223,3.223,0,0,1,716.616,764.219Zm0-4.968a1.739,1.739,0,1,0,1.739,1.739A1.76,1.76,0,0,0,716.616,759.251Z"
												transform="translate(-455.671 -662.795)"
												fill="#fff"
											/>
											<path
												id="路径_26"
												data-name="路径 26"
												d="M269.653,785.844a2.484,2.484,0,1,0,2.484-2.484A2.491,2.491,0,0,0,269.653,785.844Z"
												transform="translate(-24.854 -687.648)"
												fill="#fff"
											/>
											<path
												id="路径_27"
												data-name="路径 27"
												d="M247.283,764.219a3.229,3.229,0,1,1,3.229-3.229A3.223,3.223,0,0,1,247.283,764.219Zm0-4.968a1.739,1.739,0,1,0,1.739,1.739A1.76,1.76,0,0,0,247.283,759.251Z"
												transform="translate(0 -662.795)"
												fill="#fff"
											/>
											<path
												id="路径_28"
												data-name="路径 28"
												d="M269.653,103.178a2.484,2.484,0,1,0,2.484-2.484A2.491,2.491,0,0,0,269.653,103.178Z"
												transform="translate(-24.854 -24.854)"
												fill="#fff"
											/>
											<path
												id="路径_29"
												data-name="路径 29"
												d="M247.283,81.552a3.229,3.229,0,1,1,3.229-3.229A3.223,3.223,0,0,1,247.283,81.552Zm0-4.968a1.739,1.739,0,1,0,1.739,1.739A1.76,1.76,0,0,0,247.283,76.584Z"
												transform="translate(0)"
												fill="#fff"
											/>
											<path
												id="路径_30"
												data-name="路径 30"
												d="M343.794,263.812a.764.764,0,0,1-.745-.745v-2.484c0-1.987-3.229-3.329-6.359-4.571a21.99,21.99,0,0,1-5.813-3.031v10.135a.745.745,0,0,1-1.49,0v-14.9a.745.745,0,1,1,1.49,0v1.838c0,1.987,3.229,3.329,6.359,4.571,3.577,1.49,7.3,2.981,7.3,5.962v2.484A.764.764,0,0,1,343.794,263.812Z"
												transform="translate(-82.849 -167.355)"
												fill="#fff"
											/>
										</g>
									</g>
								</g>
							</svg>
							<span>{{ props.label ?? '-' }}</span>
							<i
								v-if="props.data.canDelete && !disabled"
								class="icon i-ic-twotone-close close-node"
								@click.stop="onRemoveNode(props.id, props)"
							></i>
						</div>
						<div class="flow-setting">
							{{ props?.data?.label || disabled ? '' : defaultNodeLabel }}
						</div>
					</div>
				</slot>
				<Handle type="source" :position="Position.Bottom" />
			</template>

			<!-- 填报 -->
			<template #[`node-${FlowNodeTypes.Report}`]="props">
				<Handle type="target" :position="Position.Top" />
				<slot :name="`node-${FlowNodeTypes.Report}`" :props="props">
					<div class="vue-flow__node-default">
						<div class="flow-title report">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 45 45">
								<g id="填报人" transform="translate(-1311 -631)">
									<circle
										id="椭圆_40"
										data-name="椭圆 40"
										cx="22.5"
										cy="22.5"
										r="22.5"
										transform="translate(1311 631)"
										fill="#1890ff"
									/>
									<path
										id="路径_33"
										data-name="路径 33"
										d="M14.463,18.338v-.483a.519.519,0,0,1,.483-.483H21.34l.241-.241,3.378-3.378H14.825a.519.519,0,0,1-.483-.483v-.483a.519.519,0,0,1,.483-.483H26.286L30.75,7.963V.845A.825.825,0,0,0,29.906,0H17.117L11.326.121A.9.9,0,0,0,10.24.965V23.044c0,.483.483.965.845.845h6.877l1.448-4.223v-.121c0-.121.121-.724.121-.845H14.825a.32.32,0,0,1-.362-.362Zm0-10.979a.519.519,0,0,1,.483-.483H26.769a.519.519,0,0,1,.483.483v.483a.519.519,0,0,1-.483.483H14.825a.519.519,0,0,1-.483-.483V7.36Zm19.183,5.309-2.051-2.051a.935.935,0,0,0-1.206.121L29.3,11.823l3.137,3.016,1.086-1.086a.763.763,0,0,0,.121-1.086Zm-10.979,5.67-1.448,1.327c-.121,0-.121.121-.121.241v.121l-1.327,3.861c-.121.121,0,.241.121.241h.362l3.861-1.206h.121a.421.421,0,0,0,.241-.121l7.48-7.239L28.82,12.547c0-.121-6.153,5.791-6.153,5.791Z"
										transform="translate(1313.01 642)"
										fill="#fff"
									/>
								</g>
							</svg>
							<span>{{ props.label ?? '-' }}</span>
							<i
								v-if="!disabled"
								class="icon i-ic-twotone-close close-node"
								@click.stop="onRemoveNode(props.id, props)"
							></i>
						</div>
						<div class="flow-setting">
							{{ props?.data?.label || disabled ? '' : defaultNodeLabel }}
						</div>
					</div>
				</slot>
				<Handle type="source" :position="Position.Bottom" />
			</template>

			<!-- 审核 -->
			<template #[`node-${FlowNodeTypes.Review}`]="props">
				<Handle type="target" :position="Position.Top" />
				<slot :name="`node-${FlowNodeTypes.Review}`" :props="props">
					<div class="vue-flow__node-default">
						<div class="flow-title review">
							<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 45 45">
								<g id="审核人" transform="translate(-1311 -572)">
									<circle
										id="椭圆_39"
										data-name="椭圆 39"
										cx="22.5"
										cy="22.5"
										r="22.5"
										transform="translate(1311 572)"
										fill="#ff943e"
									/>
									<path
										id="路径_31"
										data-name="路径 31"
										d="M15.365,28.14H33.318c.583-.058.525.117.525-.525V26.158c0-.816-.175-.991-.991-.991h-3.5a2.586,2.586,0,0,1-.641-.933c-2.04-2.273-.874-3.789.408-5.887a5.283,5.283,0,0,0,.641-.933,6.327,6.327,0,0,0,.816-3.148,6.587,6.587,0,0,0-13.174,0,6.476,6.476,0,0,0,1.4,4.022c1.4,2.215,3.672,4.022,0,6.878h-3.5a.892.892,0,0,0-.991.991v1.516c0,.583.408.466,1.049.466Zm19.469.991H13.325a.522.522,0,0,0-.525.525v.525a.522.522,0,0,0,.525.525H34.775a.522.522,0,0,0,.525-.525v-.525A.514.514,0,0,0,34.834,29.131Z"
										transform="translate(1309.45 575.308)"
										fill="#fff"
									/>
								</g>
							</svg>
							<span>{{ props.label ?? '-' }}</span>
							<i
								v-if="!disabled"
								class="icon i-ic-twotone-close close-node"
								@click.stop="onRemoveNode(props.id, props)"
							></i>
						</div>
						<div class="flow-setting">
							{{ props?.data?.label || disabled ? '' : defaultNodeLabel }}
						</div>
					</div>
				</slot>
				<Handle type="source" :position="Position.Bottom" />
			</template>

			<!-- 结束 -->
			<template #[`node-${FlowNodeTypes.Output}`]="props">
				<Handle type="target" :position="Position.Top" />
				<slot :name="`node-${FlowNodeTypes.Output}`" :props="props">
					<div>
						<div class="flow-title output">
							<span>{{ props.label ?? '-' }}</span>
						</div>
					</div>
				</slot>
			</template>

			<template #edge-with-button="edgeProps">
				<slot name="edge-with-button" :edgeProps="edgeProps">
					<EdgeWithButton
						:id="edgeProps.id"
						:source="edgeProps.sourceNode"
						:target="edgeProps.targetNode"
						:source-x="edgeProps.sourceX"
						:source-y="edgeProps.sourceY"
						:target-x="edgeProps.targetX"
						:target-y="edgeProps.targetY"
						:source-position="edgeProps.sourcePosition"
						:target-position="edgeProps.targetPosition"
						:marker-end="edgeProps.markerEnd"
						:style="edgeProps.style"
						:showButton="showButton"
						:disabled="disabled"
						:snapGrid="snapGrid"
						@add-node="onAddNode($event, edgeProps)"
						@remove-edge="removeEdges(edgeProps.id)"
					/>
				</slot>
			</template>
		</VueFlow>
	</div>
</template>
<style scoped lang="scss">
.flow-component {
	border-radius: torem(5px);
	border: 1px solid var(--z-line);
	height: 100%;
	position: relative;
	width: 100%;

	.node-info {
		border: 1px solid var(--z-line);
		background-color: var(--z-theme);
		border-radius: torem(5px);
		opacity: 0;
		padding: 0;
		position: absolute;
		top: torem(10px);
		right: torem(10px);
		transition: all 0.15s linear;
		width: 0;
		z-index: 1;

		&.on {
			height: v-bind(nodeInfoHeight);
			opacity: 1;
			padding: torem(10px);
			width: v-bind(nodeInfoWidth);
		}
	}

	.flow-title {
		border-radius: 5px 5px 0 0;
		box-shadow: none;
		align-items: center;
		background: #7a939d;
		color: #fff;
		display: flex;
		height: 30px;
		justify-content: center;
		line-height: 30px;
		padding: 0 5px;

		i {
			font-size: 13px;
			line-height: 1;
		}

		span {
			flex: 1;
			text-align: left;
			padding: 0 5px;
		}

		&.review {
			background: #fe933e;
		}

		&.report {
			background: #1890ff;
		}

		&.condition {
			background: #52c1f5;
		}

		&.input,
		&.output {
			border-radius: 100px;
			background: var(--z-theme);
			color: var(--z-font-color);
			span {
				flex: none;
			}
		}
	}

	.flow-setting {
		border-radius: 0 0 5px 5px;
		background: var(--z-theme);
		color: var(--z-font-color);
		height: 40px;
		line-height: 40px;
	}

	.addCondition {
		border: none;
		background-color: transparent !important;
		box-shadow: none !important;
		span,
		button {
			border: none;
			border-radius: 50px;
			background: var(--z-theme);
			box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
			margin: 3px 0;
			transition: all 0.15s linear;
			&:hover {
				background: var(--z-bg-secondary);
			}
		}
		span {
			padding: 0 15px;
		}
	}

	.close-node {
		cursor: pointer;
		margin-right: 0;
		transition: all 0.15s linear;
		&:hover {
			transform: rotate(90deg);
		}
	}

	:deep(.vue-flow__node-input),
	:deep(.vue-flow__node-output) {
		border-radius: 100px;
	}

	:deep(.vue-flow__node-default),
	:deep(.vue-flow__node-input),
	:deep(.vue-flow__node-output) {
		background-color: var(--z-theme);
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
		border: none;
		padding: 0;
		// transition: all 0.15s linear;
	}

	:deep(.vue-flow__edge-labels) {
		position: relative;
		z-index: 9999;
	}
}
</style>
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';

.flow-component-view.dark {
	background: #000000;
	color: #fffffb;
}
.flow-component-view.dark .vue-flow__node {
	background: hsl(0, 0%, 10%);
	color: #fffffb;
}
.flow-component-view.dark .vue-flow__node.selected {
	background: hsl(0, 0%, 20%);
	border: 1px solid hotpink;
}
.flow-component-view .vue-flow__controls {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
}
.flow-component-view.dark .vue-flow__controls {
	border: 1px solid #fffffb;
}
.flow-component-view .vue-flow__controls .vue-flow__controls-button {
	border: none;
	border-right: 1px solid #eee;
}
.flow-component-view.dark .vue-flow__controls .vue-flow__controls-button {
	background: hsl(0, 0%, 20%);
	fill: #fffffb;
	border: none;
}
.flow-component-view.dark .vue-flow__controls .vue-flow__controls-button:hover {
	background: hsl(0, 0%, 30%);
}
.flow-component-view.dark .vue-flow__edge-textbg {
	fill: #292524;
}
.flow-component-view.dark .vue-flow__edge-text {
	fill: #fffffb;
}
</style>
