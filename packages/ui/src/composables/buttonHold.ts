// Button's hold to confirm: the fill runs while you hold, and only the click fired on completion
// gets through. Loaded only by a Button with `hold`, as it's set up.
import type { Ref } from 'vue'

export interface ButtonHold {
  start: () => void
  release: () => void
  dispose: () => void
}

export function createButtonHold(o: {
  ms: () => number
  /** Loading or disabled: no hold starts. */
  blocked: () => boolean
  el: () => HTMLElement | null | undefined
  holding: Ref<boolean>
  held: Ref<boolean>
  progress: Ref<number>
  /** Fires the click that completes it (and the haptic tick). */
  complete: () => void
}): ButtonHold {
  let timer: ReturnType<typeof setTimeout> | undefined
  let frame = 0
  const setProgress = (value: number) => {
    o.progress.value = value
    o.el()?.style.setProperty('--ui-hold-progress', String(value))
  }
  const track = (from: number) => {
    frame = requestAnimationFrame((now) => {
      setProgress(Math.max(0, Math.min(1, (now - from) / o.ms())))
      if (o.holding.value) track(from)
    })
  }
  return {
    start() {
      if (!o.ms() || o.blocked() || o.holding.value) return
      o.held.value = false
      o.holding.value = true
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      track(performance.now())
      timer = setTimeout(() => {
        o.holding.value = false
        o.held.value = true
        cancelAnimationFrame(frame)
        setProgress(1)
        o.complete()
      }, o.ms())
    },
    release() {
      if (!o.holding.value && !o.held.value) return
      clearTimeout(timer)
      cancelAnimationFrame(frame)
      o.holding.value = false
      o.held.value = false
      setProgress(0)
    },
    dispose() {
      clearTimeout(timer)
      if (frame) cancelAnimationFrame(frame)
    },
  }
}
