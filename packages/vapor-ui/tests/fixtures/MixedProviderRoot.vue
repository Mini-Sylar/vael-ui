<template>
  <ConfigProvider size="sm">
    <MixedProviderVaporChild />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ConfigProvider } from 'vael-ui'
import MixedProviderVaporChild from './MixedProviderVaporChild.vue'
</script>
