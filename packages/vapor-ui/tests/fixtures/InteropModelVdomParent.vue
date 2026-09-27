<template>
  <ModelChild :n="n" />
  <button data-testid="bump" @click="n++">bump</button>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import ModelChild from './InteropModelChild.vue'
const n = ref(0)
</script>
