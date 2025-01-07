<script setup>
import {onMounted, ref, provide, inject} from 'vue'
import {deleteLabel} from '../hooks/useLabels'
import useGuid from '@/hooks/useGuid'

const containerExpand = ref(true)
const hid = ref(useGuid())
const pid = ref(useGuid())
const did = ref(useGuid())
const nav = [
	{id: 'a', icon: 'Home', label: '首页', path: '/', sort: 1},
	{id: 'c', icon: 'Setting', label: '设置', path: '/Block', sort: 2},
	{
		id: 'b',
		icon: 'Notifications',
		label: '通知',
		path: '/Block',
		sort: 3,
		children: [
			{id: 'bb', label: '工作通知', path: '', sort: 1, pid},
			{id: 'bbb', label: '代办通知', path: '/Block', sort: 2, pid},
			{id: 'bbbb', label: '消息通知', path: '', sort: 3, pid},
		],
	},
]

const labelsRef = ref()
const currentItemId = ref('')
const parentId = ref('')

onMounted(() => {
	currentItemId.value = nav[0].id
	labelsRef.value.first(nav[0])
	// setTimeout(() => {
	// 	deleteLabel({path: '/Block'})
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
					<component :is="Component" :key="$route.fullPath" />
				</keep-alive>
			</Transition>
		</router-view>
	</Container>
</template>
<style scoped lang="scss"></style>
