<!-- SplitButton with every part: the main action, and the trigger that opens its menu of others. -->
<template>
  <div data-specimen class="specimen">
    <SplitButton
      v-model:open="open"
      :items="items"
      trigger-label="More publish options"
      align="end"
      :close-on-outside="false"
    >
      Publish
    </SplitButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { SplitButton } from 'vael-ui'
import type { MenuEntry } from 'vael-ui'
import { PhCalendarBlank, PhEye, PhFloppyDisk } from '@phosphor-icons/vue'

const items: MenuEntry[] = [
  { label: 'Schedule', icon: PhCalendarBlank },
  { label: 'Save as draft', icon: PhFloppyDisk },
  { label: 'Preview', icon: PhEye },
]
// Open, so the menu its trigger opens is shown too.
const open = ref(true)
</script>

<style scoped>
.specimen {
  display: flex;
  justify-content: center;
  inline-size: min(16rem, 100%);
  min-block-size: 13rem;
}
</style>
