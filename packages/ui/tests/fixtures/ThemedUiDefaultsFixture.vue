<template>
  <ConfigProvider :theme="themeUi">
    <Button data-testid="inherits">Inherits theme default</Button>
    <Button :ui="{ root: 'local-override' }" data-testid="overrides">Local override wins</Button>
  </ConfigProvider>
</template>

<script setup lang="ts">
import ConfigProvider from '../../src/components/ConfigProvider.vue'
import Button from '../../src/components/Button.vue'

const themeUi = {
  button: { ui: { root: 'from-theme' } },
}
</script>
