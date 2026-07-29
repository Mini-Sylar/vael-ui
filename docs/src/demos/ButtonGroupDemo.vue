<template>
  <section class="demo">
    <h2>ButtonGroup</h2>
    <p class="note">
      A purely visual wrapper, adjacent <code>Button</code>s share borders and only the outer
      corners stay rounded. Unlike <code>Toolbar</code>, there's no roving tabindex, each button
      keeps its own place in the native Tab order, since a row of independent actions isn't a
      command bar.
    </p>

    <h3>Joined actions</h3>
    <p class="note">Each button is still independently clickable and independently disableable.</p>
    <div class="row">
      <ButtonGroup aria-label="Message actions">
        <Button variant="outline" @click="archived = !archived">{{
          archived ? 'Archived' : 'Archive'
        }}</Button>
        <Button variant="outline" @click="reported = !reported">{{
          reported ? 'Reported' : 'Report'
        }}</Button>
        <Button variant="outline" disabled>Snooze</Button>
      </ButtonGroup>
    </div>

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

    <h3>Icon-only</h3>
    <p class="note">A compact zoom control, no labels needed once the icons are unambiguous.</p>
    <div class="row">
      <ButtonGroup aria-label="Zoom">
        <Button variant="outline" size="sm" icon aria-label="Zoom out" @click="zoom--">
          <PhMinus weight="bold" />
        </Button>
        <Button variant="outline" size="sm" @click="zoom = 100"> {{ zoom }}% </Button>
        <Button variant="outline" size="sm" icon aria-label="Zoom in" @click="zoom++">
          <PhPlus weight="bold" />
        </Button>
      </ButtonGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'
import {
  PhMinus,
  PhPlus,
  PhTextAlignCenter,
  PhTextAlignLeft,
  PhTextAlignRight,
} from '@phosphor-icons/vue'

const archived = shallowRef(false)
const reported = shallowRef(false)

const align = shallowRef<'left' | 'center' | 'right'>('left')
const alignOptions = [
  { label: 'Align left', value: 'left' as const, icon: PhTextAlignLeft },
  { label: 'Align center', value: 'center' as const, icon: PhTextAlignCenter },
  { label: 'Align right', value: 'right' as const, icon: PhTextAlignRight },
]

const zoom = shallowRef(100)
</script>
