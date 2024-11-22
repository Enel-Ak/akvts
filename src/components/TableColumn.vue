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
		v-bind="col.attrs"
		:prop="col.prop"
		:label="col.label"
		:align="col.attrs?.align || col.align || 'left'"
		:fixed="col.attrs?.fixed || col.fixed"
		:width="col.attrs?.width || col.width || 'auto'"
		:sortable="col.attrs?.sortable || col.sortable"
		:type="col.attrs?.expand || col.expand ? 'expand' : 'default'"
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
				{{
					typeof scope.row[col.prop] === 'number'
						? typeof scope.row[col.prop]
						: typeof scope.row[col.prop] || '-'
				}}
			</slot>
		</template>
	</el-table-column>

	<el-table-column
		v-else
		v-bind="col.attrs"
		:prop="col.prop"
		:label="col.label"
		:align="col.attrs?.align || col.align || 'center'"
		:fixed="col.attrs?.fixed || col.fixed"
		:width="col.attrs?.width || col.width || 'auto'"
		:sortable="col.attrs?.sortable || col.sortable"
		:type="col.attrs?.expand || col.expand ? 'expand' : 'default'"
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
