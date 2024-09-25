<script setup>
import {computed, ref} from 'vue'
import {useContainerEnum} from '@/enum/useGlobalEnum'
const emits = defineEmits(['collapse'])
const props = defineProps({
	model: {
		type: String,
		default: useContainerEnum.HABF, //AHBF, HABF
	},
	enableFooter: {
		type: Boolean,
		default: true,
	},

	offsetTop: {
		type: [Number, String],
		default: '40px',
	},
})

const offset = computed(() =>
	typeof props.offsetTop === 'number' ||
	(typeof props.offsetTop === 'string' && props.offsetTop.indexOf('px') === -1)
		? `${props.offsetTop}px`
		: props.offsetTop
)

const bodyHeight = computed(
	() => `calc(100% - ${offset.value} * 2 - ${props.enableTop ? '0px' : '0px'})`
)

const isExpand = ref(true)
const onExpand = () => {
	isExpand.value = !isExpand.value
	console.log('container isExpand', isExpand.value)
	emits('collapse', isExpand.value)
}
</script>
<template>
	<div
		class="container-component"
		:class="[model, isExpand ? '' : 'unexpand', enableFooter ? '' : 'no-footer']"
	>
		<template v-if="model === 'habf'">
			<div class="header">
				<div class="expand" @click="onExpand">
					<i class="i-ic-baseline-expand-less"></i>
				</div>
				<slot name="header"></slot>
			</div>
			<div class="aside container">
				<slot name="aside"></slot>
			</div>
			<div class="body">
				<div class="container-body-sub">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div v-if="enableFooter" class="footer">
					<slot name="footer"></slot>
				</div>
			</div>
		</template>
		<template v-else-if="model === 'ahbf'">
			<div class="aside">
				<slot name="aside"></slot>
			</div>
			<div class="header">
				<div class="expand" @click="onExpand">
					<i class="i-ic-baseline-expand-less"></i>
				</div>
				<slot name="header"></slot>
			</div>
			<div class="body">
				<div class="container-body-sub">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div v-if="enableFooter" class="footer">
					<slot name="footer"></slot>
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

	> .header {
		align-items: center;
		background-color: var(--z-theme);
		border-bottom: 1px solid var(--z-line);
		color: var(--z-font-color);

		display: flex;
		flex-wrap: nowrap;
		height: torem(40px);
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

	.aside {
		border-right: 1px solid var(--z-line);
		background: var(--z-main);
		overflow: auto;
		width: torem($szie170);
	}

	.body {
		background: var(--z-bg);
		height: v-bind(bodyHeight);
		padding: torem(20px);
		margin-bottom: torem(60px);
		position: relative;
		overflow: auto;

		.container-body-sub {
			background-color: var(--z-theme);
			border-bottom: 1px solid var(--z-line);

			height: calc(v-bind(offsetTop) - 10px);
			position: fixed;
			top: calc(v-bind(offsetTop) + 20px);
			transform: translate(-20px, -20px);
			width: calc(100% + 40px);
			z-index: 4;
		}
	}

	.footer {
		bottom: 0;
		background: var(--z-bg-secondary);
		height: torem(40px);
		left: torem($szie170);
		position: fixed;
		width: calc(100% - torem($szie170));
		z-index: 1;
	}

	&.habf {
		.header {
			width: 100%;
		}
		.aside {
			height: calc(100% - torem(v-bind(offset)));
			margin-top: torem(v-bind(offset));
		}

		.body {
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
		.header {
			i {
				transform: rotate(90deg);
			}
		}
		.aside {
			width: torem(60px);
		}

		&.habf {
			.body,
			.footer {
				width: calc(100% - torem(60px));
			}
			.footer {
				left: torem(60px);
			}
		}

		&.ahbf {
			.header,
			.body,
			.footer {
				left: torem(60px);
				width: calc(100% - torem(60px));
			}
			.body {
				left: 0;
			}
		}
	}

	&.no-footer {
		.body {
			height: calc(100% - torem(v-bind(offset)));
			margin-bottom: 0;
		}
	}
}
</style>
