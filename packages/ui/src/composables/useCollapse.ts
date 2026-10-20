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
  const observers: ResizeObserver[] = []

  function settle(target: boolean) {
    token = null
    clearTimeout(fallbackTimer)
    while (observers.length) observers.pop()!.disconnect()
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

  // The open height to the fraction of a pixel. scrollHeight rounds (51 for a 50.75px panel), so
  // a panel opened to it dropped by the remainder when the pin came off: a hop at the very end.
  // Read from the children's real boxes, which lay out at full size inside the clipped panel; the
  // panel clips (overflow: hidden), so their margins stay inside it. Loose text or out-of-flow
  // content can't be read that way, and keeps scrollHeight.
  function openHeight(panel: HTMLElement): number {
    const rounded = panel.scrollHeight
    let hasText = false
    for (const node of panel.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) hasText = true
    }
    const children = [...panel.children].filter((child) => {
      const position = getComputedStyle(child).position
      return position !== 'absolute' && position !== 'fixed'
    })
    if (hasText || children.length === 0) return rounded
    const box = getComputedStyle(panel)
    let bottom = -Infinity
    for (const child of children) {
      const marginEnd = Number.parseFloat(getComputedStyle(child).marginBlockEnd) || 0
      bottom = Math.max(bottom, child.getBoundingClientRect().bottom + marginEnd)
    }
    const exact =
      bottom -
      panel.getBoundingClientRect().top +
      (Number.parseFloat(box.paddingBlockEnd) || 0) +
      (Number.parseFloat(box.borderBlockEndWidth) || 0)
    // Within a pixel of what the browser reports, or something we can't see is adding height.
    return Math.abs(exact - rounded) < 1 ? exact : rounded
  }

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

    const targetHeight = target ? openHeight(panel) : 0
    if (Math.abs(targetHeight - currentHeight) < 0.01) {
      settle(target)
      return
    }
    const duration = transitionMs(panel)
    function pin(height: number) {
      style.value = { blockSize: `${height}px`, overflow: 'hidden', visibility: 'visible' }
      clearTimeout(fallbackTimer)
      fallbackTimer = setTimeout(
        () => {
          if (token === myToken) settle(target)
        },
        duration > 0 ? duration + SETTLE_BUFFER_MS : 0,
      )
    }
    pin(targetHeight)
    // Content that grows while the panel opens (a folder clicked inside it) retargets the
    // transition instead of being clipped until it settles.
    if (target && typeof ResizeObserver !== 'undefined') {
      let pinned = targetHeight
      const observer = new ResizeObserver(() => {
        if (token !== myToken) {
          observer.disconnect()
          return
        }
        const next = openHeight(panel)
        if (Math.abs(next - pinned) >= 0.01) {
          pinned = next
          pin(next)
        }
      })
      for (const child of panel.children) observer.observe(child)
      observers.push(observer)
    }
  }

  watch(open, (value) => run(value))
  onScopeDispose(() => {
    clearTimeout(fallbackTimer)
    while (observers.length) observers.pop()!.disconnect()
  })

  return { style, state }
}
