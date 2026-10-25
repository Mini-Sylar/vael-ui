// A component that swaps views but isn't an overlay (Calendar's months). Its built-in look stays
// its own CSS; once you set `motion` (or a shared style does), swap.ts plays each part's look.
import { computed, inject } from 'vue'
import type { ComputedRef } from 'vue'
import { defaultsKey } from '../config'
import { resolveMotion, useMotionStyle } from './context'
import { stepOut } from './stepOut'
import type { ResolvedMotion } from './context'
import type { MotionStyle, MotionTiming, MotionValues, MotionWhere } from './types'
import { loading } from './styleKey'

let swapKit: Promise<typeof import('./swap')> | undefined
const loadSwap = () => (swapKit ??= loading(import('./swap')))

type Look = Record<string, (where: MotionWhere) => MotionValues>

export interface SwapMotionOptions {
  key: keyof MotionStyle
  motion: () => unknown
  /** Which way the view is moving now. */
  direction: () => 1 | -1 | 0
  /** The built-in look per part, for the parts your values leave out. */
  initial: Look
  exit: Look
  timing: MotionTiming
  /** The part that is the view (Calendar's `grid`): `onAfterSwap` gets it once every part is in. */
  view: string
}

export interface SwapMotionReturn {
  /** Yours drives it: bind `hooks(part)` with `css: false`. Otherwise keep the CSS classes. */
  active: ComputedRef<boolean>
  hooks: (
    part: string,
    swap: 'sync' | 'wait',
  ) => {
    onEnter: (el: Element, done: () => void) => void
    onLeave: (el: Element, done: () => void) => void
  }
}

/** @internal */
export function useSwapMotion(options: SwapMotionOptions): SwapMotionReturn {
  const style = useMotionStyle()
  const provider = inject(defaultsKey, undefined)
  const resolved = computed<ResolvedMotion>(() => ({
    ...resolveMotion({
      role: options.key,
      key: options.key,
      mainPart: '',
      defaults: options.initial as never,
      exitDefaults: options.exit as never,
      defaultTiming: options.timing,
      instance: options.motion() as never,
      style: style?.value,
      providerOff: provider?.value.motion === false,
    }),
    direction: options.direction(),
  }))
  const active = computed(() => {
    const own = options.motion()
    return (
      !resolved.value.off &&
      ((typeof own === 'object' && own !== null) || !!style?.value?.[options.key])
    )
  })
  // `onAfterSwap`, once the parts that came in together are all in.
  let coming = 0
  let view: Element | undefined
  const arrived = (part: string, el: Element, done: () => void) => {
    coming++
    if (part === options.view) view = el
    return () => {
      done()
      if (--coming) return
      const own = options.motion() as { onAfterSwap?: (view: HTMLElement, c: object) => void }
      if (view) own?.onAfterSwap?.(view as HTMLElement, { direction: options.direction() })
      view = undefined
    }
  }
  const hooks: SwapMotionReturn['hooks'] = (part, swap) => {
    const host = { resolved, root: () => null, part, swap }
    return {
      onEnter: (el, done) => {
        const end = arrived(part, el, done)
        void loadSwap().then((kit) => kit.swapIn(el, end, host), end)
      },
      onLeave: (el, done) => {
        if (!resolved.value.off && swap === 'sync') stepOut(el)
        void loadSwap().then((kit) => kit.swapOut(el, done, host), done)
      },
    }
  }
  return { active, hooks }
}
