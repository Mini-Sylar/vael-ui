<template>
  <div
    ref="root"
    :class="rootPart.class"
    :style="[springVars, rootPart.style]"
    data-accordion-root
    @keydown="onKeydown"
    v-bind="attrs"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export interface AccordionContext {
  isOpen: (value: string) => boolean
  toggle: (value: string) => void
  motion: () => boolean
  /** The `motion` object, for each item's `states`. */
  states: () => unknown
  handOff: () => boolean
  headingLevel: () => 1 | 2 | 3 | 4 | 5 | 6
}

export const accordionKey: InjectionKey<AccordionContext> = Symbol('ui-accordion')
</script>

<script setup lang="ts" generic="V extends string | string[] | null = string | string[] | null">
import './Accordion.css'
import { defaultsKey, withProviderDefaults } from '../../config'
import '../shared/tokens.css'
import { computed, inject, provide, useAttrs, useTemplateRef } from 'vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import type { AccordionMotion, Spring } from '../../motion/types'
import { useThemedUi } from '../../theme'
import { springEasing, springOf } from '../../composables/springEasing'
import { useMotionStyle } from '../../motion/context'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
/** Open item's `value` (a `string`, or a union of your item values), or an array of them with `multiple`. `V` takes the type you bind, and `@change` hands the same type back. @default null */
const value = defineModel<V>('value')

const rawProps = withDefaults(
  defineProps<{
    /** Lets several items be open at once; the model becomes an array. @default false */
    multiple?: boolean
    /** Whether the last open item can close, leaving none open. @default true */
    collapsible?: boolean
    /**
     * `false` turns the transitions off, so you can animate each item's exposed `panelEl` and
     * `chevronEl` yourself. An object animates each item's states, like a quarter-turn chevron:
     * `{ states: { open: { chevron: { rotate: '90deg' } } } }`. @default true
     */
    motion?: AccordionMotion
    /** Heading level wrapping each item's trigger; match it to the surrounding outline. @default 3 */
    headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue }>
  }>(),
  { multiple: false, collapsible: true, motion: undefined, headingLevel: 3 },
)
const props = withProviderDefaults(rawProps, { motion: true })

const emit = defineEmits<{
  /** Fires when an item opens or closes, with the new value. */
  change: [value: V]
}>()

// Items report plain strings; the model's narrower type is the caller's to choose.
const current = () => (value.value ?? null) as string | string[] | null
function commit(next: string | string[] | null) {
  value.value = next as typeof value.value
  emit('change', next as V)
}

function isOpen(itemValue: string): boolean {
  const open = current()
  return props.multiple ? Array.isArray(open) && open.includes(itemValue) : open === itemValue
}

function toggle(itemValue: string) {
  const open = current()
  if (props.multiple) {
    const list = Array.isArray(open) ? open : []
    const opening = !list.includes(itemValue)
    if (!opening && !props.collapsible && list.length === 1) return
    commit(opening ? [...list, itemValue] : list.filter((v) => v !== itemValue))
    return
  }
  const next = open === itemValue ? (props.collapsible ? null : open) : itemValue
  if (next !== open) commit(next)
}

// ARIA accordion pattern: arrows and Home/End move between this accordion's
// own triggers (not a nested accordion's), skipping disabled ones.
function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  const rootEl = root.value
  if (!rootEl || !target.matches('[data-accordion-trigger]')) return
  if (target.closest('[data-accordion-root]') !== rootEl) return
  const triggers = Array.from(
    rootEl.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]'),
  ).filter((el) => !el.disabled && el.closest('[data-accordion-root]') === rootEl)
  const index = triggers.indexOf(target as HTMLButtonElement)
  if (index === -1) return
  let next: HTMLButtonElement | undefined
  if (event.key === 'ArrowDown') next = triggers[(index + 1) % triggers.length]
  else if (event.key === 'ArrowUp') next = triggers[(index - 1 + triggers.length) % triggers.length]
  else if (event.key === 'Home') next = triggers[0]
  else if (event.key === 'End') next = triggers[triggers.length - 1]
  if (!next) return
  event.preventDefault()
  next.focus()
}

defineSlots<{
  /** The `AccordionItem`s. */
  default(): unknown
}>()

provide(accordionKey, {
  isOpen,
  toggle,
  motion: () => props.motion !== false,
  states: () => rawProps.motion,
  // Its own motion="false" hands the height over; a provider's just makes it instant.
  handOff: () => rawProps.motion === false,
  headingLevel: () => props.headingLevel,
})

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.accordion,
  () => props.ui,
)
const rootPart = computed(() => resolveUiPart(cx, themedUi()?.root, 'ui-accordion'))
// `{ spring }` retimes the height and the chevron: opening on your spring, closing on it without the
// bounce (an accordion is one reversible motion: same pace both ways). Your CSS can use them too.
const motionStyle = useMotionStyle()
const providerDefaults = inject(defaultsKey, undefined)
const springVars = computed(() => {
  const own = rawProps.motion
  const spring = springOf(
    ((typeof own === 'object' && own.spring) ||
      motionStyle?.value?.spring ||
      providerDefaults?.value.spring) as Spring | undefined,
  )
  if (!spring) return undefined
  const open = springEasing(spring)
  const close = springEasing({ damping: 1, response: spring.response ?? 0.32 })
  return {
    '--ui-accordion-ease': open.easing,
    '--ui-accordion-duration': `${open.duration}ms`,
    '--ui-accordion-ease-close': close.easing,
    '--ui-accordion-duration-close': `${close.duration}ms`,
  }
})

defineExpose({
  /** Root element. */
  el: root,
})
</script>
