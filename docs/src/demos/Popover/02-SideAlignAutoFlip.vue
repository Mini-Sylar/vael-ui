<template>
  <section class="demo">
    <h3>Side / align, resize the window near an edge to see auto-flip</h3>
    <div class="row">
      <Popover
        v-for="config in sideAlignConfigs"
        :key="`${config.side}-${config.align}`"
        v-model:open="sideAlignOpen[`${config.side}-${config.align}`]"
        :side="config.side"
        :align="config.align"
      >
        <template #trigger="{ open, setTriggerEl }">
          <Button
            :ref="setTriggerEl"
            size="sm"
            variant="secondary"
            @click="toggleSideAlign(config.side, config.align)"
          >
            {{ config.side }}/{{ config.align }}{{ open ? ' ×' : '' }}
          </Button>
        </template>
        <template #default>
          <p class="panel-text">side="{{ config.side }}" align="{{ config.align }}"</p>
        </template>
      </Popover>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Button, Popover } from 'vael-ui'
import type { PopoverAlign, PopoverSide } from 'vael-ui'

const sideAlignConfigs: { side: PopoverSide; align: PopoverAlign }[] = [
  { side: 'top', align: 'start' },
  { side: 'bottom', align: 'center' },
  { side: 'right', align: 'end' },
  { side: 'left', align: 'center' },
]
const sideAlignOpen = reactive<Record<string, boolean>>({})
function toggleSideAlign(side: PopoverSide, align: PopoverAlign) {
  const key = `${side}-${align}`
  sideAlignOpen[key] = !sideAlignOpen[key]
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.panel-text {
  font-size: 0.8125rem;
}
</style>
