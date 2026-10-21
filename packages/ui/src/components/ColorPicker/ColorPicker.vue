<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="rootPart.style"
    :data-state="disabled ? 'disabled' : undefined"
    :data-motion="props.motion ? undefined : 'off'"
    v-bind="attrs"
  >
    <Popover
      ref="popover"
      v-model:open="open"
      open-on-trigger-click
      side="bottom"
      align="start"
      role="dialog"
      tabindex="-1"
      :aria-label="label"
      :teleport-to="teleportTo"
      :ui="{
        panel: {
          class: panelPart.class,
          style: [panelPart.style, { '--ui-color-picker-radius': radius }],
        },
      }"
    >
      <template #trigger>
        <!-- A click anywhere in the trigger opens the panel, so a custom trigger needs no wiring. -->
        <slot name="trigger" :color="modelValue" :open="open">
          <button
            ref="swatchEl"
            type="button"
            :class="swatchPart.class"
            :style="[{ '--ui-color-picker-value': modelValue }, swatchPart.style]"
            :aria-label="label"
            aria-haspopup="dialog"
            :aria-expanded="open"
            :disabled="disabled"
          />
        </slot>
      </template>
      <template #default>
        <!-- Saturation across, brightness up: the whole plane is a target, so the thumb tracks the pointer 1:1. -->
        <div
          ref="areaEl"
          class="ui-color-picker-area"
          :style="{ '--ui-color-picker-hue': hueColor }"
          role="slider"
          tabindex="0"
          :aria-label="messages.colorPicker.saturationAndBrightness"
          :aria-valuetext="`${Math.round(hsv.s * 100)}% ${messages.colorPicker.saturation}, ${Math.round(hsv.v * 100)}% ${messages.colorPicker.brightness}`"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(hsv.v * 100)"
          :data-dragging="dragging || undefined"
          @pointerdown="onAreaPointerdown"
          @pointermove="onAreaPointermove"
          @pointerup="onAreaPointerup"
          @pointercancel="onAreaPointerup"
          @keydown="onAreaKeydown"
        >
          <span
            ref="thumbEl"
            class="ui-color-picker-area-thumb"
            :style="{
              left: `${hsv.s * 100}%`,
              top: `${(1 - hsv.v) * 100}%`,
              '--ui-color-picker-value': modelValue,
            }"
          />
        </div>
        <Slider
          v-model="hue"
          :max="360"
          :step="1"
          :aria-label="messages.colorPicker.hue"
          :value-text="(value) => `${Math.round(value)}°`"
          :ui="{ root: 'ui-color-picker-hue' }"
        />
        <div class="ui-color-picker-row">
          <Input
            :model-value="modelValue"
            size="sm"
            :ui="{ root: valuePart }"
            :aria-label="messages.colorPicker.hex"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            enterkeyhint="done"
            @change="onHexChange(($event.target as HTMLInputElement).value)"
          />
          <button
            v-if="showEyeDropper && eyeDropperSupported"
            type="button"
            class="ui-color-picker-eyedropper"
            :aria-label="messages.colorPicker.pickFromScreen"
            @click="pickFromScreen"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
              <path
                d="M10.5 2.5a1.6 1.6 0 0 1 2.3 2.3l-1.4 1.4.9.9-1.1 1.1-.9-.9-5.1 5.1a1 1 0 0 1-.5.3l-2.2.5.5-2.2a1 1 0 0 1 .3-.5l5.1-5.1-.9-.9 1.1-1.1.9.9 1.4-1.4Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
        <div
          v-if="presets && presets.length > 0"
          :class="presetsPart.class"
          :style="presetsPart.style"
        >
          <button
            v-for="preset in presets"
            :key="preset"
            type="button"
            :class="presetPart.class"
            :style="[{ '--ui-color-picker-value': preset }, presetPart.style]"
            :aria-label="preset"
            :aria-pressed="sameColor(preset, modelValue)"
            @click="pick(preset)"
          >
            <slot name="preset" :color="preset" :selected="sameColor(preset, modelValue)" />
          </button>
        </div>
        <slot :color="modelValue" :pick="pick" />
      </template>
    </Popover>
    <input v-if="name" type="hidden" :name="name" :value="modelValue" />
  </div>
</template>

<script lang="ts">
interface Hsv {
  h: number
  s: number
  v: number
}

const HEX = /^#[0-9a-f]{6}$/i

function hexToHsv(hex: string, previous?: Hsv): Hsv {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = previous?.h ?? 0
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6)
    else if (max === g) h = 60 * ((b - r) / d + 2)
    else h = 60 * ((r - g) / d + 4)
    if (h < 0) h += 360
  }
  // A grey has no hue and black no saturation; the previous ones stay so the thumbs don't jump.
  return { h, s: max > 0 ? d / max : (previous?.s ?? 0), v: max }
}

function hsvToHex({ h, s, v }: Hsv): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(5)}${f(3)}${f(1)}`
}
</script>

<script setup lang="ts">
import './ColorPicker.css'
import { withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, shallowRef, useAttrs, useTemplateRef, watch } from 'vue'
import Input from '../Input/Input.vue'
import Popover from '../Popover/Popover.vue'
import type { PopoverExposed } from '../Popover/Popover.vue'
import Slider from '../Slider/Slider.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useUiMessages } from '../../messages'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** The color as `#rrggbb`. @default '#000000' */
const modelValue = defineModel<string>({ default: '#000000' })
/** Whether the picker panel is open. @default false */
const open = defineModel<boolean>('open', { default: false })

const rawProps = withDefaults(
  defineProps<{
    /** Colors offered as swatches in the panel, as `#rrggbb`. */
    presets?: string[]
    /** Shows the eyedropper button in browsers that have one. @default true */
    showEyeDropper?: boolean
    /** Accessible label for the swatch and the panel. @default 'Color' */
    label?: string
    /** Native `name`, so a plain `<form>` submits the hex. */
    name?: string
    /** Disables the swatch. @default false */
    disabled?: boolean
    /** Swatch size. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /** Where the panel is teleported to. @default 'body' */
    teleportTo?: string | HTMLElement
    /** `false` skips the built-in transitions; use the exposed elements for your own. @default true */
    motion?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{
      root: UiPartValue
      swatch: UiPartValue
      panel: UiPartValue
      value: UiPartValue
      presets: UiPartValue
      preset: UiPartValue
    }>
  }>(),
  {
    showEyeDropper: true,
    label: 'Color',
    disabled: false,
    size: 'md',
    teleportTo: 'body',
    motion: undefined,
  },
)
const props = withProviderDefaults(rawProps, { motion: true })

defineSlots<{
  /** Replaces the swatch; a click on it opens the panel. */
  trigger(props: { color: string; open: boolean }): unknown
  /** Content inside each preset swatch, such as a check on the selected one. */
  preset(props: { color: string; selected: boolean }): unknown
  /** Extra panel content under the presets: recent colors, a note, your own controls. */
  default(props: { color: string; pick: (color: string) => void }): unknown
}>()

const messages = useUiMessages()

// A disabled picker stays shut whatever opens it.
watch(open, (value) => {
  if (value && props.disabled) open.value = false
})

const hsv = shallowRef<Hsv>(hexToHsv(HEX.test(modelValue.value) ? modelValue.value : '#000000'))
watch(
  modelValue,
  (value) => {
    if (!HEX.test(value)) return
    if (hsvToHex(hsv.value).toLowerCase() === value.toLowerCase()) return
    hsv.value = hexToHsv(value, hsv.value)
  },
  { immediate: true },
)
function setHsv(next: Hsv) {
  hsv.value = next
  modelValue.value = hsvToHex(next)
}
const hue = computed({
  get: () => hsv.value.h,
  set: (h) => setHsv({ ...hsv.value, h }),
})
const hueColor = computed(() => hsvToHex({ h: hsv.value.h, s: 1, v: 1 }))

function sameColor(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}
function pick(color: string) {
  modelValue.value = color.toLowerCase()
}
function onHexChange(value: string) {
  const text = value.trim()
  const hex = text.startsWith('#') ? text : `#${text}`
  if (HEX.test(hex)) pick(hex)
}

const areaEl = useTemplateRef<HTMLElement>('areaEl')
const dragging = shallowRef(false)
function setFromPointer(event: PointerEvent) {
  const area = areaEl.value
  if (!area) return
  const rect = area.getBoundingClientRect()
  const s = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const v = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
  setHsv({ h: hsv.value.h, s, v })
}
function onAreaPointerdown(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  areaEl.value?.setPointerCapture(event.pointerId)
  areaEl.value?.focus()
  dragging.value = true
  setFromPointer(event)
}
function onAreaPointermove(event: PointerEvent) {
  if (dragging.value) setFromPointer(event)
}
function onAreaPointerup(event: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  areaEl.value?.releasePointerCapture(event.pointerId)
}
function onAreaKeydown(event: KeyboardEvent) {
  const step = event.shiftKey ? 0.1 : 0.01
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [-step, 0],
    ArrowRight: [step, 0],
    ArrowUp: [0, step],
    ArrowDown: [0, -step],
  }
  const move = moves[event.key]
  if (!move) return
  event.preventDefault()
  setHsv({
    h: hsv.value.h,
    s: Math.min(1, Math.max(0, hsv.value.s + move[0])),
    v: Math.min(1, Math.max(0, hsv.value.v + move[1])),
  })
}

interface EyeDropperLike {
  open: () => Promise<{ sRGBHex: string }>
}
const eyeDropperSupported =
  typeof window !== 'undefined' && 'EyeDropper' in window && typeof window.EyeDropper === 'function'
async function pickFromScreen() {
  const Dropper = (window as unknown as { EyeDropper: new () => EyeDropperLike }).EyeDropper
  try {
    const result = await new Dropper().open()
    pick(result.sRGBHex)
  } catch {
    // Cancelled with Escape.
  }
}

const root = useTemplateRef<HTMLElement>('root')
const popover = useTemplateRef<PopoverExposed>('popover')
const swatchEl = useTemplateRef<HTMLButtonElement>('swatchEl')
const thumbEl = useTemplateRef<HTMLElement>('thumbEl')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.colorPicker,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(cx, themedUi()?.root, 'ui-color-picker', `ui-color-picker--${props.size}`),
)
const swatchPart = computed(() => resolveUiPart(cx, themedUi()?.swatch, 'ui-color-picker-swatch'))
const panelPart = computed(() => resolveUiPart(cx, themedUi()?.panel, 'ui-color-picker-panel'))
const valuePart = computed(() => resolveUiPart(cx, themedUi()?.value, 'ui-color-picker-value'))
const presetsPart = computed(() =>
  resolveUiPart(cx, themedUi()?.presets, 'ui-color-picker-presets'),
)
// The teleported panel can't inherit the root's custom property, so it's read and passed along.
const radius = shallowRef('')
watch(open, (value) => {
  if (value && root.value)
    radius.value = getComputedStyle(root.value).getPropertyValue('--ui-color-picker-radius')
})
const presetPart = computed(() => resolveUiPart(cx, themedUi()?.preset, 'ui-color-picker-preset'))

defineExpose({
  /** Root element. */
  el: root,
  /** The default swatch button; `null` with a `#trigger` slot. */
  swatchEl,
  /** The open panel; `null` while closed. */
  panelEl: computed(() => popover.value?.panelEl ?? null),
  /** The saturation and brightness plane; `null` while closed. */
  areaEl,
  /** The plane's thumb; `null` while closed. */
  thumbEl,
})
</script>
