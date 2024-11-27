<script setup>
const props = defineProps({
	code: String,
})
localStorage.setItem('AKVTS_TOKEN', props.code)
</script>
<template></template>
