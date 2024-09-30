import {Position, useVueFlow} from '@vue-flow/core'
import dagre from '@dagrejs/dagre'
import {ref} from 'vue'

export default function useLayout() {
	const {findNode} = useVueFlow()

	const graph = ref(new dagre.graphlib.Graph())

	const previousDirection = ref('LR')

	function layout(nodes, edges, direction, snapGrid) {
		const dagreGraph = new dagre.graphlib.Graph()

		graph.value = dagreGraph

		dagreGraph.setDefaultEdgeLabel(() => ({}))

		const isHorizontal = direction === 'LR'
		dagreGraph.setGraph({rankdir: direction})

		previousDirection.value = direction

		for (const node of nodes) {
			const graphNode = findNode(node.id)
			dagreGraph.setNode(node.id, {
				width: snapGrid[0],
				height: snapGrid[1],
			})
		}

		for (const edge of edges) {
			dagreGraph.setEdge(edge.source, edge.target)
		}

		dagre.layout(dagreGraph)

		return nodes
			.sort((a, b) => a.data.depth - b.data.depth)
			.map((node, index) => {
				const nodeWithPosition = dagreGraph.node(node.id)

				const data = {
					...node,
					targetPosition: isHorizontal ? Position.Left : Position.Top,
					sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
					// position: {x: nodeWithPosition.x, y: nodeWithPosition.y},
					position: {x: nodeWithPosition.x, y: node.data.depth * 150},
				}
				return data
			})
	}

	return {graph, layout, previousDirection}
}
