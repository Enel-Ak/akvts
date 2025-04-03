<script setup>
import {ref, computed} from 'vue'
import {
	BaseEdge,
	SmoothStepEdge,
	EdgeLabelRenderer,
	getBezierPath,
	getSmoothStepPath,
} from '@vue-flow/core'
import {FlowNodeTypes} from '@/enum/useFlowEnum'
import CustomEdge from './CustomEdge.vue'

const emits = defineEmits(['addNode', 'removeEdge'])

const props = defineProps({
	id: String,
	source: Object,
	target: Object,
	sourceX: Number,
	sourceY: Number,
	targetX: Number,
	targetY: Number,
	centerX: Number,
	centerY: Number,
	sourcePosition: String,
	targetPosition: String,
	markerEnd: String,
	style: Object,
	edge: Object,
	showButton: String,
	disabled: Boolean,
	snapGrid: Array,
})

const path = computed(() => getSmoothStepPath(props))
const show = ref(false)
let showTimer = null

const resetLabelZIndex = (arr, target) => {
	arr.forEach((label) => {
		label.style.zIndex = label === target ? 2 : 1
	})
}

const onMouseEnter = (event) => {
	showTimer = setTimeout(() => {
		show.value = true
		const labels = Array.from(event.target.parentNode.children)
		resetLabelZIndex(labels, event.target)
	}, 250)
}

const onMouseLeave = () => {
	clearTimeout(showTimer)
	show.value = false
}

const handleAddNode = (str) => {
	onMouseLeave()
	emits('addNode', str)
}
</script>

<template>
	<!-- <BaseEdge :id="id" :style="style" :path="path[0]" :marker-end="markerEnd" /> -->

	<CustomEdge
		:id="id"
		:source="source"
		:target="target"
		:source-x="sourceX"
		:source-y="sourceY"
		:target-x="targetX"
		:target-y="targetY"
		:source-position="sourcePosition"
		:target-position="targetPosition"
		:snapGrid="snapGrid"
	></CustomEdge>
	<EdgeLabelRenderer v-if="!disabled">
		<div
			v-if="target.type !== FlowNodeTypes.Condition"
			:style="{
				transform: `translate(-50%, -50%) translate(${sourceX}px,${path[2] - 10}px)`,
			}"
			class="nodrag nopan renderer"
			@mouseenter="onMouseEnter"
			@mouseleave="onMouseLeave"
		>
			<div class="add-nodes">
				<Icons name="Create" color="var(--z-font-color)"></Icons>
			</div>

			<div class="settings shadow-4" v-if="show">
				<div class="title">添加流程节点</div>
				<div
					v-if="showButton?.includes(FlowNodeTypes.Condition)"
					class="btn condition"
					@click="handleAddNode(FlowNodeTypes.Condition)"
				>
					<span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="45"
							height="45"
							viewBox="0 0 45 45"
						>
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
									<g
										id="组_10"
										data-name="组 10"
										transform="translate(1013.946 504.588)"
									>
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
					</span>
					条件分支
				</div>
				<div
					v-if="showButton?.includes(FlowNodeTypes.Review)"
					class="btn review"
					@click="handleAddNode(FlowNodeTypes.Review)"
				>
					<span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="45"
							height="45"
							viewBox="0 0 45 45"
						>
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
					</span>
					审核
				</div>
				<div
					v-if="showButton?.includes(FlowNodeTypes.Report)"
					class="btn report"
					@click="handleAddNode(FlowNodeTypes.Report)"
				>
					<span>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="45"
							height="45"
							viewBox="0 0 45 45"
						>
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
					</span>
					填报
				</div>
				<div class="des-node">
					<span>{{ source.label }}</span>
					<i class="icon i-ic-baseline-keyboard-double-arrow-right"></i>
					<span>{{ target.label }}</span>
				</div>
			</div>
		</div>
	</EdgeLabelRenderer>
</template>
<style scoped lang="scss">
@keyframes SettingShow {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}
.renderer {
	display: flex;
	pointer-events: all;
	position: absolute;
	padding: 5px;

	.icon {
		font-size: 26px;
		margin: 0;
	}

	.settings {
		background-color: var(--z-theme);
		border-radius: 5px;
		cursor: pointer;
		display: flex;
		flex-wrap: wrap;
		opacity: 0;
		overflow: hidden;
		padding: 5px;
		position: absolute;
		top: 100%;
		transition: all 0.15s linear;
		width: 250px;
		z-index: 2;
		animation: SettingShow 0.15s linear forwards;

		.title {
			color: var(--z-font-color);
			display: none;
			font-size: 12px;
			padding: 0 0 5px 0;
			width: 100%;
		}
	}

	.des-node {
		align-items: center;
		border-top: 1px solid var(--z-line);
		display: flex;
		flex-wrap: wrap;
		margin-top: torem(5px);
		opacity: 0.8;
		padding: torem(5px) 0 0 0;
		width: 100%;
		span {
			flex: 1;
			font-size: 13px;
			transform: scale(0.9);
			white-space: nowrap;
			&:nth-child(3) {
				text-align: right;
			}
		}
		i {
			font-size: torem(16px);
		}
	}

	.add-nodes {
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
		border-radius: 100%;
		background-color: var(--z-theme);
		i {
			color: var(--z-nav-hover);
		}
	}

	.btn {
		align-items: center;
		border: 1px solid transparent;
		border-radius: 2px;
		background-color: rgba(var(--z-bg-secondary-rgb), 0.3);
		display: flex;
		font-size: 12px;
		padding: 5px 10px;
		margin-right: 5px;
		margin-bottom: 5px;
		transition: all 0.15s linear;
		width: calc(50% - 2.5px);

		&:nth-child(3n) {
			margin-right: 0;
		}

		&:hover {
			border: 1px solid rgba(var(--z-main-rgb), 0.1);
			background-color: var(--z-bg-secondary);
			color: var(--z-font-color);
		}

		i {
			color: var(--z-nav-hover);
			font-size: 16px;
			margin-right: 10px;
		}

		&.review,
		&.condition,
		&.report {
			span {
				align-items: center;
				border-radius: 100%;
				display: flex;
				justify-content: center;
				margin-right: 10px;
				height: 28px;
				width: 28px;
			}
			i {
				color: #fff;
				margin-right: 0;
			}
		}

		&.review {
			span {
				background-color: #fe933e;
			}
		}

		&.condition {
			span {
				background-color: #52c1f5;
			}
		}

		&.report {
			span {
				background-color: #1890ff;
			}
		}
	}
}
</style>
