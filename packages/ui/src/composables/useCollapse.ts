import { onScopeDispose, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import type { ElRef } from './dom'

export type CollapseState = 'open' | 'closed' | 'opening' | 'closing'

export interface UseCollapseOptions {
  /** The element whose block-size is measured and animated. */
  el: ElRef<HTMLElement | null>
  /** `false` hands the height over entirely: no inline styles are written, open or closed, so a consumer's own tween isn't cut off. `state` still reports open/closed. */
  motionCss?: () => boolean
  /**
   * Whether `motionCss: false` hands the height over (no inline styles) or just makes the change
   * instant. Defaults to handing over; an app-wide "no animations" switch wants instant.
   */
  handOff?: () => boolean
}

export interface UseCollapseReturn {
  /** Bind directly: `:style="style"`. Empty once open and settled, so the panel stays responsive to content/viewport changes instead of pinned at a stale px value. */
  style: Ref<Record<string, string>>
  state: Ref<CollapseState>
}

// Slack past the panel's own transition before the fallback settles it.
const SETTLE_BUFFER_MS = 50

function toMs(value: string) {
  return value
    .split(',')
    .map((part) => Number.parseFloat(part) * (part.includes('ms') ? 1 : 1000) || 0)
}

// Longest duration + delay on the panel, so a themed --ui-duration-enter isn't cut short.
// Zero (reduced motion, `transition: none`) means no transitionend will ever come.
function transitionMs(el: HTMLElement) {
  const style = getComputedStyle(el)
  const durations = toMs(style.transitionDuration)
  const delays = toMs(style.transitionDelay)
  let longest = 0
  durations.forEach((duration, i) => {
    longest = Math.max(longest, duration + (delays[i % delays.length] ?? 0))
  })
  return longest
}

function closedStyle(): Record<string, string> {
  return { blockSize: '0px', overflow: 'hidden', visibility: 'hidden' }
}

export function useCollapse(open: Ref<boolean>, options: UseCollapseOptions): UseCollapseReturn {
  const motionOff = () => options.motionCss?.() === false
  const handOff = () => motionOff() && (options.handOff?.() ?? true)
  const style = shallowRef<Record<string, string>>(open.value || handOff() ? {} : closedStyle())
  const state = shallowRef<CollapseState>(open.value ? 'open' : 'closed')

  let token: symbol | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined

  function settle(target: boolean) {
    token = null
    clearTimeout(fallbackTimer)
    style.value = target || handOff() ? {} : closedStyle()
    state.value = target ? 'open' : 'closed'
  }

  useEventListener(
    () => options.el.value,
    'transitionend',
    (event: TransitionEvent) => {
      if (event.target !== options.el.value || event.propertyName !== 'block-size') return
      if (token) settle(open.value)
    },
  )

  async function run(target: boolean) {
    clearTimeout(fallbackTimer)
    const panel = options.el.value
    const myToken = Symbol('collapse')
    token = myToken

    if (!panel || motionOff()) {
      settle(target)
      return
    }

    state.value = target ? 'opening' : 'closing'
    const currentHeight = panel.getBoundingClientRect().height
    style.value = { blockSize: `${currentHeight}px`, overflow: 'hidden', visibility: 'visible' }

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    if (token !== myToken) return

    const targetHeight = target ? panel.scrollHeight : 0
    if (targetHeight === currentHeight) {
      settle(target)
      return
    }
    style.value = { blockSize: `${targetHeight}px`, overflow: 'hidden', visibility: 'visible' }
    const duration = transitionMs(panel)
    fallbackTimer = setTimeout(
      () => {
        if (token === myToken) settle(target)
      },
      duration > 0 ? duration + SETTLE_BUFFER_MS : 0,
    )
  }

  watch(open, (value) => run(value))
  onScopeDispose(() => clearTimeout(fallbackTimer))

  return { style, state }
}
