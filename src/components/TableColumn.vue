<script setup>
const props = defineProps({
	col: {},
	customSlots: {
		type: Array,
		default: () => [],
	},
	enableRowEdit: {
		type: Boolean,
		default: false,
	},
})

const customSlots = props.customSlots
const col = props.col
</script>
<template>
	<el-table-column
		v-if="!col.children"
		:prop="col.prop"
		:label="col.label"
		:align="col.align || 'left'"
		:fixed="col.fixed"
		:width="col.width || 'auto'"
		:sortable="col.sortable"
		:type="col.expand ? 'expand' : 'default'"
		:show-overflow-tooltip="!enableRowEdit"
		max-width="120"
		ellipsis
	>
		<template #header>
			<slot :name="'header-' + col.prop" :row="col">
				<template v-if="col.tooltip">
					<el-tooltip :content="col.label" placement="top">
						<div>{{ col.label }}</div>
					</el-tooltip>
				</template>
				<div v-else>{{ col.label }}</div>
			</slot>
		</template>
		<template #default="scope">
			<slot :name="col.prop" :row="scope.row" :index="scope.$index">
				{{ scope.row[col.prop] || '-' }}
			</slot>
		</template>
	</el-table-column>

	<el-table-column
		v-else
		:prop="col.prop"
		:label="col.label"
		:align="col.align || 'center'"
		:fixed="col.fixed"
		:width="col.width || 'auto'"
		:sortable="col.sortable"
		:type="col.expand ? 'expand' : 'default'"
		:show-overflow-tooltip="!enableRowEdit"
		min-width="120"
		ellipsis
	>
		<TableColumn v-for="t in col.children" :key="t.label" :col="t" :customSlots="customSlots">
			<template v-for="slot in customSlots" #[slot]="scope">
				<slot :name="slot" v-bind="scope" />
			</template>
		</TableColumn>
	</el-table-column>
</template>
