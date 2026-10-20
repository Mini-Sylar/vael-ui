<template>
  <section class="demo">
    <h3>Styling a toggle: target <code>[aria-pressed='true']</code></h3>
    <p class="note">
      A toggle that's on carries <code>aria-pressed="true"</code>, so style that state with a class
      on <code>ui.root</code>. With Tailwind, the built-in variant does the same:
      <code>:ui="{ root: 'aria-pressed:bg-amber-100' }"</code>. For every toggle in the app, put the
      class in ConfigProvider's <code>button.ui.root</code>. Your styles win over vael-ui's without
      <code>!important</code>.
    </p>
    <div class="row">
      <Button
        v-for="item in items"
        :key="item.id"
        v-model:pressed="item.starred"
        variant="ghost"
        icon
        :ui="{ root: 'star-toggle' }"
        :aria-label="`Star ${item.name}`"
      >
        <PhStar :weight="item.starred ? 'fill' : 'regular'" />
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { Button } from 'vael-ui'
import { PhStar } from '@phosphor-icons/vue'

const items = reactive([
  { id: 1, name: 'Quarterly report', starred: true },
  { id: 2, name: 'Team offsite', starred: false },
  { id: 3, name: 'Design review', starred: false },
])
</script>

<style scoped>
.star-toggle[aria-pressed='true'] {
  color: var(--ui-warning);
  /* The box is painted by the button's own layer; recolour it through this variable. */
  --ui-button-bg: color-mix(in oklab, var(--ui-warning) 14%, transparent);
}
</style>
