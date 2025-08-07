<script setup>
import {onMounted, ref, computed} from 'vue'
import {useKeepAlive} from '@/store/useKeepAlive'

const keepAliveStore = useKeepAlive()
const includeKeepAlive = computed(() => keepAliveStore.include)
const containerExpand = ref(true)
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
	{
		id: 'c',
		icon: 'Notifications',
		label: '测试',
		sort: 3,
		children: [
			{
				id: 'cc',
				label: '测试1',
				sort: 1,
				pid: 'c',
				children: [
					{
						id: 'ccc1',
						label: '测试1-1测试1-1测试1-1测试1-1测试1-1测试1-1测试1-1测试1-1',
						path: '/Grid',
						sort: 1,
						pid: 'cc',
						children: [],
					},
					{
						id: 'ccc2',
						label: '测试1-2',
						path: '/Grid',
						sort: 1,
						pid: 'cc',
						children: [],
					},
				],
			},
			{
				id: 'ccc',
				label: '测试2',
				sort: 2,
				pid: 'c',
				children: [
					{
						id: 'ccc2',
						label: '测试2-1',
						path: '/Grid',
						sort: 1,
						pid: 'cc',
						children: [],
					},
					{
						id: 'ccc3',
						label: '测试2-2',
						path: '/Grid',
						sort: 1,
						pid: 'cc',
						children: [],
					},
				],
			},
		],
	},
]

const labelsRef = ref()
const currentItemId = ref('')

onMounted(() => {
	currentItemId.value = nav[0].id
	labelsRef.value.first(nav[0])
	// setTimeout(() => {
	// 	deleteLabel({path: '/Block'})
	// labelsRef.value.clear()
	// }, 5000)
})

const containerModel = ref('hbf') // habf, ahbf, hbf
</script>
<template>
	<Akvts :key="Date.now()" code="jLV4CS$&&u98$h"></Akvts>
	<Watermark></Watermark>

	<Container
		:model="containerModel"
		:frame="['header', 'default', 'footer', 'aside']"
		@collapse="($event) => (containerExpand = $event)"
	>
		<template #header>
			{{ currentItemId }}
			<Navigation
				v-if="containerModel === 'hbf'"
				v-model="currentItemId"
				:collapse="!containerExpand"
				:items="nav"
				:badges="{首页: 99}"
				direction="horizontal"
			/>
		</template>
		<template #aside>
			<Navigation
				v-model="currentItemId"
				:collapse="!containerExpand"
				:items="nav"
				:badges="{首页: 99}"
			/>
		</template>
		<template #top>
			<Labels
				v-model="currentItemId"
				ref="labelsRef"
				:height="30"
				:navigator="nav"
				:simple="containerModel === 'hbf'"
			></Labels>
		</template>

		<router-view v-slot="{Component}">
			<Transition name="fade" mode="out-in" appear>
				<keep-alive :include="includeKeepAlive">
					<component :is="Component" :key="$route.fullPath" />
				</keep-alive>
			</Transition>
		</router-view>
	</Container>

	<!-- hbf -->
	<!-- <Container
		model="hbf"
		:frame="['header', 'default', 'footer']"
		@collapse="($event) => (containerExpand = $event)"
	>
		<template #header>
			<h3 class="pd-30">AKVTS CMS LOGO</h3>
			<Navigation
				v-model="currentItemId"
				:collapse="!containerExpand"
				:items="nav"
				:badges="{首页: 99}"
				direction="horizontal"
			/>
		</template>

		<template #top>
			<Labels
				v-model="currentItemId"
				ref="labelsRef"
				:height="30"
				:navigator="nav"
				:simple="true"
			></Labels>
		</template>

		<router-view v-slot="{Component}">
			<Transition name="fade" mode="out-in" appear>
				<keep-alive :include="includeKeepAlive">
					<component :is="Component" :key="$route.fullPath" />
				</keep-alive>
			</Transition>
		</router-view>
	</Container> -->
</template>
<style scoped lang="scss"></style>
