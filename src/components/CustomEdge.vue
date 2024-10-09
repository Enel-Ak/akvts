<script setup>
import {computed} from 'vue'
import {FlowNodeTypes} from '@/enum/useFlowEnum'

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
	edge: Object,
	radius: {
		type: Number,
		default: 5,
	},
	offset: {
		type: Number,
		default: 20,
	},
	snapGrid: Array,
})

// const path = computed(() => {
// 	const {source, target, sourceX, sourceY, targetX, targetY, offset, radius} = props
// 	// 计算路径是否为水平或垂直直线
// 	const isHorizontalStraightLine = sourceY === targetY
// 	const isVerticalStraightLine = sourceX === targetX
// 	const left = targetX > 0 ? targetX > sourceX : targetX < sourceX

// 	if (isHorizontalStraightLine || isVerticalStraightLine || target.type === FlowNodeTypes.Gateway) {
// 		// 如果是直线，直接返回直线路径
// 		return `M${sourceX},${sourceY} L${targetX},${targetY}`
// 	}

// 	return `
// 	  M${sourceX},${sourceY}
// 	  L${sourceX},${targetY - offset - radius}
//     Q${sourceX},${targetY - offset},${sourceX + (left ? radius : -radius)},${targetY - offset}
// 	  L${targetX + (left ? -radius : radius)},${targetY - offset}
//     Q${targetX},${targetY - offset}, ${targetX},${targetY - offset + radius}
//     L${targetX},${targetY}
// 	`
// })

const path = computed(() => {
	const {target, source, offset, radius} = props
	const targetPosition = target.position
	const sourcePosition = source.position

	const sx = sourcePosition.x + props.snapGrid[0] / 2.663
	const sy = sourcePosition.y
	const tx = targetPosition.x + props.snapGrid[0] / 2.663
	const ty = targetPosition.y

	// 计算路径是否为水平或垂直直线
	const isHorizontalStraightLine = sy === ty
	const isVerticalStraightLine = sx === tx
	const left = tx > 0 ? tx > sx : tx < sx

	if (isHorizontalStraightLine || isVerticalStraightLine || target.type === FlowNodeTypes.Gateway) {
		// 如果是直线，直接返回直线路径
		return `M${sx},${sy} L${tx},${ty}`
	}

	return `
	  M${sx},${sy}
	  L${sx},${ty - offset - radius}
    Q${sx},${ty - offset},${sx + (left ? radius : -radius)},${ty - offset}
	  L${tx + (left ? -radius : radius)},${ty - offset}
    Q${tx},${ty - offset}, ${tx},${ty - offset + radius}
    L${tx},${ty}
	`
})
</script>
<template>
	<defs>
		<marker id="arrowhead" markerWidth="5" markerHeight="3" refX="3.5" refY="1.5" orient="auto">
			<polygon points="0 0, 3 1.5, 0 3" />
		</marker>
	</defs>
	<path :d="path" class="path" />
</template>
<style lang="scss" scoped>
#arrowhead {
	fill: var(--z-font-color);
}
.path {
	fill: none;
	stroke: var(--z-line);
	stroke-width: 2;
	marker-end: url(#arrowhead);
}
</style>
