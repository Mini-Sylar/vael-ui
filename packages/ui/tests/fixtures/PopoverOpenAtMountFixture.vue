<template>
  <div style="padding-block-start: 200px">
    <button ref="trigger" data-testid="trigger">trigger</button>
  </div>
  <button data-testid="mount" @click="mounted = true">mount</button>
  <Popover v-if="mounted" v-model:open="open" :trigger-el="trigger">
    <span data-testid="content">already open</span>
  </Popover>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Popover from '../../src/components/Popover/Popover.vue'

const trigger = useTemplateRef<HTMLElement>('trigger')
const mounted = shallowRef(false)
const open = shallowRef(true)
</script>
