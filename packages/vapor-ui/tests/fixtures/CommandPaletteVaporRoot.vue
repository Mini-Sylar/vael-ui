<template>
  <CommandPalette ref="palette" v-model:open="open" :items="items" />
</template>

<script setup vapor lang="ts">
import { ref, useTemplateRef } from 'vue'
import { CommandPalette } from 'vael-ui/vapor'

const open = ref(true)
const items = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, label: `Item ${i}` }))
const palette = useTemplateRef<{ listEl: HTMLElement | null }>('palette')
defineExpose({ palette })
</script>
