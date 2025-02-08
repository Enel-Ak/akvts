<script setup>
import {onMounted, ref, provide, inject, computed, watch} from 'vue'
import {deleteLabel} from '../hooks/useLabels'
import useGuid from '@/hooks/useGuid'
import {useKeepAlive} from '@/store/useKeepAlive'

const keepAlive = useKeepAlive()
const includeKeepAlive = ref([])
const excludeKeepAlive = ref([])
const containerExpand = ref(true)
const hid = ref(useGuid())
const pid = ref(useGuid())
const did = ref(useGuid())
const nav = [
	{id: 'a', icon: 'Home', label: '首页', path: '/', sort: 1},
	// {id: 'c', icon: 'Setting', label: '设置', path: '/Block', sort: 2},
	{
		id: 'b',
		icon: 'Notifications',
		label: '通知',
		path: '',
		sort: 3,
		children: [
			{id: 'bb', label: '工作通知', path: '/Grid', sort: 1, pid: 'b'},
			{id: 'bbb', label: '代办通知', path: '/Block', sort: 2, pid: 'b'},
			{id: 'bbbb', label: '消息通知', path: '/Flow', sort: 3, pid: 'b'},
			{id: 'bbbbb', label: 'AirSheet', path: '/AirSheet', sort: 3, pid: 'b'},
		],
	},
]

const labelsRef = ref()
const currentItemId = ref('')
const parentId = ref('')

watch(
	() => keepAlive.getInclude,
	(val) => {
		includeKeepAlive.value = val
	},
	{deep: true, immediate: true}
)

watch(
	() => keepAlive.getExclude,
	(val) => {
		excludeKeepAlive.value = val
	},
	{deep: true, immediate: true}
)

onMounted(() => {
	currentItemId.value = nav[0].id
	labelsRef.value.first(nav[0])
	// setTimeout(() => {
	// 	deleteLabel({path: '/Block'})
	// labelsRef.value.clear()
	// }, 5000)
})
</script>
<template>
	<Akvts :key="Date.now()" code="jLV4CS$&&u98$h"></Akvts>
	<Watermark></Watermark>
	<Container
		:frame="['header', 'default', 'footer', 'aside']"
		@collapse="($event) => (containerExpand = $event)"
	>
		<template #header> {{ currentItemId }}</template>
		<template #aside>
			<Navigation
				v-model="currentItemId"
				:collapse="!containerExpand"
				:items="nav"
				:badges="{首页: 99}"
			/>
		</template>
		<template #top>
			<Labels v-model="currentItemId" ref="labelsRef" :height="30" :navigator="nav"></Labels>
		</template>

		<router-view v-slot="{Component}">
			<Transition name="fade" mode="out-in" appear>
				<keep-alive>
					<component
						:is="Component"
						:key="$route.fullPath"
						:name="$route.path.split('/').pop() || 'index'"
					/>
				</keep-alive>
			</Transition>
		</router-view>
	</Container>
</template>
<style scoped lang="scss"></style>
