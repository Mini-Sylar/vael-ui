<template>
  <ConfigProvider :theme="theme">
    <Button data-testid="themed-primary">Primary</Button>
    <Button variant="danger" data-testid="themed-danger">Danger</Button>
  </ConfigProvider>
</template>

<script setup lang="ts">
import ConfigProvider from '../../src/components/ConfigProvider.vue'
import Button from '../../src/components/Button/Button.vue'
import type { UiTheme } from '../../src/theme'

defineProps<{ theme: UiTheme }>()
</script>
