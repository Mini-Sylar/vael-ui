<template>
  <Button data-testid="outer-btn">Outer</Button>
  <ConfigProvider :theme="{ radius: innerRadius }">
    <Button data-testid="inner-btn">Inner</Button>
  </ConfigProvider>
</template>

<script setup lang="ts">
import ConfigProvider from '../../src/components/ConfigProvider/ConfigProvider.vue'
import Button from '../../src/components/Button/Button.vue'

defineProps<{ innerRadius: string }>()
</script>
