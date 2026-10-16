<template>
  <ConfigProvider :theme="theme">
    <Button data-testid="themed-primary">Primary</Button>
    <Button variant="danger" data-testid="themed-danger">Danger</Button>
    <Input data-testid="themed-input" />
    <span data-testid="themed-plain">Plain app text</span>
  </ConfigProvider>
</template>

<script setup lang="ts">
import ConfigProvider from '../../src/components/ConfigProvider/ConfigProvider.vue'
import Button from '../../src/components/Button/Button.vue'
import Input from '../../src/components/Input/Input.vue'
import type { UiTheme } from '../../src/theme'

defineProps<{ theme: UiTheme }>()
</script>
