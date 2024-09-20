<script setup>
import {ref} from 'vue'
import {DownloadAttachment} from '@/api/GlobalApi'

const props = defineProps({
	items: {
		type: Array,
		default: () => [],
	},
})

const currentAttachment = ref(null)

const onClickItem = (item) => {
	currentAttachment.value = item
	if (item.suffix !== '.png' && item.suffix !== '.jpg' && item.suffix !== '.jpeg') {
		DownloadAttachment(item.id).then((res) => {
			const a = document.createElement('a')
			const url = window.URL.createObjectURL(new Blob([res.data]))
			a.href = url
			a.download = item.__uploadFile.name
			a.click()
			window.URL.revokeObjectURL(url)
		})
	}
}
</script>
<template>
	<div class="attachment-items">
		<div class="item" v-for="item of items" @click="onClickItem(item)">
			<img v-if="item.__base64" :src="item.__base64" :alt="item.__uploadFile.name" />

			<i v-if="item.suffix === '.pdf'" class="icon i-ic-round-picture-as-pdf"></i>
			<i
				v-if="item.suffix === '.zip' || item.suffix === '.rar'"
				class="icon i-ic-baseline-folder-zip"
			>
			</i>
			<i
				v-if="item.suffix === '.doc' || item.suffix === '.docx'"
				class="icon i-ic-baseline-file-copy"
			></i>
			<span>{{ item?.__uploadFile.name }}</span>
		</div>
	</div>
	<ViewImage
		:src="currentAttachment?.__base64"
		:alt="currentAttachment?.__uploadFile.name"
		@close="currentAttachment = null"
	/>
</template>
<style scoped lang="scss">
.attachment-items {
	display: flex;
	flex-wrap: wrap;

	.item {
		align-items: center;
		border-radius: torem(5px);
		border: 1px solid var(--z-line);
		background-color: var(--z-theme);
		cursor: pointer;
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-right: torem(15px);
		margin-bottom: torem(15px);
		overflow: hidden;
		padding: torem(15px);
		width: calc(20% - torem(15px));
		.icon {
			height: torem(100px);
			scale: 3;
		}
		span {
			color: var(--z-font-color);
			margin-top: torem(20px);
			max-width: torem(200px);
			overflow: hidden;
			padding: 0 torem(15px);
			text-overflow: ellipsis;
			transition: all 0.3s linear;
			white-space: nowrap;
		}
		&:hover {
			span {
				color: var(--z-nav-hover);
				text-decoration: underline;
			}
		}
	}

	img {
		height: torem(100px);
	}
}
</style>
