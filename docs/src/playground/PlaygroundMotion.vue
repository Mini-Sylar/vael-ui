<template>
  <div class="pg-motion">
    <div class="pgm-head">
      <SelectButton
        :model-value="state.look"
        size="sm"
        aria-label="Motion"
        :allow-empty="false"
        :items="LOOKS"
        @update:model-value="(v) => (state.look = v as MotionTabState['look'])"
      />
      <Button v-if="state.look !== 'off'" variant="ghost" size="sm" @click="emit('replay')">
        <template #leading><PhArrowClockwise :size="12" aria-hidden="true" /></template>
        Replay
      </Button>
    </div>
    <p v-if="state.look === 'off'" class="pgm-note">
      <code>:motion="false"</code>: it appears and changes at once, for an animation of your own.
    </p>

    <template v-else>
      <!-- Timing: a spring, the thing to show off, or a duration with an easing. -->
      <section class="pgm-group">
        <header class="pgm-group-head">
          <span>Timing</span>
          <SelectButton
            v-model="state.timing.mode"
            size="sm"
            aria-label="Timing"
            :allow-empty="false"
            :items="[
              { label: 'Spring', value: 'spring' },
              { label: 'Duration', value: 'duration' },
              { label: 'Its own', value: 'own' },
            ]"
            @update:model-value="touch"
          />
        </header>
        <!-- The spring shows from the start; touching it makes it the timing. -->
        <template v-if="state.timing.mode !== 'duration'">
          <div class="pgm-presets">
            <button
              v-for="preset in SPRINGS"
              :key="preset.id"
              type="button"
              class="pgm-chip"
              :data-on="
                preset.damping === state.timing.damping && preset.response === state.timing.response
                  ? ''
                  : undefined
              "
              @click="setSpring(preset)"
            >
              {{ preset.id }}
            </button>
          </div>
          <svg class="pgm-curve" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="8" x2="120" y2="8" class="pgm-curve-target" />
            <path :d="curve" />
          </svg>
          <Row label="damping" :value="state.timing.damping.toFixed(2)">
            <Slider
              v-model="state.timing.damping"
              :min="0.2"
              :max="1.5"
              :step="0.05"
              aria-label="damping"
              @update:model-value="useSpring"
            />
          </Row>
          <Row label="response" :value="`${state.timing.response.toFixed(2)}s`">
            <Slider
              v-model="state.timing.response"
              :min="0.1"
              :max="1.2"
              :step="0.05"
              aria-label="response"
              @update:model-value="useSpring"
            />
          </Row>
        </template>
        <template v-else-if="state.timing.mode === 'duration'">
          <Row label="duration" :value="`${state.timing.duration}ms`">
            <Slider
              v-model="state.timing.duration"
              :min="80"
              :max="900"
              :step="10"
              aria-label="duration"
              @update:model-value="touch"
            />
          </Row>
          <Row label="easing">
            <Select
              v-model="state.timing.easing"
              size="sm"
              class="pgm-input"
              aria-label="easing"
              :items="EASINGS"
              @update:model-value="touch"
            />
          </Row>
        </template>
      </section>

      <!-- Where it comes in from (on open, or as it mounts) and leaves to. -->
      <section v-for="side in SIDES" :key="side.key" class="pgm-group">
        <header class="pgm-group-head">
          <span>{{ side.label }}</span>
          <Switch
            v-model="state[side.key].on"
            :aria-label="side.label"
            @update:model-value="touch"
          />
        </header>
        <template v-if="state[side.key].on">
          <Row v-if="info.parts.length > 1" label="part">
            <Select
              v-model="state[side.key].part"
              size="sm"
              class="pgm-input"
              aria-label="part"
              :items="partItems"
            />
          </Row>
          <ValueRows v-model="state[side.key].values" />
        </template>
      </section>

      <!-- States: what a part looks like while it's pressed, hovered, invalid, checked… -->
      <section v-if="info.states.length" class="pgm-group">
        <header class="pgm-group-head">
          <span>States</span>
          <Switch v-model="state.states.on" aria-label="States" @update:model-value="touch" />
        </header>
        <template v-if="state.states.on">
          <div class="pgm-presets">
            <button
              v-for="name in info.states"
              :key="name"
              type="button"
              class="pgm-chip"
              :data-on="state.states.current === name ? '' : undefined"
              @click="state.states.current = name"
            >
              {{ name }}<span v-if="state.states.by[name]" class="pgm-dot" aria-label="set" />
            </button>
          </div>
          <p class="pgm-note">{{ stateHint }}</p>
          <Row v-if="info.parts.length > 1" label="part">
            <Select
              v-model="currentState.part"
              size="sm"
              class="pgm-input"
              aria-label="part"
              :items="partItems"
            />
          </Row>
          <ValueRows v-model="currentState.values" />
        </template>
      </section>

      <section v-if="info.kinds.includes('list')" class="pgm-group">
        <header class="pgm-group-head">
          <span>List</span>
          <Switch v-model="state.list.on" aria-label="List" @update:model-value="touch" />
        </header>
        <template v-if="state.list.on">
          <Row label="stagger" :value="`${state.list.stagger.toFixed(2)}s`">
            <Slider
              v-model="state.list.stagger"
              :min="0"
              :max="0.2"
              :step="0.01"
              aria-label="stagger"
            />
          </Row>
          <Row label="leaving">
            <SelectButton
              v-model="state.list.leaving"
              size="sm"
              aria-label="leaving"
              :allow-empty="false"
              :items="[
                { label: 'pop', value: 'pop' },
                { label: 'hold', value: 'hold' },
              ]"
            />
          </Row>
          <Row label="appear"><Switch v-model="state.list.appear" aria-label="appear" /></Row>
        </template>
      </section>

      <section v-if="info.kinds.includes('overlay')" class="pgm-group">
        <header class="pgm-group-head">
          <span>Opening</span>
          <Switch v-model="state.overlay.on" aria-label="Opening" @update:model-value="touch" />
        </header>
        <template v-if="state.overlay.on">
          <Row label="morph"
            ><Switch v-model="state.overlay.morph" aria-label="morph from the trigger"
          /></Row>
          <p class="pgm-note">Grows out of the element that opened it, and back into it.</p>
          <Row label="exitOrder">
            <SelectButton
              v-model="state.overlay.exitOrder"
              size="sm"
              aria-label="exitOrder"
              :allow-empty="false"
              :items="[
                { label: 'together', value: 'together' },
                { label: 'reverse', value: 'reverse' },
              ]"
            />
          </Row>
        </template>
      </section>

      <section v-if="info.kinds.includes('swap')" class="pgm-group">
        <header class="pgm-group-head">
          <span>New content</span>
          <Switch v-model="state.swap.on" aria-label="New content" @update:model-value="touch" />
        </header>
        <template v-if="state.swap.on">
          <Row label="swap">
            <SelectButton
              v-model="state.swap.mode"
              size="sm"
              aria-label="swap"
              :allow-empty="false"
              :items="[
                { label: 'sync', value: 'sync' },
                { label: 'wait', value: 'wait' },
              ]"
            />
          </Row>
          <Row label="resize"><Switch v-model="state.swap.resize" aria-label="resize" /></Row>
        </template>
      </section>
    </template>
  </div>
</template>

<script lang="ts">
import type { MotionInfo } from '../components/MotionTable.vue'

export interface PartValues {
  fade: boolean
  x: number
  y: number
  scale: number
  rotate: number
  blur: number
}
export interface MotionTabState {
  look: 'default' | 'off' | 'yours'
  timing: {
    mode: 'spring' | 'duration' | 'own'
    damping: number
    response: number
    duration: number
    easing: string
  }
  enter: { on: boolean; part: string; values: PartValues }
  exit: { on: boolean; part: string; values: PartValues }
  states: {
    on: boolean
    current: string
    by: Record<string, { part: string; values: PartValues } | undefined>
  }
  list: { on: boolean; stagger: number; leaving: 'pop' | 'hold'; appear: boolean }
  overlay: { on: boolean; morph: boolean; exitOrder: 'together' | 'reverse' }
  swap: { on: boolean; mode: 'sync' | 'wait'; resize: boolean }
}

const MAIN_PARTS = ['panel', 'row', 'item', 'toast', 'chip', 'action', 'root', 'thumb', 'track']
const values = (over: Partial<PartValues> = {}): PartValues => ({
  fade: false,
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  blur: 0,
  ...over,
})

/** A fresh tab for a component: everything off, starting points that read well when turned on. */
export function freshMotionTab(info: MotionInfo | undefined): MotionTabState {
  const part = MAIN_PARTS.find((p) => info?.parts.includes(p)) ?? info?.parts[0] ?? 'root'
  return {
    look: 'default',
    timing: {
      mode: 'own',
      damping: 0.85,
      response: 0.35,
      duration: 250,
      easing: 'var(--ui-ease-out)',
    },
    enter: { on: false, part, values: values({ fade: true, y: 8, scale: 0.96 }) },
    exit: { on: false, part, values: values({ fade: true, scale: 0.98 }) },
    states: { on: false, current: info?.states[0] ?? '', by: {} },
    list: { on: false, stagger: 0.04, leaving: 'pop', appear: false },
    overlay: { on: false, morph: true, exitOrder: 'together' },
    swap: { on: false, mode: 'sync', resize: true },
  }
}

function toValues(v: PartValues): Record<string, number> {
  const out: Record<string, number> = {}
  if (v.fade) out.opacity = 0
  if (v.x) out.x = v.x
  if (v.y) out.y = v.y
  if (v.scale !== 1) out.scale = v.scale
  if (v.rotate) out.rotate = v.rotate
  if (v.blur) out.blur = v.blur
  return out
}

/** The `motion` the tab describes: unset, `false`, or only what you turned on. */
export function motionFromTab(m: MotionTabState): unknown {
  if (m.look === 'default') return undefined
  if (m.look === 'off') return false
  const out: Record<string, unknown> = {}
  if (m.timing.mode === 'spring')
    out.spring = { damping: m.timing.damping, response: m.timing.response }
  else if (m.timing.mode === 'duration') {
    out.duration = m.timing.duration
    out.easing = m.timing.easing
  }
  if (m.enter.on) out.initial = { [m.enter.part]: toValues(m.enter.values) }
  if (m.exit.on) out.exit = { [m.exit.part]: toValues(m.exit.values) }
  if (m.states.on) {
    const states: Record<string, unknown> = {}
    // A state's values are where it is while that state is on, so the fade means half opacity.
    for (const [name, set] of Object.entries(m.states.by))
      if (set) {
        const held = toValues(set.values)
        if ('opacity' in held) held.opacity = 0.5
        if (Object.keys(held).length) states[name] = { [set.part]: held }
      }
    if (Object.keys(states).length) out.states = states
  }
  if (m.list.on) {
    out.stagger = m.list.stagger
    out.leaving = m.list.leaving
    if (m.list.appear) out.appear = true
  }
  if (m.overlay.on) {
    if (m.overlay.morph) out.morph = 'trigger'
    if (m.overlay.exitOrder === 'reverse') out.exitOrder = 'reverse'
  }
  if (m.swap.on) {
    out.swap = m.swap.mode
    if (!m.swap.resize) out.resize = false
  }
  return out
}
</script>

<script setup lang="ts">
import { computed, defineComponent, h, watch } from 'vue'
import { PhArrowClockwise } from '@phosphor-icons/vue'
import { Button, Select, SelectButton, Slider, Switch } from 'vael-ui'

const props = defineProps<{ info: MotionInfo }>()
const emit = defineEmits<{ replay: [] }>()
const state = defineModel<MotionTabState>({ required: true })

const LOOKS = [
  { label: 'Default', value: 'default' },
  { label: 'Off', value: 'off' },
  { label: 'Yours', value: 'yours' },
]
const SPRINGS = [
  { id: 'snappy', damping: 1, response: 0.25 },
  { id: 'smooth', damping: 1, response: 0.4 },
  { id: 'bouncy', damping: 0.55, response: 0.45 },
  { id: 'gentle', damping: 0.9, response: 0.7 },
]
const EASINGS = [
  'var(--ui-ease-out)',
  'var(--ui-ease-in-out)',
  'var(--ui-ease-drawer)',
  'linear',
].map((value) => ({ label: value.replace(/var\(--ui-|\)/g, ''), value }))
const SIDES = [
  { key: 'enter', label: 'Comes in from' },
  { key: 'exit', label: 'Leaves to' },
] as const
const partItems = computed(() => props.info.parts.map((p) => ({ label: p, value: p })))

// Touching anything makes it yours.
const touch = () => {
  if (state.value.look === 'default') state.value.look = 'yours'
}
function useSpring() {
  state.value.timing.mode = 'spring'
  touch()
}
function setSpring(preset: { damping: number; response: number }) {
  state.value.timing = { ...state.value.timing, mode: 'spring', ...preset }
  touch()
}

// The spring's shape, small: where it starts, how it overshoots, where it settles.
const curve = computed(() => {
  const { damping: z, response } = state.value.timing
  const w = (2 * Math.PI) / response
  const points: string[] = []
  for (let i = 0; i <= 60; i++) {
    const s = (i / 60) * response * 2
    const x =
      z < 1
        ? 1 -
          Math.exp(-z * w * s) *
            (Math.cos(w * Math.sqrt(1 - z * z) * s) +
              (z / Math.sqrt(1 - z * z)) * Math.sin(w * Math.sqrt(1 - z * z) * s))
        : 1 - Math.exp(-w * s) * (1 + w * s)
    points.push(`${(i / 60) * 120},${38 - x * 30}`)
  }
  return `M${points.join(' L')}`
})

// A state gets its values the first time you pick it, starting where a press or a hover would.
watch(
  () => state.value.states.current,
  (name) => {
    state.value.states.by[name] ??= {
      part: props.info.parts.includes('root') ? 'root' : props.info.parts[0]!,
      values: values(name === 'active' ? { scale: 0.92 } : name === 'hover' ? { y: -2 } : {}),
    }
  },
  { immediate: true },
)
const currentState = computed(() => state.value.states.by[state.value.states.current]!)
const STATE_HINTS: Record<string, string> = {
  active: 'While it is pressed: by pointer, Space or Enter. Press the preview.',
  hover: 'While a mouse is over it. Point at the preview.',
  focus: 'While it has keyboard focus. Tab to the preview.',
  disabled: 'While it is disabled. Turn on disabled in Props.',
  loading: 'While it is loading.',
  invalid: 'While it is invalid. Turn on invalid in Props.',
  checked: 'While it is on. Click the preview.',
}
const stateHint = computed(
  () => STATE_HINTS[state.value.states.current] ?? `While ${state.value.states.current} is on.`,
)

// One labelled row: name, its value, its control.
const Row = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, default: undefined } },
  setup(rowProps, { slots }) {
    return () =>
      h('div', { class: 'pgm-row' }, [
        h('span', { class: 'pgm-label' }, [
          rowProps.label,
          rowProps.value !== undefined ? h('span', { class: 'pgm-value' }, rowProps.value) : null,
        ]),
        slots.default?.(),
      ])
  },
})
// The values a part can take: fade, move, scale, turn and blur.
const AXES = [
  { key: 'x', min: -40, max: 40, step: 2, unit: 'px' },
  { key: 'y', min: -40, max: 40, step: 2, unit: 'px' },
  { key: 'scale', min: 0.5, max: 1.5, step: 0.02, unit: '' },
  { key: 'rotate', min: -45, max: 45, step: 1, unit: '°' },
  { key: 'blur', min: 0, max: 16, step: 1, unit: 'px' },
] as const
const ValueRows = defineComponent({
  props: { modelValue: { type: Object as () => PartValues, required: true } },
  emits: ['update:modelValue'],
  setup(rowProps) {
    return () => {
      const v = rowProps.modelValue
      return [
        h(Row, { label: 'fade' }, () =>
          h(Switch, {
            modelValue: v.fade,
            'aria-label': 'fade',
            'onUpdate:modelValue': (on: boolean) => (v.fade = on),
          }),
        ),
        ...AXES.map((axis) =>
          h(Row, { key: axis.key, label: axis.key, value: `${v[axis.key]}${axis.unit}` }, () =>
            h(Slider, {
              modelValue: v[axis.key],
              min: axis.min,
              max: axis.max,
              step: axis.step,
              'aria-label': axis.key,
              'onUpdate:modelValue': (n: number | [number, number]) => (v[axis.key] = n as number),
            }),
          ),
        ),
      ]
    }
  },
})
</script>

<style scoped>
.pg-motion {
  display: grid;
  gap: 0.25rem;
  padding: 0.25rem 1rem 1rem;
}
.pgm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding-block: 0.5rem;
}
.pgm-group {
  display: grid;
  gap: 0.25rem;
  padding-block: 0.75rem 0.25rem;
  border-block-start: 1px solid var(--ui-border);
}
.pgm-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
}
.pg-motion :deep(.pgm-row) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 8.75rem;
  align-items: center;
  gap: 0.75rem;
  min-block-size: 2.25rem;
}
.pg-motion :deep(.pgm-label) {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.8125rem;
  white-space: nowrap;
}
.pg-motion :deep(.pgm-value) {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.pgm-input {
  inline-size: 8.75rem;
}
.pgm-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-block: 0.25rem;
}
.pgm-chip {
  position: relative;
  padding: 0.2rem 0.6rem;
  border: 1px solid var(--ui-border);
  border-radius: 999px;
  background: none;
  color: var(--ui-text);
  font: inherit;
  font-size: 0.8125rem;
  cursor: pointer;
}
.pgm-chip[data-on] {
  border-color: var(--ui-primary);
  background: color-mix(in oklch, var(--ui-primary) 10%, transparent);
}
.pgm-dot {
  display: inline-block;
  inline-size: 0.35rem;
  block-size: 0.35rem;
  margin-inline-start: 0.3rem;
  vertical-align: 0.15em;
  border-radius: 50%;
  background: var(--ui-primary);
}
.pgm-curve {
  inline-size: 100%;
  block-size: 3rem;
  overflow: visible;
  fill: none;
  stroke: var(--ui-primary);
  stroke-width: 1.5;
  vector-effect: non-scaling-stroke;
}
.pgm-curve-target {
  stroke: var(--ui-border);
  stroke-dasharray: 3 3;
}
.pgm-note {
  margin: 0.25rem 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
