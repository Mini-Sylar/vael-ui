<template>
  <div
    ref="frame"
    data-testid="frame"
    style="position: relative; inline-size: 420px; block-size: 300px"
  >
    <button type="button">Inside the frame</button>
    <Toaster name="frame" :container="frame" :position="position" />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from 'vue'
import Toaster from '../../src/components/Toaster/Toaster.vue'
import type { ToasterPosition } from '../../src/components/Toaster/Toaster.vue'

withDefaults(defineProps<{ position?: ToasterPosition }>(), { position: 'bottom-right' })

const frame = useTemplateRef<HTMLElement>('frame')
</script>
