<template>
  <ConfigProvider :theme="{ radius: '0px' }">
    <Button data-testid="trigger" @click="open = true">Open</Button>
    <Dialog v-model:open="open" aria-label="Scoped dialog">
      <template #default>
        <p>content</p>
      </template>
    </Dialog>
  </ConfigProvider>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import ConfigProvider from '../../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../../src/components/Dialog.vue'
import Button from '../../src/components/Button/Button.vue'

const open = shallowRef(false)
</script>
