<template>
  <ConfigProvider :i18n="i18n" :messages="messages">
    <Dialog :open="true" aria-label="i18n test">
      <template #default>content</template>
    </Dialog>
  </ConfigProvider>
</template>

<script setup lang="ts">
import ConfigProvider from '../../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../../src/components/Dialog.vue'
import type { I18nInstance, PartialUiMessages } from '../../src/messages'

defineProps<{ i18n?: I18nInstance; messages?: PartialUiMessages }>()
</script>
