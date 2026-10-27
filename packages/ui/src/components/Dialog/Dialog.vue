<template>
  <Teleport :to="teleportTarget">
    <Transition
      name="ui-dialog"
      appear
      v-bind="motionHooks"
      :css="!forceMount && motionTransition.css !== false"
      @enter="aimAtTrigger"
      @before-leave="aimAtTrigger"
      @after-leave="releaseScroll"
    >
      <div
        v-if="forceMount || open"
        v-show="open"
        ref="root"
        class="ui-dialog"
        :class="[
          `ui-dialog--${position}`,
          { 'ui-dialog--open': open, 'ui-dialog--edge': isEdgePanel },
        ]"
        :style="rootStyle"
        :data-ui-theme="themeScope"
        :data-state="isClosing ? 'closing' : 'open'"
        :data-maximized="maximized"
        :data-contained="contained || undefined"
        :data-force-mount="forceMount || undefined"
        :data-origin="fromTrigger ? 'trigger' : undefined"
        :data-ui-motion="motionTransition.css === false ? '' : undefined"
      >
        <div
          v-if="modal"
          ref="overlay"
          :class="overlayPart.class"
          :style="[overlayStyle, overlayPart.style]"
          aria-hidden="true"
          @mousedown.prevent
          @click="onOverlayClick"
        />
        <div
          ref="panel"
          data-ui-presence
          :role="role"
          :aria-modal="modal ? 'true' : undefined"
          tabindex="-1"
          :aria-labelledby="title ? titleId : undefined"
          :aria-describedby="description ? descriptionId : undefined"
          :class="panelPart.class"
          :style="[panelPart.style, panelStyle]"
          v-bind="panelAttrs"
        >
          <button
            v-if="maximizable"
            type="button"
            :class="maximizePart.class"
            :style="[maximizeStyle, maximizePart.style]"
            :aria-label="maximized ? messages.dialog.restore : messages.dialog.maximize"
            @click="toggleMaximize"
          >
            <svg
              v-if="!maximized"
              viewBox="0 0 16 16"
              width="14"
              height="14"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M6 3H3v3M10 3h3v3M6 13H3v-3M10 13h3v-3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M3 6h3V3M13 6h-3V3M3 10h3v3M13 10h-3v3"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            v-if="showClose"
            type="button"
            :class="closePart.class"
            :style="[closeStyle, closePart.style]"
            :aria-label="messages.dialog.close"
            @click="requestClose('trigger', $event)"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <header v-if="title || $slots.header" :class="headerPart.class" :style="headerPart.style">
            <slot name="header" :close="close">
              <h2 v-if="title" :id="titleId" :class="titlePart.class" :style="titlePart.style">
                {{ title }}
              </h2>
              <p
                v-if="description"
                :id="descriptionId"
                :class="descriptionPart.class"
                :style="descriptionPart.style"
              >
                {{ description }}
              </p>
            </slot>
          </header>
          <div :class="bodyPart.class" :style="bodyPart.style" v-scroll-mask="scrollFade">
            <!-- `swap`: one keyed root inside; the old view leaves as the new one comes in. -->
            <Transition
              v-if="motion.resolved.value.swap"
              :css="false"
              :mode="motion.resolved.value.swap === 'wait' ? 'out-in' : undefined"
              @enter="motion.swap.onEnter"
              @leave="motion.swap.onLeave"
            >
              <slot
                :close="close"
                :open="open"
                :isClosing="isClosing"
                :cancelClose="cancelClose"
                :panelEl="panelEl"
                :target="target"
                :phase="phase"
              />
            </Transition>
            <slot
              v-else
              :close="close"
              :open="open"
              :isClosing="isClosing"
              :cancelClose="cancelClose"
              :panelEl="panelEl"
              :target="target"
              :phase="phase"
            />
          </div>
          <footer v-if="$slots.footer" :class="footerPart.class" :style="footerPart.style">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'
import type { UiPartValue } from '../../classes'
import type { MotionPhase } from '../../motion/types'

/** @internal Set by Drawer: a `top` or `bottom` panel spans that edge and slides in from it. */
export const edgePanelKey: InjectionKey<boolean> = Symbol('vael-ui-edge-panel')

export type DialogSize = 'sm' | 'md' | 'lg'
/**
 * `left`/`right` are panels on that edge that slide in from it; `top`/`bottom` place the card near
 * that edge (a Drawer's are edge panels too).
 */
export type DialogPosition = 'center' | 'top' | 'bottom' | 'left' | 'right'

/** Exported so `useDialogService`'s `openDialog()` can forward the same options without duplicating them. */
export interface DialogProps {
  /** Renders the default header and wires `aria-labelledby` automatically. */
  title?: string
  /** Muted line under the title; wires `aria-describedby` automatically. */
  description?: string
  /** Panel width: `'sm'` is 22rem, `'md'` is 28rem, `'lg'` is 38rem. @default 'md' */
  size?: DialogSize
  /** Where the panel anchors in the viewport. @default 'center' */
  position?: DialogPosition
  /**
   * `'trigger'` zooms the panel out of the element that opened it, and back into it on close, for
   * a dialog that expands from a card or a button. Centred dialogs only. @default 'center'
   */
  origin?: 'center' | 'trigger'
  /**
   * Use `'alertdialog'` for urgent messages that need a response, such as confirmations. Screen readers announce it more assertively.
   * @default 'dialog'
   */
  role?: 'dialog' | 'alertdialog'
  /** Returns the element to focus on open; return `null` or `undefined` to focus the first focusable element. */
  initialFocus?: () => HTMLElement | null | undefined
  /** Shows the built-in close button (×). Hide it when the footer carries the only sensible actions. @default true */
  showClose?: boolean
  /**
   * `false` turns off the overlay, scroll lock, focus trap and the inert page behind it. Escape-close and layer stacking still apply.
   * @default true
   */
  modal?: boolean
  /**
   * `true` removes edge padding: a `top`/`bottom` Dialog sits flush to the viewport edge instead of
   * floating (a Drawer's always does).
   * @default false
   */
  flush?: boolean
  /** Escape key closes the panel. @default true */
  closeOnEsc?: boolean
  /**
   * Clicking the overlay closes the panel. Has no effect when `modal` is `false` (no overlay to click).
   * @default true
   */
  closeOnOverlay?: boolean
  /**
   * The browser or mobile back action closes the panel instead of leaving the page.
   * Opening pushes a history entry, and any other close removes it.
   * @default false
   */
  closeOnHistoryBack?: boolean
  /** Runs before the dialog closes. Return `true` to close it, `false` to keep it open, or a promise of either, like `() => confirmAction(…).result`. The dialog stays open while the promise is pending. */
  beforeClose?: BeforeClose<DialogCloseReason>
  /** Keeps it mounted while closed, toggled with `v-show`, so its content keeps its state. vael-ui then leaves its motion to you. @default false */
  forceMount?: boolean
  /**
   * How it moves: `false` for instantly, `{ spring }` to retime the built-in motion, states by part
   * (`initial: { panel: { … } }`), your `targets`, or `enter`/`leave` hooks for a library.
   * Unset, it follows the nearest ConfigProvider's style.
   */
  motion?: DialogMotion
  /** Teleport target: a CSS selector. Wins over `container` either way. */
  teleportTo?: string
  /** Scopes the panel to an element instead of the viewport. The overlay, scroll lock and modality
   * apply only inside it. It's also the teleport target unless you set `teleportTo`. */
  container?: DOMTarget
  /** Element to scroll-lock while open. Defaults to `container`; pass the inner scroller
   * when the container itself doesn't scroll. */
  scrollTarget?: DOMTarget
  /**
   * Masks the panel's top/bottom edge as its content scrolls under it, signaling there's more.
   * @default true
   */
  scrollFade?: boolean
  /** Adds a maximize/restore toggle to the header, filling the viewport when active. @default false */
  maximizable?: boolean
  /** Class and style overrides for each part. */
  ui?: Partial<{
    overlay: UiPartValue
    panel: UiPartValue
    header: UiPartValue
    title: UiPartValue
    description: UiPartValue
    body: UiPartValue
    footer: UiPartValue
    maximize: UiPartValue
    close: UiPartValue
  }>
}

/** What a template ref to Dialog gives you; Dialog is generic, so `InstanceType<typeof Dialog>` can't. */
export interface DialogExposed {
  panelEl: HTMLElement | null
  phase: MotionPhase
  overlayEl: HTMLElement | null
  isClosing: boolean
  close: () => void
  cancelClose: () => void
  maximized: boolean
}
</script>

<!-- v-if mode: Transition owns enter/exit; forceMount: v-show + consumer drives motion. -->
<!-- Generic over your target names, so `target('…')` autocompletes from `motion.targets`. -->
<script setup lang="ts" generic="N extends string = string">
import { FLING_SPRING } from '../../motion/springEasing'
import type { DialogCloseReason } from '../../composables/useDialog'
import type { BeforeClose } from '../../motion/types'
import './Dialog.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import {
  computed,
  inject,
  provide,
  ref,
  shallowRef,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import { useAttrListeners } from '../../composables/forwardedListeners'
import { useEventListener } from '@vueuse/core'
import { useDialog } from '../../composables/useDialog'
import type { DialogOpenChangeDetails } from '../../composables/useDialog'
import type { DOMTarget } from '../../composables/dom'
import { opener } from '../../composables/dom'
import { useMessages, dialogMessages } from '../../messages'
import { useClassMerge, resolveUiPart } from '../../classes'
import { themeScopeKey, useThemedUi } from '../../theme'
import { vScrollMask } from '../../directives/vScrollMask'
import { gestureKey, useComponentMotion } from '../../motion/useComponentMotion'
import type { MotionRef, DialogMotion, MotionValues } from '../../motion/types'

defineOptions({ inheritAttrs: false })

/** Whether the dialog is open. @default false */
const open = defineModel<boolean>('open', { default: false })
/**
 * Whether the panel fills the viewport. The built-in toggle manages it unless you bind `v-model:maximized`.
 * @default false
 */
const maximized = defineModel<boolean>('maximized', { default: false })

const props = withDefaults(
  defineProps<
    Omit<DialogProps, 'motion'> & {
      /**
       * How it moves: `false` for instantly, `{ spring }` to retime the built-in motion, states by part
       * (`initial: { panel: { … } }`), your `targets`, or `enter`/`leave` hooks for a library.
       * Unset, it follows the nearest ConfigProvider's style.
       */
      motion?: DialogMotion<N>
    }
  >(),
  {
    // Unset means "follow the app"; without this Vue would read a missing boolean prop as false.
    motion: undefined,
    size: 'md',
    position: 'center',
    origin: 'center',
    role: 'dialog',
    showClose: true,
    modal: true,
    flush: false,
    closeOnEsc: true,
    closeOnOverlay: true,
    closeOnHistoryBack: false,
    forceMount: false,
    scrollFade: true,
    maximizable: false,
  },
)

const emit = defineEmits<{
  /** Fires when a close is requested; call `details.cancel()` to keep the dialog open. */
  'open-change': [value: boolean, details: DialogOpenChangeDetails]
  /** Fires once it has finished opening. */
  'after-enter': []
  /** Fires once it has finished closing. */
  'after-leave': []
}>()

defineSlots<{
  /** Body content; receives `close`, `open`, `isClosing`, `cancelClose`, `panelEl`, `target` and `phase`. */
  default(props: {
    close: () => void
    open: boolean
    isClosing: boolean
    cancelClose: () => void
    panelEl: HTMLElement | null
    /** Marks an element to animate under one of your `motion.targets` names: `:ref="target('rows')"`. */
    target: (name: N) => MotionRef
    phase: MotionPhase
  }): unknown
  /** Replaces the default title/description header. */
  header(props: { close: () => void }): unknown
  /** Action row at the end of the panel. */
  footer(props: { close: () => void }): unknown
}>()

// Full panel (for FLIP demos and beforeClose measurement, not just scrollable middle).
const panelEl = useTemplateRef<HTMLElement>('panel')
const attrs = useAttrs()
const panelAttrs = useAttrListeners(
  () => panelEl.value,
  () => attrs,
)
// Exposed so a forceMount consumer can fade the backdrop with the panel.
const overlayEl = useTemplateRef<HTMLElement>('overlay')
// Outermost teleported node. `useInert` spares this rather than `panelEl` — otherwise
// the overlay is a sibling, goes inert, and stops dispatching the outside-click.
const rootEl = useTemplateRef<HTMLElement>('root')
const messages = useMessages({ dialog: dialogMessages })
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.dialog,
  () => props.ui,
)
const themeScope = inject(themeScopeKey, undefined)

const {
  isClosing,
  close,
  requestClose,
  cancelClose,
  container,
  contained,
  layerIndex,
  releaseScroll,
} = useDialog(open, {
  holdScrollUntilExit: true,
  panelEl,
  wrapperEl: rootEl,
  container: () => props.container ?? null,
  scrollTarget: () => props.scrollTarget ?? null,
  closeOnEsc: () => props.closeOnEsc,
  beforeClose: () => props.beforeClose,
  initialFocus: () => props.initialFocus?.(),
  modal: () => props.modal,
  closeOnHistoryBack: () => props.closeOnHistoryBack,
  onOpenChange: (value, details) => emit('open-change', value, details),
})

// The overlay's mousedown is prevented (template) so a click on it never moves focus to <body>:
// with closeOnOverlay off, focus must stay inside the still-open modal.
function onOverlayClick(event: MouseEvent) {
  if (props.closeOnOverlay) requestClose('outside', event)
}

// teleportTo has no default of its own, so an explicit teleportTo="body" is still
// distinguishable from never setting it, and can win over container either way.
// || not ??: an empty string is never a valid Teleport target, so it should fall
// through the same as unset instead of reaching document.querySelector('').
const teleportTarget = computed<string | HTMLElement>(
  () => props.teleportTo || container.value || 'body',
)

const titleId = useId()
const descriptionId = useId()

// STRUCTURAL: inlined for zero-CSS functionality; align-items/justify-content non-interpolable, padding/size animate instead.
const isSidePosition = computed(() => props.position === 'left' || props.position === 'right')
// A Drawer's top or bottom panel; dialogs opened inside it are their own.
const edgeSheet = inject(edgePanelKey, false)
provide(edgePanelKey, false)
const isEdgePanel = computed(
  () => edgeSheet && (props.position === 'top' || props.position === 'bottom'),
)
// Its stacking place, kept while it leaves: dropping it mid-exit slid a closing dialog under the one
// beneath. It also keeps the style below from changing at close, which in Vapor would hide a
// force-mount (v-show) dialog at once: Vapor marks it hidden before the leave, not after.
const stackIndex = computed<number>((previous) =>
  open.value ? Math.max(0, layerIndex()) : (previous ?? 0),
)
const rootStyle = computed<Record<string, string | number | undefined>>(() => ({
  position: contained.value ? 'absolute' : 'fixed',
  inset: 0,
  // Derives this Dialog's stacking position from useDialog's own real OPEN-order layer instead of
  // the single shared --ui-z-dialog constant every instance used before - Drawer/BottomSheet's own
  // always-mounted content (force-mount) means two instances can be simultaneously open with no
  // natural DOM-order tiebreak, and paint order then follows MOUNT order (declaration order in the
  // consuming template) rather than which one was actually opened more recently. Reads the index
  // from useDialog's own layer (via layerIndex above) rather than registering a second one here -
  // useDialog already pushes/pops it for focus-trap/Escape/scroll-lock, and a second registration
  // for the same dialog would give it two stack slots instead of one.
  zIndex: `calc(var(--ui-z-dialog, 50) + ${stackIndex.value})`,
  display: 'flex',
  alignItems: isSidePosition.value
    ? 'stretch'
    : props.position === 'top'
      ? 'flex-start'
      : props.position === 'bottom'
        ? 'flex-end'
        : 'center',
  justifyContent:
    props.position === 'left' ? 'flex-start' : props.position === 'right' ? 'flex-end' : 'center',
  padding:
    maximized.value || isSidePosition.value || isEdgePanel.value || props.flush ? '0' : '1rem',
  pointerEvents: props.modal ? undefined : 'none', // Non-modal: let clicks pass to page behind.
}))
const overlayStyle = {
  position: 'absolute',
  inset: 0,
  background: 'var(--ui-overlay, rgb(0 0 0 / 0.4))',
} as const
// Pin panel to px before maximizing (CSS can't transition auto); only non-maximized height is auto.
// Applied AFTER panelPart.style in the template (see :style below) so a consumer's own custom
// width/height (typically physical properties) can never permanently defeat maximize's logical
// inlineSize/blockSize — same-axis logical vs. physical conflicts resolve by declaration order.
const naturalPanelSize = ref<{ width: number; height: number } | null>(null)
// origin="trigger": what opened it (clicked or focused), so the panel grows out of it.
const fromTrigger = computed(() => props.origin === 'trigger' && props.position === 'center')
let triggerEl: HTMLElement | null = null
watch(
  open,
  (isOpen) => {
    if (isOpen && typeof document !== 'undefined') triggerEl = opener()
  },
  { immediate: true, flush: 'sync' },
)
const triggerOrigin = shallowRef<string>()
function aimAtTrigger() {
  const panel = panelEl.value
  if (!fromTrigger.value || !panel || !triggerEl?.isConnected || triggerEl === document.body) {
    triggerOrigin.value = undefined
    return
  }
  // offset* ignores the panel's own scale, so this is its resting box.
  const parent = (panel.offsetParent ?? rootEl.value)?.getBoundingClientRect()
  const trigger = triggerEl.getBoundingClientRect()
  if (!parent) return
  const x = trigger.left + trigger.width / 2 - (parent.left + panel.offsetLeft)
  const y = trigger.top + trigger.height / 2 - (parent.top + panel.offsetTop)
  triggerOrigin.value = `${Math.round(x)}px ${Math.round(y)}px`
  // Written now as well: the style binding lands a render later, after the first frames have scaled.
  panel.style.transformOrigin = triggerOrigin.value
}

const DRAWER = { duration: 'var(--ui-duration-drawer)', easing: 'var(--ui-ease-drawer)' } as const
const DRAWER_FADE = { duration: 'var(--ui-duration-drawer)', easing: 'var(--ui-ease-out)' } as const
type Look = { initial: Record<string, MotionValues>; exit: Record<string, MotionValues> }
/** Each position's built-in look: where the panel comes from, and leaves back to. */
function builtInLook(): Look {
  if (isSidePosition.value || isEdgePanel.value) {
    const axis = isSidePosition.value ? 'x' : 'y'
    const to = props.position === 'left' || props.position === 'top' ? '-100%' : '100%'
    return {
      initial: {
        panel: { [axis]: { value: to, ...DRAWER } },
        overlay: { opacity: { value: 0, ...DRAWER_FADE } },
      },
      exit: {
        // Off screen, the drawer curve's slow end is never seen and it flings: it leaves on a spring
        // from rest, the backdrop with it.
        panel: { [axis]: { value: to, spring: FLING_SPRING } },
        overlay: { opacity: { value: 0, spring: FLING_SPRING } },
      },
    }
  }
  const panel: MotionValues = fromTrigger.value
    ? { opacity: 0, scale: { value: '0.5', ...DRAWER } }
    : props.position === 'top'
      ? { opacity: 0, y: -12 }
      : props.position === 'bottom'
        ? { opacity: 0, y: 12 }
        : { opacity: 0, scale: '0.96' }
  const exit: MotionValues = fromTrigger.value ? { opacity: 0, scale: '0.5' } : panel
  return {
    initial: { panel, overlay: { opacity: 0 } },
    exit: { panel: exit, overlay: { opacity: 0 } },
  }
}

// A wrapping BottomSheet's drag; overlays opened inside this one don't inherit it.
const gesture = inject(gestureKey, null)
provide(gestureKey, () => null)
const motion = useComponentMotion({
  name: 'Dialog',
  role: 'overlay',
  key: 'dialog',
  mainPart: 'panel',
  // Its inner parts too, so `initial: { title: … }` moves the title; they only move when given values.
  parts: () => {
    const panel = panelEl.value
    const inner = (name: string) => panel?.querySelector(`.ui-dialog-${name}`) ?? null
    return {
      panel,
      overlay: overlayEl.value,
      header: inner('header'),
      title: inner('title'),
      description: inner('description'),
      body: inner('body'),
      footer: inner('footer'),
      maximize: inner('maximize'),
      close: inner('close'),
    }
  },
  root: () => panelEl.value,
  motion: () => props.motion,
  // The built-in look as data, played by the CSS engine: `{ spring }` alone keeps it, only the feel
  // changes. Plain values follow the shared timing (the enter tokens); the drawer slide and the
  // grow from the trigger keep the drawer curve, which ConfigProvider's spring drives.
  defaults: () => builtInLook().initial,
  exitDefaults: () => builtInLook().exit,
  timing: () => ({ duration: 'var(--ui-duration-enter)', easing: 'var(--ui-ease-out)' }),
  // forceMount means you drive the motion; otherwise the engine plays the built-in look too.
  owns: () => !props.forceMount,
  // morph: 'trigger' grows from the element that opened it.
  trigger: () => (triggerEl?.isConnected && triggerEl !== document.body ? triggerEl : null),
  open: () => open.value,
  gesture: () => gesture?.() ?? null,
  resizes: true,
})
const { target, phase } = motion
const motionTransition = motion.transition
// Whether this open's after-enter (or this close's after-leave) has been emitted.
let told = false
const motionHooks = computed(() => {
  const { css: _css, ...hooks } = motionTransition.value
  return {
    ...hooks,
    onBeforeEnter: (el: Element) => {
      hooks.onBeforeEnter?.(el)
      phase.value = 'entering'
      told = false
    },
    // Once per open and per close: v-if and v-show each run an enter, and each calls this.
    onAfterEnter: () => {
      phase.value = 'entered'
      if (!told) emit('after-enter')
      told = true
    },
    onBeforeLeave: () => {
      phase.value = 'leaving'
      told = false
    },
    onAfterLeave: () => {
      phase.value = 'left'
      if (!told) emit('after-leave')
      told = true
    },
  }
})
const panelStyle = computed<Record<string, string | undefined>>(() => {
  const base: Record<string, string | undefined> = {
    position: 'relative',
    pointerEvents: props.modal ? undefined : 'auto',
    transformOrigin: triggerOrigin.value,
  }
  if (maximized.value) {
    // dvw/dvh are viewport-relative; inside a container "maximized" means filling it.
    const fill = contained.value ? '100%' : undefined
    return {
      ...base,
      inlineSize: fill ?? '100dvw',
      blockSize: fill ?? '100dvh',
      maxBlockSize: fill ?? '100dvh',
    }
  }
  if (naturalPanelSize.value) {
    return {
      ...base,
      inlineSize: `${naturalPanelSize.value.width}px`,
      blockSize: `${naturalPanelSize.value.height}px`,
      maxBlockSize: `${naturalPanelSize.value.height}px`,
    }
  }
  return base
})
const closeStyle = {
  position: 'absolute',
  insetBlockStart: '0.75rem',
  insetInlineEnd: '0.75rem',
} as const
const maximizeStyle = computed<Record<string, string>>(() => ({
  position: 'absolute',
  insetBlockStart: '0.75rem',
  insetInlineEnd: props.showClose ? '3rem' : '0.75rem',
}))

// Blur mask hides reflow during maximize/restore animation (Emil Kowalski's crossfade technique).
const resizing = ref(false)

// transitionend is primary signal; setTimeout fallback for prefers-reduced-motion; resizeToken prevents stale cleanup.
let resizeToken: symbol | null = null
let resizeFallbackTimer: ReturnType<typeof setTimeout> | undefined

function settleResize() {
  resizeToken = null
  clearTimeout(resizeFallbackTimer)
  resizing.value = false
  if (!maximized.value) naturalPanelSize.value = null // release the px lock once settled, back to responsive auto
}

useEventListener(panelEl, 'transitionend', (event: TransitionEvent) => {
  if (event.target !== panelEl.value || event.propertyName !== 'inline-size') return
  if (resizeToken) settleResize()
})

async function toggleMaximize() {
  const goingToMaximize = !maximized.value
  if (goingToMaximize && panelEl.value) {
    const rect = panelEl.value.getBoundingClientRect()
    naturalPanelSize.value = { width: rect.width, height: rect.height }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }
  maximized.value = goingToMaximize
  resizing.value = true
  const myToken = Symbol('dialog-resize')
  resizeToken = myToken
  clearTimeout(resizeFallbackTimer)
  resizeFallbackTimer = setTimeout(() => {
    if (resizeToken === myToken) settleResize()
  }, 200) // matches --ui-duration-enter; fallback only, transitionend above is primary
}

const overlayPart = computed(() => resolveUiPart(cx, themedUi()?.overlay, 'ui-dialog-overlay'))
const panelPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.panel,
    'ui-dialog-panel',
    `ui-dialog-panel--${props.size}`,
    open.value && 'ui-dialog-panel--open',
    maximized.value && 'ui-dialog-panel--maximized',
    resizing.value && 'ui-dialog-panel--resizing',
  ),
)
const headerPart = computed(() => resolveUiPart(cx, themedUi()?.header, 'ui-dialog-header'))
const titlePart = computed(() => resolveUiPart(cx, themedUi()?.title, 'ui-dialog-title'))
const descriptionPart = computed(() =>
  resolveUiPart(cx, themedUi()?.description, 'ui-dialog-description'),
)
const bodyPart = computed(() => resolveUiPart(cx, themedUi()?.body, 'ui-dialog-body'))
const footerPart = computed(() => resolveUiPart(cx, themedUi()?.footer, 'ui-dialog-footer'))
const maximizePart = computed(() => resolveUiPart(cx, themedUi()?.maximize, 'ui-dialog-maximize'))
const closePart = computed(() => resolveUiPart(cx, themedUi()?.close, 'ui-dialog-close'))
defineExpose({
  /** Panel element (`null` while closed). */
  panelEl,
  /** `'entering' | 'entered' | 'leaving' | 'left'`. */
  phase,
  /**
   * Backdrop element. `null` while closed or when `modal` is `false`. With `forceMount`, an inline
   * `opacity` on it replaces the built-in fade.
   */
  overlayEl,
  /** `true` while a `beforeClose` close is pending. */
  isClosing,
  /** Closes the dialog, running `@open-change` and `beforeClose` first. */
  close,
  /** Cancels a close pending in `beforeClose` and keeps the dialog open. */
  cancelClose,
  /** Whether the panel is maximized. */
  maximized,
})
</script>
