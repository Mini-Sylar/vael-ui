<template>
  <ConfigProvider :size="size" :motion-css="false" :i18n="i18n">
    <Button data-testid="inherits">Inherits</Button>
    <Button data-testid="own" size="lg">Own</Button>
    <Calendar data-testid="calendar" :model-value="day" />
  </ConfigProvider>
</template>

<script setup lang="ts" vapor>
import { shallowRef } from 'vue'
import { Button, Calendar, ConfigProvider } from 'vael-ui/vapor'

const size = shallowRef<'sm' | 'md' | 'lg'>('sm')
const locale = shallowRef('fr-FR')
const i18n = { t: (key: string) => key, locale }
const day = new Date(2024, 5, 15)

defineExpose({
  setSize: (next: 'sm' | 'md' | 'lg') => (size.value = next),
  setLocale: (next: string) => (locale.value = next),
})
</script>
