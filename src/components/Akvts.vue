<script setup>
import {onMounted} from 'vue'

const props = defineProps({
	code: String,
})
localStorage.removeItem('AKVTS_TOKEN')
localStorage.setItem('AKVTS_TOKEN', props.code)
</script>
<template></template>
