import { onScopeDispose, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export type CollapseState = 'open' | 'closed' | 'opening' | 'closing'

export interface UseCollapseOptions {
  /** The element whose block-size is measured and animated. */
  el: Ref<HTMLElement | null>
  /** `false` means the library writes NO inline visual state at all — not even the closed `blockSize: 0`/`visibility: hidden` resting styles, which would hide the panel before a consumer's exit animation gets to play. Only `state` still flips (instantly). Same `motionCss` escape hatch Toaster's CSS-vs-imperative split uses. */
  motionCss?: () => boolean
}

export interface UseCollapseReturn {
  /** Bind directly: `:style="style"`. Empty once open and settled, so the panel stays responsive to content/viewport changes instead of pinned at a stale px value. */
  style: Ref<Record<string, string>>
  state: Ref<CollapseState>
}

// Fallback when no transitionend fires (prefers-reduced-motion: reduce)
const SETTLE_FALLBACK_MS = 240

function closedStyle(): Record<string, string> {
  return { blockSize: '0px', overflow: 'hidden', visibility: 'hidden' }
}

export function useCollapse(open: Ref<boolean>, options: UseCollapseOptions): UseCollapseReturn {
  const motionOff = () => options.motionCss?.() === false
  const style = shallowRef<Record<string, string>>(open.value || motionOff() ? {} : closedStyle())
  const state = shallowRef<CollapseState>(open.value ? 'open' : 'closed')

  let token: symbol | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined

  function settle(target: boolean) {
    token = null
    clearTimeout(fallbackTimer)
    style.value = target || motionOff() ? {} : closedStyle()
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
    fallbackTimer = setTimeout(() => {
      if (token === myToken) settle(target)
    }, SETTLE_FALLBACK_MS)
  }

  watch(open, (value) => run(value))
  onScopeDispose(() => clearTimeout(fallbackTimer))

  return { style, state }
}
