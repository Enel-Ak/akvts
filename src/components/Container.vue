<script setup>
import {computed, ref, watch} from 'vue'
import {useContainerEnum} from '@/enum/useGlobalEnum'
const emits = defineEmits(['collapse'])
const props = defineProps({
	model: {
		type: String,
		default: useContainerEnum.HABF, //AHBF, HABF
	},
	expand: {
		type: Boolean,
		default: true,
	},

	enableExpand: {
		type: Boolean,
		default: true,
	},
	enableFooter: {
		type: Boolean,
		default: true,
	},

	offsetTop: {
		type: [Number, String],
		default: '56px',
	},
})

const offset = computed(() =>
	typeof props.offsetTop === 'number' ||
	(typeof props.offsetTop === 'string' && props.offsetTop.indexOf('px') === -1)
		? `${props.offsetTop}px`
		: props.offsetTop
)

const bodyHeight = computed(
	() => `calc(100% - ${offset.value} - ${props.enableFooter ? '70px' : '0'})`
)

const isExpand = ref(props.expand)
const onExpand = () => {
	isExpand.value = !isExpand.value
	console.log('container isExpand', isExpand.value)
	emits('collapse', isExpand.value)
}

watch(
	() => props.expand,
	(newVal) => {
		isExpand.value = newVal
	},
	{immediate: true}
)
</script>
<template>
	<div
		class="container-component"
		:class="[model, isExpand ? '' : 'unexpand', enableFooter ? '' : 'no-footer']"
	>
		<template v-if="model === 'habf'">
			<div class="container-header">
				<div v-if="enableExpand" class="expand" @click="onExpand">
					<i class="i-ic-baseline-expand-less"></i>
				</div>
				<slot name="header"></slot>
			</div>
			<div class="container-aside">
				<slot name="aside"></slot>
			</div>
			<div class="container-body">
				<div class="container-body-sub">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div v-if="enableFooter" class="container-footer">
					<slot name="footer">@CopyRight 2024 by Akvts.net</slot>
				</div>
			</div>
		</template>
		<template v-else-if="model === 'ahbf'">
			<div class="container-aside">
				<slot name="aside"></slot>
			</div>
			<div class="container-header">
				<div class="expand" @click="onExpand">
					<i class="i-ic-baseline-expand-less"></i>
				</div>
				<slot name="header"></slot>
			</div>
			<div class="container-body">
				<div class="container-body-sub">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div v-if="enableFooter" class="container-footer">
					<slot name="footer">@CopyRight 2024 by Akvts.net</slot>
				</div>
			</div>
		</template>
	</div>
</template>
<style scoped lang="scss">
$szie170: 170px;

.container-component {
	display: flex;
	flex-wrap: wrap;
	height: inherit;
	position: relative;

	> .container-header {
		align-items: center;
		background-color: var(--z-theme);
		border-bottom: 1px solid var(--z-line);
		color: var(--z-font-color);

		display: flex;
		flex-wrap: nowrap;
		height: v-bind(offset);
		left: 0;
		overflow: hidden;
		position: fixed;
		top: 0;
		z-index: 1;

		.expand {
			align-items: center;

			cursor: pointer;
			display: flex;
			flex-direction: column;
			font-size: torem(20px);
			height: 100%;
			justify-content: center;
			width: 30px;

			i {
				transform: rotate(-90deg);
			}
		}
	}

	.container-aside {
		border-right: 1px solid var(--z-line);
		background: var(--z-main);
		overflow: auto;
		overflow-x: hidden;
		width: torem($szie170);
	}

	.container-body {
		background: var(--z-bg);
		height: v-bind(bodyHeight);
		padding: torem(20px);
		position: relative;
		overflow: auto;
		overflow-x: hidden;

		.container-body-sub {
			background-color: var(--z-theme);
			border-bottom: 1px solid var(--z-line);

			height: 30px;
			position: fixed;
			top: calc(v-bind(offset) + 20px);
			transform: translate(-20px, -20px);
			width: calc(100% + 40px);
			z-index: 4;
		}
	}

	.container-footer {
		align-items: center;
		bottom: 0;
		background: var(--z-bg-secondary);
		display: flex;
		height: torem(40px);
		justify-content: center;
		left: torem($szie170);
		position: fixed;
		width: calc(100% - torem($szie170));
		z-index: 1;
	}

	&.habf {
		.container-header {
			width: 100%;
		}
		.container-aside {
			height: calc(100% - v-bind(offset));
			margin-top: v-bind(offset);
		}

		.container-body {
			margin-top: calc(v-bind(offset) + 30px);
			width: calc(100% - torem($szie170));
		}
	}

	&.ahbf {
		.header {
			left: torem($szie170);
			width: calc(100% - torem($szie170));
		}

		.aside {
			height: 100%;
		}

		.body {
			margin-top: calc(v-bind(offset) + 30px);
			width: calc(100% - torem($szie170));
		}
	}

	&.unexpand {
		.container-header {
			i {
				transform: rotate(90deg);
			}
		}
		.container-aside {
			width: torem(60px);
		}

		&.habf {
			.container-body,
			.container-footer {
				width: calc(100% - torem(60px));
			}
			.container-footer {
				left: torem(60px);
			}
		}

		&.ahbf {
			.container-header,
			.container-body,
			.container-footer {
				left: torem(60px);
				width: calc(100% - torem(60px));
			}
			.container-body {
				left: 0;
			}
		}
	}

	&.no-footer {
		.container-body {
			height: calc(100% - torem(v-bind(offset)));
			margin-bottom: 0;
		}
	}
}
</style>
