<template>
  <Button>
    <template v-if="icon" #leading><svg aria-hidden="true" /></template>
    Save
  </Button>
</template>

<script setup lang="ts">
import Button from '../../src/components/Button/Button.vue'

defineProps<{ icon: boolean }>()
</script>
