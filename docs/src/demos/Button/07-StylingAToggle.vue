<template>
  <section class="demo">
    <h3>Styling a toggle</h3>
    <p class="note">
      <code>v-model:pressed</code> turns a Button into a toggle, and a ghost, outline or secondary
      one already looks pressed when it's on. For your own look, bind a class from the same value.
      To style every toggle in the app at once, target <code>[aria-pressed='true']</code>, which
      Button sets for you, from ConfigProvider's <code>button.ui.root</code>, or use Tailwind's
      <code>aria-pressed:</code> variant. Your styles win over vael-ui's without
      <code>!important</code>.
    </p>
    <div class="row">
      <Button
        v-for="item in items"
        :key="item.id"
        v-model:pressed="item.starred"
        variant="ghost"
        icon
        :class="{ starred: item.starred }"
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
.starred {
  color: var(--ui-warning);
  /* The box is painted by the button's own layer; recolour it through this variable. */
  --ui-button-bg: color-mix(in oklab, var(--ui-warning) 14%, transparent);
}
</style>
