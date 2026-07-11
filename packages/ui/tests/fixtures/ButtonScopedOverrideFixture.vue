<template>
  <Button class="consumer-scoped-class">Scoped override probe</Button>
</template>

<script setup lang="ts">
import Button from '../../src/components/Button.vue'
</script>

<style scoped>
.consumer-scoped-class {
  color: rgb(1, 2, 3);
}
</style>
