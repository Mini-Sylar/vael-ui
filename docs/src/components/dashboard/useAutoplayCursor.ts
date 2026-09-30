import { onScopeDispose, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { animate, motionValue } from 'motion-v'

export interface AutoplayStep {
  /** Element to glide to (looked up fresh each time, since pages re-render). */
  to?: () => Element | null | undefined
  /** Press and fire a real click on the target once there. */
  click?: boolean
  /** Characters to type into the target input, one at a time. */
  type?: string
  /** Rest after the step, in ms. */
  rest?: number
}

class Cancelled extends Error {}

/**
 * Drives a fake cursor through `steps` inside `stage`, clicking and typing on
 * the real components underneath. It runs only while `enabled` is true and
 * restarts from the first step each time it resumes; `reset` runs first so
 * every loop starts from a known state.
 */
export function useAutoplayCursor(options: {
  stage: Readonly<Ref<HTMLElement | null>>
  cursor: Readonly<Ref<HTMLElement | null>>
  enabled: () => boolean
  steps: AutoplayStep[]
  reset: () => void
}) {
  const x = motionValue(0)
  const y = motionValue(0)
  const pressed = shallowRef(false)
  const visible = shallowRef(false)
  let run = 0

  const paint = () => {
    const el = options.cursor.value
    if (el) el.style.transform = `translate(${x.get()}px, ${y.get()}px)`
  }
  const unsubscribe = [x.on('change', paint), y.on('change', paint)]

  // Resolves after `ms`, or rejects the moment this run is superseded.
  function wait(ms: number, id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = setInterval(
        () => id !== run && (clearInterval(check), clearTimeout(timer), reject(new Cancelled())),
        50,
      )
      const timer = setTimeout(() => (clearInterval(check), resolve()), ms)
    })
  }

  async function glideTo(target: Element, id: number): Promise<void> {
    const stage = options.stage.value
    if (!stage) return
    const s = stage.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    // Aim a little left of center and just below the midline, like a hand.
    const tx = r.left - s.left + Math.min(r.width * 0.4, 48)
    const ty = r.top - s.top + r.height * 0.55
    const distance = Math.hypot(tx - x.get(), ty - y.get())
    const duration = Math.min(0.9, 0.35 + distance / 1400)
    // y settles a touch sooner than x, so the path arcs instead of running
    // on a ruler. Critically damped: no overshoot on arrival.
    animate(x, tx, { type: 'spring', bounce: 0, duration })
    animate(y, ty, { type: 'spring', bounce: 0, duration: duration * 0.85 })
    await wait(duration * 1000 + 60, id)
  }

  async function play(id: number): Promise<void> {
    options.reset()
    // Enter from the stage's lower right, off the content.
    const stage = options.stage.value
    if (stage) {
      x.jump(stage.clientWidth * 0.78)
      y.jump(stage.clientHeight * 0.82)
      paint()
    }
    visible.value = true
    for (;;) {
      for (const step of options.steps) {
        const target = step.to?.()
        if (target) await glideTo(target, id)
        if (step.click && target) {
          pressed.value = true
          await wait(110, id)
          // A bare .click() doesn't focus a text field, and some (Combobox)
          // open on focus. The pointerdown first marks the focus as
          // pointer-driven, so the field shows its click style, not the
          // keyboard ring.
          if (target instanceof HTMLInputElement) {
            target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
            target.focus({ preventScroll: true })
          }
          ;(target as HTMLElement).click()
          pressed.value = false
        }
        if (step.type && target instanceof HTMLInputElement) {
          for (const ch of step.type) {
            target.value += ch
            target.dispatchEvent(new Event('input', { bubbles: true }))
            await wait(70 + Math.random() * 60, id)
          }
        }
        await wait(step.rest ?? 500, id)
      }
      options.reset()
    }
  }

  watch(
    options.enabled,
    (on) => {
      run++
      visible.value = false
      if (!on) return
      const id = run
      play(id).catch((error) => {
        if (!(error instanceof Cancelled)) throw error
      })
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    run++
    unsubscribe.forEach((stop) => stop())
  })

  return { pressed, visible }
}
