<template>
  <section class="demo">
    <h2>Theming</h2>
    <p class="note">
      One seed color in — <code>ConfigProvider</code> derives hover (CSS <code>color-mix()</code>)
      and contrast text (WCAG luminance, computed once in JS) automatically. Every component
      re-themes for free since they all read the same <code>--ui-primary</code>/<code
        >--ui-danger</code
      >
      tokens.
    </p>

    <div class="row">
      <label class="swatch-label">
        Primary
        <input v-model="primary" type="color" />
      </label>
      <label class="swatch-label">
        Danger
        <input v-model="danger" type="color" />
      </label>
      <button
        v-for="preset in presets"
        :key="preset"
        class="preset-dot"
        :style="{ background: preset }"
        :aria-label="`Use ${preset} as primary`"
        @click="primary = preset"
      />
    </div>

    <ConfigProvider :theme="{ primary, danger }">
      <div class="row">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ConfigProvider } from 'vael-ui'

const primary = shallowRef('#18181b') // library default
const danger = shallowRef('#dc2626') // library default

const presets = ['#18181b', '#6366f1', '#059669', '#db2777', '#f59e0b']
</script>
