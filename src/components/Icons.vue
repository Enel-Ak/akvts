<script setup>
import Icons from '@/enum/useIconsEnum'
const props = defineProps({
	iconName: {
		type: String,
		default: '',
	},
})
</script>
<template>
	<i class="akvts-icons" v-html="Icons[iconName]"></i>
</template>
<style scoped lang="scss">
.akvts-icons {
	display: flex;
	:deep(svg) {
		font-size: 20px;
		height: 1em !important;
		width: 1em !important;
	}
}
</style>
