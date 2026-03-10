<template>
  <p class="hello">
    {{ message }}
  </p>
</template>

<script setup lang="ts">
interface Props {
  message: string
}

defineProps<Props>()
</script>

<style scoped>
.hello {
  color: #1f2937;
}
</style>
