<template>
  <Toaster :position="position" :max-visible="maxVisible" />
</template>

<script setup lang="ts">
import Toaster from '../../src/components/Toaster/Toaster.vue'
import type { ToasterPosition } from '../../src/components/Toaster/Toaster.vue'

withDefaults(defineProps<{ position?: ToasterPosition; maxVisible?: number }>(), {
  position: 'bottom-right',
})
</script>
