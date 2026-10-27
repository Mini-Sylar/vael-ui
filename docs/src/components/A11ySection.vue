<template>
  <section id="accessibility" class="a11y-section">
    <h2>{{ t('component.accessibility') }}</h2>
    <p v-if="info.pattern" class="lede">
      <i18n-t keypath="component.a11yPattern" tag="span">
        <template #pattern>
          <a :href="info.pattern.url" target="_blank" rel="noopener">{{ info.pattern.name }}</a>
        </template>
      </i18n-t>
    </p>
    <div v-if="info.keyboard.length" class="table-frame">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('component.a11yKey') }}</th>
            <th scope="col">{{ t('component.a11yAction') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in info.keyboard" :key="row.keys">
            <th scope="row" class="keys-cell">
              <span v-for="(alternative, i) in alternatives(row.keys)" :key="i" class="keys">
                <template v-for="(key, j) in alternative" :key="j">
                  <span v-if="j > 0" class="joiner" aria-hidden="true">+</span>
                  <Kbd v-if="KEYS.has(key)">{{ key }}</Kbd>
                  <span v-else class="key-text">{{ key }}</span>
                </template>
              </span>
            </th>
            <td><RichText :text="row.action" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="lede">{{ t('component.a11yNoKeys') }}</p>
    <ul v-if="info.notes.length" class="notes">
      <li v-for="note in info.notes" :key="note"><RichText :text="note" /></li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Kbd } from 'vael-ui'
import RichText from './RichText.vue'
import type { A11yInfo } from '../a11yContent'

defineProps<{ info: A11yInfo }>()
const { t } = useI18n()

// Real keys get a key cap; anything else ("A letter") reads as text.
const KEYS = new Set([
  'Enter',
  'Space',
  'Escape',
  'Tab',
  'Shift',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Backspace',
  'Delete',
])
const alternatives = (keys: string) =>
  keys.split(' / ').map((alternative) => alternative.split(' + '))
</script>

<style scoped>
.a11y-section {
  container-type: inline-size;
  margin-top: 3rem;
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}

h2 {
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.6rem;
}

.lede {
  max-inline-size: 46rem;
  margin: 0 0 1rem;
  color: var(--ui-text-muted);
}

.table-frame {
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9375rem;
  line-height: 1.55;
}

th,
td {
  text-align: start;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: var(--ui-muted);
  white-space: nowrap;
}

tbody tr:last-child > * {
  border-bottom: none;
}

.keys-cell {
  font-weight: 400;
  inline-size: 14rem;
}

.keys {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  margin-inline-end: 0.5rem;
}

.joiner,
.key-text {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

.notes {
  max-inline-size: 46rem;
  margin: 1rem 0 0;
  padding-inline-start: 1.1rem;
  color: var(--ui-text);
  line-height: 1.6;
}

.notes li + li {
  margin-top: 0.35rem;
}

/* Narrow: each row stacks, the action under its keys. */
@container (max-width: 34rem) {
  thead {
    display: none;
  }
  tr,
  th,
  td {
    display: block;
  }
  th,
  td {
    border-bottom: none;
    padding-block: 0.35rem;
  }
  tr {
    border-bottom: 1px solid var(--ui-border);
    padding-block: 0.5rem;
  }
  .keys-cell {
    inline-size: auto;
  }
}
</style>
