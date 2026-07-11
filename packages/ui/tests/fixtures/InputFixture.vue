<!-- v-model modifiers (`.trim`/`.lazy`) can only be written at the usage site,
     never passed as a prop — this fixture exists purely to exercise them. -->
<template>
  <Input data-testid="plain" v-model="plain" placeholder="plain" />
  <Input data-testid="trim" v-model.trim="trimmed" placeholder="trim" />
  <Input data-testid="lazy" v-model.lazy="lazy" placeholder="lazy" />
  <Input
    data-testid="attrs"
    class="consumer-class"
    maxlength="5"
    name="username"
    placeholder="attrs"
  />
  <output data-testid="plain-value">{{ plain }}</output>
  <output data-testid="trim-value">{{ trimmed }}</output>
  <output data-testid="lazy-value">{{ lazy }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Input from '../../src/components/Input.vue'

const plain = shallowRef('')
const trimmed = shallowRef('')
const lazy = shallowRef('')

defineExpose({ plain, trimmed, lazy })
</script>
