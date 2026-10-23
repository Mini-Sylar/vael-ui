<template>
  <section id="motion" class="motion-section">
    <h2>
      {{ t('component.motion') }}
      <span class="new-dot">{{ t('component.new') }}</span>
    </h2>
    <p v-if="info.doc" class="lede"><RichText :text="info.doc" /></p>
    <CodeBlock lang="vue" :code="snippet" />
    <div class="table-frame">
      <table>
        <thead>
          <tr>
            <th scope="col">{{ t('metaTable.name') }}</th>
            <th scope="col">{{ t('metaTable.type') }}</th>
            <th scope="col">{{ t('metaTable.description') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :id="`motion-${row.id}`" :key="row.id">
            <th scope="row" class="name-cell">
              <a class="name" :href="`#motion-${row.id}`">
                <code v-for="key in row.keys" :key="key">{{ key }}</code>
              </a>
            </th>
            <td class="takes-cell">
              <span v-if="row.chips" class="chips">
                <code v-for="chip in row.chips" :key="chip" class="chip">{{ chip }}</code>
              </span>
              <InlineCode v-else :code="row.takes" lang="type" />
            </td>
            <td class="description-cell"><RichText :text="row.does" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import CodeBlock from './CodeBlock.vue'
import InlineCode from './InlineCode.vue'
import RichText from './RichText.vue'

export interface MotionInfo {
  type: string
  doc: string
  parts: string[]
  states: string[]
  kinds: string[]
  extras: { key: string; type: string; doc: string }[]
}

const props = defineProps<{ name: string; info: MotionInfo }>()
const { t } = useI18n()

// The part a first try would animate: the panel of an overlay, the row of a list, else the root.
const MAIN = ['panel', 'row', 'item', 'toast', 'chip', 'action', 'root', 'thumb', 'track']
const main = computed(() => MAIN.find((p) => props.info.parts.includes(p)) ?? props.info.parts[0])

const snippet = computed(() => {
  const { kinds, states } = props.info
  const part = main.value
  let motion: string
  if (kinds.includes('list'))
    motion = `{ initial: { ${part}: { opacity: 0, y: 8 } }, stagger: 0.04 }`
  else if (kinds.includes('overlay'))
    motion = `{\n    initial: { ${part}: { opacity: 0, y: 8, scale: 0.98 } },\n    spring: { damping: 0.85, response: 0.35 },\n  }`
  else if (states.length) motion = `{ states: { ${states[0]}: { ${part}: { scale: 1.04 } } } }`
  else motion = `{ initial: { ${part}: { opacity: 0, y: 4 } } }`
  return `<${props.name}\n  :motion="${motion}"\n/>`
})

interface Row {
  id: string
  keys: string[]
  takes: string
  chips?: string[]
  does: string
}
const KINDS: Record<string, Omit<Row, 'id'>> = {
  overlay: {
    keys: ['morph', 'linked', 'exitOrder'],
    takes: "'trigger' | Record<string, LinkedMotion> | 'reverse'",
    does: "`morph: 'trigger'` grows it out of the element that opened it. `linked` moves other elements with it, such as the page receding behind it. `exitOrder: 'reverse'` closes its children first.",
  },
  list: {
    keys: ['stagger', 'leaving', 'appear'],
    takes: "number | 'pop' | 'hold' | boolean",
    does: "Items coming in together start `stagger` seconds apart. A leaving item lifts out so the rest close the gap (`'pop'`), or keeps its space until it's gone (`'hold'`). `appear: true` also brings in the items already there when it mounts.",
  },
  indicator: {
    keys: ['move'],
    takes: '(parts, context) => animation',
    does: 'Moves its sliding indicator. A `spring` retimes it, and a `move` hook animates it with your own library, starting from `context.from`.',
  },
  swap: {
    keys: ['swap', 'resize'],
    takes: "'sync' | 'wait' | boolean",
    does: "Content that changes while it's open crossfades (`'sync'`) or waits for the old view to leave (`'wait'`), and the box eases to its new size unless `resize: false`.",
  },
  value: {
    keys: ['spring'],
    takes: '{ damping, response }',
    does: 'Times how its value moves when it changes, from the steppers, the keyboard or your code.',
  },
}

const rows = computed<Row[]>(() => {
  const { parts, states, kinds, extras } = props.info
  const out: Row[] = [
    {
      id: 'initial',
      keys: ['initial', 'exit'],
      takes: '',
      chips: parts,
      does: 'Sets where each part comes in from and leaves to: any CSS property, plus `x`, `y` and `blur`. A plain number is px, or degrees for `rotate`.',
    },
  ]
  if (states.length)
    out.push({
      id: 'states',
      keys: ['states'],
      takes: '',
      chips: states,
      does: 'Sets values per part that hold while a state is on. An array is a set of keyframes that plays once as the state turns on, such as a shake on `invalid`.',
    })
  out.push({
    id: 'hooks',
    keys: ['enter', 'leave'],
    takes: '(parts, context) => animation',
    does: 'Animates the parts with GSAP, motion or `element.animate()`. Return the animation and the component waits for it, and stops it if interrupted.',
  })
  for (const kind of kinds) if (KINDS[kind]) out.push({ id: kind, ...KINDS[kind]! })
  for (const extra of extras)
    out.push({ id: extra.key, keys: [extra.key], takes: extra.type, does: extra.doc })
  out.push(
    {
      id: 'timing',
      keys: ['spring', 'duration', 'easing'],
      takes: '{ damping, response } | number | string',
      does: 'Times all of it: a spring, or a duration in ms with an easing. Never both.',
    },
    {
      id: 'off',
      keys: ['false'],
      takes: 'boolean',
      does: 'Turns its motion off, for an animation of your own on its exposed elements.',
    },
  )
  return out
})
</script>

<style scoped>
.motion-section {
  container-type: inline-size;
  position: relative;
  margin-top: 3.5rem;
  padding-top: 2.25rem;
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}

/* Set apart from the API tables by a band of dither that fades out toward the edges. */
.motion-section::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  block-size: 1.25rem;
  background: radial-gradient(circle, var(--ui-text-muted) 0.6px, transparent 0.9px) 0 0 / 5px 5px;
  opacity: 0.35;
  mask-image: radial-gradient(ellipse 60% 100% at 50% 0%, #000, transparent 75%);
  pointer-events: none;
}

h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  margin-bottom: 0.6rem;
}

.new-dot {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 12%, transparent);
  color: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 75%, var(--ui-text));
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.new-dot::before {
  content: '';
  inline-size: 0.375rem;
  block-size: 0.375rem;
  border-radius: 50%;
  background: currentColor;
}

.lede {
  max-inline-size: 46rem;
  margin: 0 0 1rem;
  color: var(--ui-text-muted);
}

.table-frame {
  margin-top: 1rem;
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
  text-align: left;
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

tbody tr {
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}

tbody tr:target {
  background: color-mix(in oklch, var(--docs-accent, var(--ui-info)) 10%, transparent);
}

.name-cell {
  font-weight: 400;
}

.name {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  color: var(--ui-text);
  text-decoration: none;
}

.name code {
  font-size: 0.92em;
  font-weight: 600;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.chip {
  padding: 0.05rem 0.4rem;
  border-radius: 6px;
  background: var(--ui-muted);
  font-size: 0.8125rem;
}

/* Narrow: each row becomes a card, the type under the name. */
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
}
</style>
