<template>
  <section class="demo">
    <h3>Vertical</h3>
    <p class="note">
      <code>orientation="vertical"</code> stacks the buttons and joins them top to bottom. One
      alignment is always on: <code>v-model</code> without <code>multiple</code> keeps one on, and
      <code>:allow-empty="false"</code> stops it from being turned off.
    </p>
    <div class="row">
      <ButtonGroup
        v-model="align"
        :allow-empty="false"
        orientation="vertical"
        aria-label="Alignment"
      >
        <Button
          v-for="option in alignOptions"
          :key="option.value"
          :value="option.value"
          variant="outline"
          icon
          :aria-label="option.label"
        >
          <component :is="option.icon" weight="bold" />
        </Button>
      </ButtonGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'
import { PhTextAlignCenter, PhTextAlignLeft, PhTextAlignRight } from '@phosphor-icons/vue'

const align = shallowRef('left')
const alignOptions = [
  { label: 'Align left', value: 'left' as const, icon: PhTextAlignLeft },
  { label: 'Align center', value: 'center' as const, icon: PhTextAlignCenter },
  { label: 'Align right', value: 'right' as const, icon: PhTextAlignRight },
]
</script>
