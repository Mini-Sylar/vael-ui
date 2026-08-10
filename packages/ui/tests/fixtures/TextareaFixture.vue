<template>
  <Textarea data-testid="plain" v-model="plain" placeholder="plain" />
  <Textarea data-testid="lazy" v-model.lazy="lazy" placeholder="lazy" />
  <output data-testid="plain-value">{{ plain }}</output>
  <output data-testid="lazy-value">{{ lazy }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Textarea from '../../src/components/Textarea/Textarea.vue'

const plain = shallowRef('')
const lazy = shallowRef('')

defineExpose({ plain, lazy })
</script>
