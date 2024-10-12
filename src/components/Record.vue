<script setup>
import {computed} from 'vue'

const props = defineProps({
	title: {
		type: String,
		default: '',
	},
	sort: {
		type: String,
		default: 'desc', // desc or asc
	},
	data: {
		type: Array,
		default: () => [],
	},
	bgColor: {
		type: String,
		default: 'transparent',
	},
	width: {
		type: String,
		default: '100%',
	},
	fadeOut: {
		type: Boolean,
		default: true,
	},
	lastLine: {
		type: Boolean,
		default: true,
	},
})

const icons = {
	default: 'i-ic-baseline-more-horiz',
	success: 'i-ic-outline-check',
	warning: 'i-ic-sharp-warning',
	error: 'i-ic-twotone-close',
	danger: 'i-ic-twotone-close',
}

const list = computed(() =>
	props.data.sort((a, b) => {
		if (props.sort === 'desc') {
			return new Date(b.time) - new Date(a.time)
		} else if (props.sort === 'asc') {
			return new Date(a.time) - new Date(b.time)
		} else {
			return 0
		}
	})
)
</script>
<template>
	<div class="record-component">
		<div v-show="title" class="title">
			<slot name="title">
				<span>{{ title }} </span>
			</slot>
		</div>
		<div
			class="item"
			v-for="(item, index) of list"
			:class="[
				item.type || '',
				!fadeOut ? 'no-fadeout' : '',
				!lastLine && index === list.length - 1 ? 'no-last-line' : '',
			]"
		>
			<div class="label">
				<slot name="label" :item="item">{{ item.label }}</slot>
			</div>
			<div class="text" v-if="item.text">
				<slot name="text" :item="item">
					<span v-html="item.text"></span>
				</slot>
			</div>
			<div class="other" :class="{'no-text': !item.text}">
				<slot name="other" :item="item">
					<span v-if="item.time">{{ item.time }}</span>
					<span v-if="item.user" :title="item.user">{{ item.user }}</span>
				</slot>
			</div>
			<i v-if="!item.type" class="icon" :class="[icons.default]"></i>
			<i v-else class="icon" :class="[icons[item.type]]"></i>
		</div>
	</div>
</template>
<style scoped lang="scss">
.record-component {
	width: v-bind(width);

	.title {
		border-radius: torem(5px) torem(5px) 0 0;
		border-bottom: 1px solid var(--z-theme);
		color: rgba(var(--z-font-color-rgb), 1);
		font-size: torem(16px);
		margin-bottom: 20px;

		span {
			border-bottom: 1px solid rgba(var(--z-bg-secondary-rgb), 1);
			font-weight: 500;
			padding: torem(10px);
			width: 100%;
		}
	}

	.item {
		background-color: v-bind(bgColor);
		border-left: 3px solid var(--z-nav-hover);
		margin-left: torem(10px);
		// margin-bottom: torem(4px);
		opacity: 0.5;
		position: relative;
		padding: 0 torem(20px) torem(20px) torem(20px);

		.icon {
			color: var(--z-bg);
			left: torem(-10.5px);
			position: absolute;
			top: torem(-2.5px);
			transform: scale(0.5);
			z-index: 1;
		}

		&.success {
			border-left-color: var(--z-success);
			&::after {
				background-color: var(--z-success);
			}
		}

		&.warning {
			border-left-color: var(--z-warning);
			&::after {
				background-color: var(--z-warning);
			}
		}

		&.error {
			border-left-color: var(--z-error);
			&::after {
				background-color: var(--z-error);
			}
		}

		&.danger {
			border-left-color: var(--z-danger);
			&::after {
				background-color: var(--z-danger);
			}
		}

		&::after {
			content: '';
			border-radius: 100%;
			position: absolute;
			top: 0;
			left: -8px;
			width: 13px;
			height: 13px;
			background-color: var(--z-nav-hover);
		}

		&::before {
			content: '';
			border-radius: 100%;
			position: absolute;
			top: torem(-4px);
			left: -12px;
			width: 21px;
			height: 21px;
			background: inherit;
		}

		&:nth-child(2) {
			opacity: 1;
		}

		&.no-last-line {
			border-color: transparent;
		}

		@for $i from 3 through 7 {
			&:nth-child(#{$i}) {
				opacity: 1.2 - 0.1 * $i;
			}
		}

		&.no-fadeout {
			opacity: 1 !important;
		}

		.label {
			color: var(--z-font-color);
			font-size: torem(14px);
			font-weight: 500;
		}

		.text {
			color: rgba(var(--z-font-color-rgb), 0.6);
			line-height: 1.5;
			padding: torem(20px) 0;
			text-align: justify;
		}

		.other {
			align-items: center;
			color: rgba(var(--z-font-color-rgb), 0.3);
			display: flex;
			justify-content: space-between;

			span {
				white-space: nowrap;

				&:nth-child(2) {
					max-width: 30%;
					overflow: hidden;
					text-overflow: ellipsis;
				}
			}

			&.no-text {
				padding-top: 20px;
			}
		}
	}
}
</style>
