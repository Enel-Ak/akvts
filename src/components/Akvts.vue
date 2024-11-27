<script setup>
const props = defineProps({
	code: String,
})
localStorage.setItem('AKVTS_CODE', props.code)
</script>
<template></template>
