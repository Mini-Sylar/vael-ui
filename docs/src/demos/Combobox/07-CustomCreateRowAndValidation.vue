<template>
  <section class="demo">
    <h3>Custom Create row, validated <code>@create</code></h3>
    <p class="note">
      <code>#create</code> replaces the row's content while the library keeps its keyboard and click
      behavior, so anything goes in there: here motion-v springs the row in, turns the icon when the
      row is active, and flips the typed text in on each keystroke. <code>@create</code> receives
      <code>{ reason, cancel }</code>: calling <code>cancel()</code> vetoes the commit, here for
      anything with a space in it.
    </p>
    <div class="row">
      <Combobox
        v-model="labels"
        :items="labelOptions"
        multiple
        allow-custom
        placeholder="Add labels"
        @create="onCreate"
      >
        <template #create="{ query, active }">
          <motion.span
            class="create-row"
            :initial="{ opacity: 0, x: -6 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ type: 'spring', duration: 0.3, bounce: 0.15 }"
          >
            <motion.span
              class="create-icon"
              :data-active="active || undefined"
              :animate="{ rotate: active ? 90 : 0, scale: active ? 1.15 : 1 }"
              :transition="{ type: 'spring', duration: 0.35, bounce: 0.3 }"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" width="10" height="10" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </motion.span>
            New label
            <motion.strong
              :key="query"
              class="create-query"
              :initial="{ opacity: 0, y: 4 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }"
              >{{ query }}</motion.strong
            >
          </motion.span>
        </template>
      </Combobox>
      <output class="panel-text" :data-error="error ? '' : undefined">
        {{ error || labels.join(', ') || '(none)' }}
      </output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { motion } from 'motion-v'
import { Combobox } from 'vael-ui'
import type { ComboboxCreateDetails, SelectItemData } from 'vael-ui'

const labelOptions = ref<SelectItemData[]>([
  { label: 'urgent', value: 'urgent' },
  { label: 'backend', value: 'backend' },
  { label: 'frontend', value: 'frontend' },
])
const labels = ref<(string | number)[]>([])
const error = shallowRef('')

function onCreate(query: string, details: ComboboxCreateDetails) {
  if (/\s/.test(query)) {
    details.cancel()
    error.value = `"${query}" can't contain spaces`
    return
  }
  error.value = ''
  labelOptions.value.push({ label: query, value: query })
}
</script>

<style scoped>
.row {
  display: flex;
  gap: 1rem;
}

.create-row {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  color: var(--ui-text-muted);
}

.create-icon {
  display: inline-grid;
  place-items: center;
  inline-size: 1.125rem;
  block-size: 1.125rem;
  border-radius: 999px;
  background: var(--ui-muted);
  transition:
    background-color var(--ui-duration-press) ease,
    color var(--ui-duration-press) ease;
}

.create-icon[data-active] {
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}

.create-query {
  display: inline-block;
  color: var(--ui-text);
}

.panel-text {
  font-size: 0.8125rem;
}

.panel-text[data-error] {
  color: var(--ui-danger);
}
</style>
