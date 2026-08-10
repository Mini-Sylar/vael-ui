<template>
  <Toaster>
    <template #default="{ entry, dismiss }">
      <strong data-testid="custom-title">{{ entry.title }}</strong>
      <button data-testid="custom-dismiss" type="button" @click="dismiss">x</button>
    </template>
  </Toaster>
</template>

<script setup lang="ts">
import Toaster from '../../src/components/Toaster/Toaster.vue'
</script>
