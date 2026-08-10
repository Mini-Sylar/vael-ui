<template>
  <Collapsible ref="collapsible" v-model:open="open" :disabled="disabled" :motion-css="motionCss">
    <template #trigger="{ open: isOpen }">
      <button type="button">{{ isOpen ? 'Hide' : 'Show' }} details</button>
    </template>
    <p>Panel content here.</p>
  </Collapsible>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Collapsible from '../../src/components/Collapsible/Collapsible.vue'

const props = withDefaults(
  defineProps<{
    initialOpen?: boolean
    disabled?: boolean
    motionCss?: boolean
  }>(),
  { initialOpen: false, disabled: false, motionCss: true },
)

const open = shallowRef(props.initialOpen)
const collapsible = useTemplateRef('collapsible')

defineExpose({ open, collapsible })
</script>
