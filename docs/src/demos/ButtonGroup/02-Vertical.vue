<template>
  <section class="demo">
    <h3>Vertical</h3>
    <p class="note">Same collapsing logic, rotated to the block axis.</p>
    <div class="row">
      <ButtonGroup orientation="vertical" aria-label="Alignment">
        <Button
          v-for="option in alignOptions"
          :key="option.value"
          variant="outline"
          icon
          :aria-label="option.label"
          :aria-pressed="align === option.value"
          @click="align = option.value"
        >
          <component :is="option.icon" weight="bold" />
        </Button>
      </ButtonGroup>
    </div>
    <p class="note">
      Aligned: <strong>{{ align }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'
import { PhTextAlignCenter, PhTextAlignLeft, PhTextAlignRight } from '@phosphor-icons/vue'

const align = shallowRef<'left' | 'center' | 'right'>('left')
const alignOptions = [
  { label: 'Align left', value: 'left' as const, icon: PhTextAlignLeft },
  { label: 'Align center', value: 'center' as const, icon: PhTextAlignCenter },
  { label: 'Align right', value: 'right' as const, icon: PhTextAlignRight },
]
</script>
