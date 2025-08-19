<script setup>
import {computed, onMounted, onUnmounted, ref, watch} from 'vue'
import {useContainerEnum} from '@/enum/useGlobalEnum'
import Lock from './Lock.vue'

const emits = defineEmits(['collapse', 'scroll'])
const props = defineProps({
	model: {
		type: String,
		default: useContainerEnum.HABF, //ahbf, habf, hbf, header body footer aside
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

	frame: {
		type: Array,
		default: () => ['header', 'aside', 'default', 'footer'],
	},
})

const offset = computed(() => {
	if (!props.frame.includes('header')) {
		return 0
	}
	return typeof props.offsetTop === 'number' ||
		(typeof props.offsetTop === 'string' && props.offsetTop.indexOf('px') === -1)
		? `${props.offsetTop}px`
		: props.offsetTop
})

const bodyHeight = computed(
	() =>
		`calc(100% - ${props.frame.includes('header') ? offset.value : '0px'} - ${
			props.enableFooter && props.frame.includes('footer') ? '70px' : '0px'
		})`
)

const containerRef = ref()
const isExpand = ref(props.expand)
const unLock = ref(0)

const onExpand = () => {
	isExpand.value = !isExpand.value
	emits('collapse', isExpand.value)
}

const onScroll = (e) => {
	const target = e.target
	emits('scroll', {
		target,
		scrollTop: target.scrollTop,
	})
}

watch(
	() => props.expand,
	(newVal) => {
		isExpand.value = newVal
	},
	{immediate: true}
)

onMounted(() => {
	localStorage.setItem('CONTAINER_FRAME', JSON.stringify(props.frame))
	containerRef.value?.querySelector('.container-body').addEventListener('scroll', onScroll)
})

onUnmounted(() => {
	containerRef.value?.querySelector('.container-body').removeEventListener('scroll', onScroll)
})
</script>
<template>
	<div
		ref="containerRef"
		class="container-component"
		:class="[model, isExpand ? '' : 'unexpand', enableFooter ? '' : 'no-footer']"
	>
		<template v-if="model === 'habf'">
			<div class="container-header" v-show="frame.includes('header')">
				<div v-if="enableExpand" class="expand" @click="onExpand">
					<Icons name="Back" size="12" color="var(--z-font-color)"></Icons>
				</div>
				<slot name="header"></slot>
			</div>
			<div class="container-aside" v-show="frame.includes('aside')">
				<slot name="aside"></slot>
			</div>
			<div
				class="container-body"
				v-show="frame.includes('default')"
				:class="{'no-aside': !frame.includes('aside')}"
			>
				<div class="container-body-sub" v-show="frame.includes('header')">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div
					v-show="enableFooter && frame.includes('footer')"
					class="container-footer"
					:class="{'no-aside': !frame.includes('aside')}"
				>
					<slot name="footer">
						<div class="tac w-full">@CopyRight 2024 by Akvts.net</div>
					</slot>
				</div>
			</div>
		</template>

		<template v-else-if="model === 'ahbf'">
			<div class="container-aside" v-show="frame.includes('aside')">
				<slot name="aside"></slot>
			</div>
			<div class="container-header" v-show="frame.includes('header')">
				<div class="expand" @click="onExpand">
					<Icons name="Back" size="12" color="var(--z-font-color)"></Icons>
				</div>
				<slot name="header"></slot>
			</div>
			<div
				class="container-body"
				@scroll="onScroll"
				v-show="frame.includes('default')"
				:class="{'no-aside': !frame.includes('aside')}"
			>
				<div class="container-body-sub" v-show="frame.includes('header')">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div
					v-show="enableFooter && frame.includes('footer')"
					class="container-footer"
					:class="{'no-aside': !frame.includes('aside')}"
				>
					<slot name="footer">
						<div class="tac w-full">@CopyRight 2024 by Akvts.net</div>
					</slot>
				</div>
			</div>
		</template>

		<template v-else-if="model === 'hbf'">
			<div class="container-header" v-show="frame.includes('header')">
				<slot name="header"></slot>
			</div>
			<div
				class="container-body"
				@scroll="onScroll"
				v-show="frame.includes('default')"
				:class="{'no-aside': !frame.includes('aside')}"
			>
				<div class="container-body-sub" v-show="frame.includes('header')">
					<slot name="top"></slot>
				</div>
				<slot name="default"></slot>
				<div
					v-show="enableFooter && frame.includes('footer')"
					class="container-footer"
					:class="{'no-aside': !frame.includes('aside')}"
				>
					<slot name="footer">
						<div class="tac w-full">@CopyRight 2024 by Akvts.net</div>
					</slot>
				</div>
			</div>
		</template>
		<Lock v-model="unLock"></Lock>
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
		z-index: 3;

		.expand {
			align-items: center;

			cursor: pointer;
			display: flex;
			flex-direction: column;
			font-size: torem(20px);
			height: 100%;
			justify-content: center;
			width: 30px;
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
		z-index: 2;

		.container-body-sub {
			background-color: var(--z-theme);
			border-bottom: 1px solid var(--z-line);

			height: 30px;
			position: fixed;
			top: calc(v-bind(offset) + 20px);
			transform: translate(-20px, -20px);
			width: inherit;
			z-index: 4;
		}

		&.no-aside {
			width: 100% !important;
		}
	}

	.container-footer {
		align-items: center;
		bottom: 0;
		background: var(--z-bg-secondary);
		display: flex;
		height: torem(40px);
		left: torem($szie170);
		position: fixed;
		padding: 0 torem(20px);
		width: calc(100% - torem($szie170));
		z-index: 1;

		&.no-aside {
			left: 0;
			width: 100%;
		}
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
		.container-header {
			left: torem($szie170);
			width: calc(100% - torem($szie170));
		}

		.container-aside {
			height: 100%;
		}

		.container-body {
			margin-top: calc(v-bind(offset) + 30px);
			width: calc(100% - torem($szie170));
		}
	}

	&.hbf {
		.container-header {
			width: 100%;
		}

		.container-body {
			margin-top: calc(v-bind(offset) + 30px);
			width: 100%;
		}
		.container-footer {
			left: 0;
			width: 100%;
		}
	}

	&.unexpand {
		.container-header {
			i {
				transform: rotate(-180deg);
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
