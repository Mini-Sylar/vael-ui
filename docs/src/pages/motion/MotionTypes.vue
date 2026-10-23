<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('motionDocs.types.title') }}</h1>
    <p class="lede" v-html="t('motionDocs.types.intro')" />

    <h2 id="autocomplete">{{ t('motionDocs.types.completeTitle') }}</h2>
    <p v-html="t('motionDocs.types.completeIntro')" />
    <SelectButton
      v-model="picked"
      :allow-empty="false"
      size="sm"
      :aria-label="t('motionDocs.types.component')"
      :items="PICKS.map((name) => ({ label: name, value: name }))"
    />
    <!-- Real code, with each name a spot your editor completes. Vue owns this code, so the inline
         highlighter leaves it alone. -->
    <div class="ty-editor" data-no-highlight>
      <div class="ty-editor-bar" aria-hidden="true">
        <span /><span /><span />
        <code>App.vue</code>
      </div>
      <div ref="codeEl" class="ty-code">
        <div v-for="(line, n) in code" :key="n" class="ty-line">
          <template v-for="(segment, i) in line" :key="i">
            <span v-if="typeof segment === 'string'">{{ segment }}</span>
            <button
              v-else
              type="button"
              class="ty-slot"
              :data-slot="segment.slot"
              :aria-pressed="open && caret === segment.slot"
              @click="press(segment.slot)"
            >
              {{ chosen[segment.slot] }}
            </button>
          </template>
        </div>
        <p v-if="!open" class="ty-hint">{{ t('motionDocs.types.completeHint') }}</p>
        <div
          v-else
          ref="completeEl"
          :key="`${picked}-${caret}`"
          class="ty-complete"
          :style="{ insetInlineStart: `${at.x}px`, insetBlockStart: `${at.y}px` }"
        >
          <ul>
            <li v-for="item in offers.items" :key="item.name">
              <button
                type="button"
                :data-on="item.name === chosen[caret] || undefined"
                @click="choose(item.name)"
              >
                <component :is="offers.icon" :size="13" aria-hidden="true" />
                <span>{{ item.name }}</span>
                <small>{{ item.hint }}</small>
              </button>
            </li>
          </ul>
          <p v-if="offers.more">{{ offers.more }}</p>
        </div>
      </div>
    </div>
    <p class="ty-note">
      <i18n-t keypath="motionDocs.types.completeNote" tag="span">
        <template #link>
          <RouterLink :to="{ name: 'component', params: { name: picked }, hash: '#motion' }">{{
            t('motionDocs.types.completeLink', { name: picked })
          }}</RouterLink>
        </template>
      </i18n-t>
    </p>

    <h2 id="mistakes">{{ t('motionDocs.types.mistakesTitle') }}</h2>
    <p v-html="t('motionDocs.types.mistakesIntro')" />
    <div class="ty-mistakes" data-no-highlight>
      <article v-for="mistake in MISTAKES" :key="mistake.id" class="ty-mistake">
        <strong>{{ t(`motionDocs.types.mistake.${mistake.id}`) }}</strong>
        <code class="ty-mistake-code"
          >{{ mistake.code.split(mistake.bad)[0] }}<span class="ty-squiggle">{{ mistake.bad }}</span
          >{{ mistake.code.split(mistake.bad).slice(1).join(mistake.bad) }}</code
        >
        <p class="ty-message">
          <PhXCircle :size="14" aria-hidden="true" />
          <span>{{ mistake.message }}</span>
        </p>
      </article>
    </div>

    <h2 id="units">{{ t('motionDocs.types.unitsTitle') }}</h2>
    <p v-html="t('motionDocs.types.unitsIntro')" />
    <ul class="ty-units">
      <li v-for="unit in UNITS" :key="unit.code">
        <code>{{ unit.code }}</code>
        <span class="ty-unit">{{ t(`motionDocs.types.unit.${unit.unit}`) }}</span>
      </li>
    </ul>

    <h2 id="tokens">{{ t('motionDocs.types.tokensTitle') }}</h2>
    <p v-html="t('motionDocs.types.tokensIntro')" />
    <div ref="tokensEl" class="ty-tokens">
      <ul class="ty-token-list">
        <li v-for="token in durations" :key="token.name">
          <code>{{ token.name }}</code>
          <span class="ty-bar" :style="{ inlineSize: `${Math.min(100, token.ms / 6)}%` }" />
          <span class="ty-value">{{ token.ms }} ms</span>
        </li>
      </ul>
      <ul class="ty-token-list">
        <li v-for="token in easings" :key="token.name">
          <code>{{ token.name }}</code>
          <svg
            class="ty-ease"
            viewBox="0 -10 100 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path :d="token.path" />
          </svg>
        </li>
      </ul>
    </div>

    <h2 id="console">{{ t('motionDocs.types.warningsTitle') }}</h2>
    <p v-html="t('motionDocs.types.warningsIntro')" />
    <div class="ty-console" role="log">
      <p v-for="warning in WARNINGS" :key="warning">
        <PhWarning :size="14" aria-hidden="true" />
        <span>[vael-ui motion] {{ warning }}</span>
      </p>
    </div>
    <p class="ty-note" v-html="t('motionDocs.types.devtools')" />
  </GuideLayout>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onMounted,
  reactive,
  shallowRef,
  useTemplateRef,
  watch,
} from 'vue'
import { useHead } from '@unhead/vue'
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import {
  PhCube,
  PhLightning,
  PhRuler,
  PhTimer,
  PhWarning,
  PhWaveSine,
  PhXCircle,
} from '@phosphor-icons/vue'
import { SelectButton } from 'vael-ui'
import GuideLayout from '../../components/GuideLayout.vue'
import { docsSettingsKey } from '../../docsSettings'
import motionMeta from '../../generated/motion-meta.json'

const { t } = useI18n()
useHead({ title: () => t('motionDocs.types.title') })

// ─── Autocomplete, from the same metadata as each page's Motion section ─────
type Slot = 'part' | 'value' | 'state' | 'easing' | 'duration'
type Segment = string | { slot: Slot }
interface Meta {
  type: string
  parts: string[]
  states: string[]
}
const PICKS = ['Dialog', 'Button', 'Toaster', 'Input', 'Tabs'] as const
const picked = shallowRef<(typeof PICKS)[number]>('Dialog')
const meta = computed(() => (motionMeta as Record<string, Meta>)[picked.value]!)
const firstOf = (names: string[], preferred: string[]) =>
  preferred.find((name) => names.includes(name)) ?? names[0] ?? 'root'

// What an editor offers for a value: the shorthands first, then any CSS property.
const VALUES = [
  { name: 'y', sample: '12', hint: 'px' },
  { name: 'x', sample: '12', hint: 'px' },
  { name: 'blur', sample: '4', hint: 'px' },
  { name: 'opacity', sample: '0', hint: 'number' },
  { name: 'scale', sample: "'0.96'", hint: 'string' },
  { name: 'rotate', sample: '-4', hint: 'deg' },
  { name: 'clipPath', sample: "'inset(0 0 100% 0)'", hint: 'string' },
  { name: 'filter', sample: "'saturate(0)'", hint: 'string' },
]
const EASES = ['out', 'in-out', 'drawer', 'pop', 'toast', 'indicator', 'number', 'text']
const DURATIONS = [
  'press',
  'enter',
  'exit',
  'drawer',
  'drawer-exit',
  'tooltip',
  'tooltip-exit',
  'toast',
  'toast-exit',
]

const chosen = reactive<Record<Slot, string>>({
  part: 'panel',
  value: 'y',
  state: '',
  easing: 'var(--ui-ease-out)',
  duration: "'var(--ui-duration-enter)'",
})
const caret = shallowRef<Slot>('part')
watch(
  picked,
  () => {
    chosen.part = firstOf(meta.value.parts, ['panel', 'toast', 'root'])
    chosen.state = meta.value.states[0] ?? ''
    if (caret.value === 'state' && !chosen.state) caret.value = 'part'
  },
  { immediate: true },
)

const code = computed<Segment[][]>(() => {
  const sample = VALUES.find((value) => value.name === chosen.value)?.sample ?? '0'
  const lines: Segment[][] = [
    [`<${picked.value} :motion="{`],
    ['  initial: { ', { slot: 'part' }, ': { ', { slot: 'value' }, `: ${sample} } },`],
  ]
  if (meta.value.states.length) {
    const part = firstOf(meta.value.parts, ['root', 'toast'])
    lines.push(['  states: { ', { slot: 'state' }, `: { ${part}: { scale: '1.02' } } },`])
  }
  lines.push(["  easing: '", { slot: 'easing' }, "',"])
  lines.push(['  duration: ', { slot: 'duration' }, ','])
  lines.push(['}" />'])
  return lines
})

const offers = computed(() => {
  const partType = meta.value.type.replace(/Motion$/, 'Part')
  switch (caret.value) {
    case 'part':
      return { icon: PhCube, items: meta.value.parts.map((name) => ({ name, hint: partType })) }
    case 'value':
      return {
        icon: PhRuler,
        items: VALUES.map(({ name, hint }) => ({ name, hint })),
        more: t('motionDocs.types.orAnyProperty'),
      }
    case 'state':
      return {
        icon: PhLightning,
        items: meta.value.states.map((name) => ({ name, hint: 'state' })),
      }
    case 'easing':
      return {
        icon: PhWaveSine,
        items: EASES.map((name) => ({ name: `var(--ui-ease-${name})`, hint: 'UiEase' })),
        more: t('motionDocs.types.orAnyEasing'),
      }
    default:
      return {
        icon: PhTimer,
        items: DURATIONS.map((name) => ({
          name: `'var(--ui-duration-${name})'`,
          hint: 'UiDuration',
        })),
        more: t('motionDocs.types.orMs'),
      }
  }
})

// Like an editor's list: it opens on a name, and picking, Escape or a click elsewhere closes it.
const open = shallowRef(true)
const completeEl = useTemplateRef<HTMLElement>('completeEl')
function press(slot: Slot) {
  open.value = !(open.value && caret.value === slot)
  caret.value = slot
}
function choose(name: string) {
  chosen[caret.value] = name
  open.value = false
}
onClickOutside(completeEl, () => (open.value = false), { ignore: ['.ty-slot'] })
onKeyStroke('Escape', () => (open.value = false))

// The list hangs under the spot being completed.
const codeEl = useTemplateRef<HTMLElement>('codeEl')
const at = reactive({ x: 0, y: 0 })
function place() {
  const slot = codeEl.value?.querySelector<HTMLElement>(`[data-slot="${caret.value}"]`)
  if (!slot) return
  at.x = slot.offsetLeft
  at.y = slot.offsetTop + slot.offsetHeight + 4
}
watch([open, caret, picked, () => chosen.value, () => chosen.part], () => nextTick(place))
onMounted(place)

// ─── Mistakes: each a pinned type error, with TypeScript's own message ──────
const MISTAKES = [
  {
    id: 'part',
    code: `<Dialog :motion="{ initial: { backdrop: { opacity: 0 } } }" />`,
    bad: 'backdrop',
    message: `'backdrop' does not exist in type 'PartValues<DialogPart>'.`,
  },
  {
    id: 'property',
    code: `<Dialog :motion="{ initial: { panel: { opacityy: 0 } } }" />`,
    bad: 'opacityy',
    message: `'opacityy' does not exist in type 'MotionValues | ((where: MotionWhere) => MotionValues)'.`,
  },
  {
    id: 'timing',
    code: `<Dialog :motion="{ spring: { damping: 1 }, duration: 200 }" />`,
    bad: 'duration',
    message: `Type 'number' is not assignable to type '"use spring, or duration with easing, not both"'.`,
  },
  {
    id: 'state',
    code: `<Input :motion="{ states: { success: { root: { opacity: 1 } } } }" />`,
    bad: 'success',
    message: `'success' does not exist in type 'StateMotion<"disabled" | "invalid" | "focus", InputPart>'.`,
  },
  {
    id: 'kind',
    code: `<Dialog :motion="{ stagger: 0.05 }" />`,
    bad: 'stagger',
    message: `'stagger' does not exist in type '… & OverlayMotion & SwapMotion'.`,
  },
  {
    id: 'version',
    code: `const style: MotionStyle = { spring: { damping: 1 } }`,
    bad: 'style',
    message: `Property 'version' is missing in type '{ spring: { damping: number; }; }' but required in type 'MotionStyle'.`,
  },
]

// ─── Units ──────────────────────────────────────────────────────────────────
const UNITS = [
  { code: 'duration: 250', unit: 'ms' },
  { code: 'delay: 0.1', unit: 's' },
  { code: 'stagger: 0.04', unit: 's' },
  { code: 'spring.response: 0.35', unit: 's' },
  { code: 'x: 12', unit: 'px' },
  { code: 'blur: 4', unit: 'px' },
  { code: 'rotate: 90', unit: 'deg' },
  { code: 'opacity: 0.5', unit: 'none' },
]

// ─── Tokens, read live: a preset in the header rewrites them ────────────────
const DURATION_TOKENS = ['press', 'enter', 'exit', 'tooltip', 'toast', 'drawer', 'drawer-exit']
const EASE_TOKENS = ['out', 'in-out', 'drawer', 'pop', 'toast', 'number']
const tokensEl = useTemplateRef<HTMLElement>('tokensEl')
const durations = shallowRef(
  DURATION_TOKENS.map((name) => ({ name: `--ui-duration-${name}`, ms: 0 })),
)
const easings = shallowRef(EASE_TOKENS.map((name) => ({ name: `--ui-ease-${name}`, path: '' })))

function toMs(raw: string): number {
  const value = Number.parseFloat(raw)
  if (Number.isNaN(value)) return 0
  return Math.round(raw.trim().endsWith('ms') ? value : value * 1000)
}
const KEYWORDS: Record<string, number[]> = {
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
  linear: [0, 0, 1, 1],
}
// The easing as a curve: progress across, value up. A spring's linear() can overshoot the top.
function curveOf(raw: string): string {
  const easing = raw.trim()
  const points: [number, number][] = []
  const linear = /^linear\((.*)\)$/s.exec(easing)
  if (linear) {
    const stops = linear[1]!.split(',').map((part) => Number.parseFloat(part))
    stops.forEach((y, i) => points.push([i / Math.max(1, stops.length - 1), y]))
  } else {
    const bezier = /cubic-bezier\(([^)]*)\)/.exec(easing)
    const [x1, y1, x2, y2] = bezier
      ? bezier[1]!.split(',').map(Number)
      : (KEYWORDS[easing] ?? [0, 0, 1, 1])
    for (let i = 0; i <= 32; i++) {
      const s = i / 32
      const at = (a: number, b: number) =>
        3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3
      points.push([at(x1!, x2!), at(y1!, y2!)])
    }
  }
  return `M${points.map(([x, y]) => `${(x * 100).toFixed(1)} ${(100 - y * 100).toFixed(1)}`).join(' L')}`
}
function readTokens() {
  const el = tokensEl.value
  if (!el) return
  const style = getComputedStyle(el)
  durations.value = durations.value.map((token) => ({
    ...token,
    ms: toMs(style.getPropertyValue(token.name)),
  }))
  easings.value = easings.value.map((token) => ({
    ...token,
    path: curveOf(style.getPropertyValue(token.name)),
  }))
}
onMounted(readTokens)
const settings = inject(docsSettingsKey, null)
watch(
  () => settings?.motionStyle.value,
  () => nextTick(() => requestAnimationFrame(readTokens)),
)

// ─── The console: motion's own dev warnings, word for word ──────────────────
const WARNINGS = [
  'Dialog enter: something was still animating when the hook returned. Return the animation so Dialog waits: `enter: (parts) => gsap.to(...)`.',
  '<div class="card"> has its own CSS transition on opacity, which motion animates too: they fight. Take it out of your CSS, or set it through the motion\'s values.',
  "`after: 'titel'` names nothing that was marked; starting without waiting.",
]

const tocLinks = computed(() => [
  { id: 'autocomplete', label: t('motionDocs.types.completeTitle') },
  { id: 'mistakes', label: t('motionDocs.types.mistakesTitle') },
  { id: 'units', label: t('motionDocs.types.unitsTitle') },
  { id: 'tokens', label: t('motionDocs.types.tokensTitle') },
  { id: 'console', label: t('motionDocs.types.warningsTitle') },
])
</script>

<style scoped>
.lede {
  max-inline-size: 38rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}

/* ─── The editor ─── */
.ty-editor {
  margin-block: 1rem 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  background: var(--ui-surface);
  overflow: hidden;
}
.ty-editor-bar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.ty-editor-bar span {
  inline-size: 0.55rem;
  block-size: 0.55rem;
  border-radius: 50%;
  background: color-mix(in oklch, var(--ui-text) 14%, transparent);
}
.ty-editor-bar code {
  margin-inline-start: 0.5rem;
  background: none;
}
/* Tall enough for the code and an open list under its last line. */
.ty-code {
  position: relative;
  min-block-size: 25rem;
  padding: 1rem 0;
  overflow-x: auto;
  font-family: var(--docs-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.9;
}
.ty-line {
  padding-inline: 1rem;
  white-space: pre;
}
/* A spot the editor completes: dotted, so it reads as something to press. */
.ty-slot {
  padding: 0 0.1rem;
  border: 0;
  border-radius: 3px;
  background: none;
  color: var(--docs-accent-ink, var(--ui-text));
  font: inherit;
  text-decoration: underline dotted color-mix(in oklch, currentColor 50%, transparent);
  text-underline-offset: 4px;
  cursor: pointer;
}
.ty-slot[aria-pressed='true'] {
  background: color-mix(in oklch, var(--ui-primary) 12%, transparent);
  text-decoration-color: transparent;
}
.ty-hint {
  position: absolute;
  inset-block-end: 1rem;
  inset-inline: 1rem;
  margin: 0;
  color: var(--ui-text-muted);
  font-family: var(--docs-font, inherit);
  font-size: 0.8125rem;
  text-align: center;
}
.ty-complete {
  position: absolute;
  z-index: 1;
  min-inline-size: 16rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--docs-radius) - 2px);
  background: var(--ui-surface);
  box-shadow:
    0 1px 2px rgb(0 0 0 / 0.06),
    0 8px 20px rgb(0 0 0 / 0.08);
  font-size: 0.75rem;
  line-height: 1.4;
  animation: ty-pop 140ms var(--ui-ease-out);
}
@keyframes ty-pop {
  from {
    opacity: 0;
    translate: 0 -3px;
  }
}
.ty-complete ul {
  display: grid;
  max-block-size: 13rem;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.ty-complete li button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  inline-size: 100%;
  padding: 0.25rem 0.5rem;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--ui-text);
  font: inherit;
  text-align: start;
  cursor: pointer;
}
.ty-complete li button:hover,
.ty-complete li button[data-on] {
  background: color-mix(in oklch, var(--ui-primary) 12%, transparent);
}
.ty-complete svg {
  flex-shrink: 0;
  color: var(--docs-accent, var(--ui-info));
}
.ty-complete small {
  margin-inline-start: auto;
  padding-inline-start: 1.5rem;
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
}
.ty-complete p {
  margin: 0.25rem 0 0;
  padding: 0.3rem 0.5rem 0.15rem;
  border-block-start: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  font-family: var(--docs-font, inherit);
}
.ty-note {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}

/* ─── Mistakes ─── */
.ty-mistakes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
  gap: 0.75rem;
  margin-block-end: 2rem;
}
.ty-mistake {
  display: grid;
  align-content: start;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
}
.ty-mistake strong {
  font-size: 0.875rem;
}
.ty-mistake-code {
  display: block;
  padding: 0.5rem 0.6rem;
  overflow-x: auto;
  border-radius: calc(var(--docs-radius) - 2px);
  background: var(--ui-muted);
  font-size: 0.75rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ty-squiggle {
  text-decoration: underline wavy var(--ui-danger);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.ty-message {
  display: flex;
  gap: 0.4rem;
  margin: 0;
  color: var(--ui-text-muted);
  font-family: var(--docs-mono, ui-monospace, monospace);
  font-size: 0.6875rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.ty-message svg {
  flex-shrink: 0;
  margin-block-start: 0.1rem;
  color: var(--ui-danger);
}

/* ─── Units ─── */
.ty-units {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 2rem;
  padding: 0;
  list-style: none;
}
.ty-units li {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  font-size: 0.8125rem;
}
.ty-units code {
  padding: 0.25rem 0.6rem;
  background: none;
}
.ty-unit {
  padding: 0.25rem 0.6rem;
  border-inline-start: 1px solid var(--ui-border);
  background: var(--ui-muted);
  color: var(--ui-text-muted);
}

/* ─── Tokens ─── */
.ty-tokens {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  gap: 0.75rem 2rem;
  margin-block-end: 2rem;
}
.ty-token-list {
  display: grid;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.ty-token-list li {
  display: grid;
  grid-template-columns: 11rem 1fr auto;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 1.75rem;
  font-size: 0.75rem;
}
.ty-token-list code {
  background: none;
  padding: 0;
}
.ty-bar {
  block-size: 0.35rem;
  border-radius: 999px;
  background: var(--ui-primary);
  transition: inline-size var(--ui-duration-number) var(--ui-ease-number);
}
.ty-value {
  color: var(--ui-text-muted);
  font-variant-numeric: tabular-nums;
}
.ty-ease {
  grid-column: span 2;
  inline-size: 100%;
  block-size: 1.75rem;
  overflow: visible;
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}

/* ─── Console ─── */
.ty-console {
  display: grid;
  gap: 0.15rem;
  padding: 0.5rem 0;
  border: 1px solid var(--ui-border);
  border-radius: var(--docs-radius);
  font-family: var(--docs-mono, ui-monospace, monospace);
  font-size: 0.75rem;
}
.ty-console p {
  display: flex;
  gap: 0.5rem;
  margin: 0;
  padding: 0.4rem 0.9rem;
  background: color-mix(in oklch, var(--ui-warning) 8%, transparent);
  color: var(--ui-text);
  overflow-wrap: anywhere;
}
.ty-console svg {
  flex-shrink: 0;
  margin-block-start: 0.1rem;
  color: var(--ui-warning);
}

@media (prefers-reduced-motion: reduce) {
  .ty-complete {
    animation: none;
  }
}
@media (max-width: 640px) {
  .ty-token-list li {
    grid-template-columns: 9rem 1fr auto;
  }
}
</style>
