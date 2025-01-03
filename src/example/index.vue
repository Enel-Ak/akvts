<script setup>
import {onMounted, ref} from 'vue'
import useGuid from '@/hooks/useGuid'

const containerExpand = ref(true)
const hid = ref(useGuid())
const pid = ref(useGuid())
const did = ref(useGuid())
const nav = [
	{id: hid.value, icon: 'Home', label: '首页', path: '/', sort: 1},
	{id: useGuid(), icon: 'Setting', label: '设置', path: '/Block', sort: 2},
	{
		id: pid.value,
		icon: 'Notifications',
		label: '通知',
		path: '',
		sort: 3,
		children: [
			{id: useGuid(), label: '工作通知', path: '', sort: 1, pid},
			{id: did.value, label: '代办通知', path: '/Block', sort: 2, pid},
			{id: useGuid(), label: '消息通知', path: '', sort: 3, pid},
		],
	},
]

const onClickItem = (item) => {}
const labelsRef = ref()
onMounted(() => {
	labelsRef.value.first(nav[0])
})
</script>
<template>
	<Akvts :key="Date.now()" code="jLV4CS$&&u98$h"></Akvts>
	<Watermark></Watermark>
	<Container
		:frame="['header', 'default', 'footer', 'aside']"
		@collapse="($event) => (containerExpand = $event)"
	>
		<template #header> header</template>
		<template #aside>
			<Navigation :collapse="!containerExpand" :items="nav" />
		</template>
		<template #top>
			<Labels ref="labelsRef" :height="30"></Labels>
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
