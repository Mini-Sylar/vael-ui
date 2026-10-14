<template>
  <section class="demo">
    <h3>Horizontal layout</h3>
    <RadioGroup v-model="size" orientation="horizontal">
      <Radio value="s" label="S" />
      <Radio value="m" label="M" />
      <Radio value="l" label="L" />
      <Radio value="xl" label="XL" />
    </RadioGroup>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Radio, RadioGroup } from 'vael-ui'

const size = shallowRef<string | null>('m')
</script>
