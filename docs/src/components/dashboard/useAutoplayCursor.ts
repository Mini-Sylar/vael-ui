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
  /** Keys to press on the target once there (it's focused first), e.g. a Slider's arrows. */
  keys?: string[]
  /** Right-click instead of click: fires `contextmenu` at the cursor. */
  contextmenu?: boolean
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
  /** Called on each scripted click, after it lands. */
  onClick?: () => void
}) {
  const x = motionValue(0)
  const y = motionValue(0)
  const pressed = shallowRef(false)
  const visible = shallowRef(false)
  let run = 0
  const quieted = new Set<HTMLElement>()

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

  // Scrolls the target into view inside every scrolling box between it and the
  // stage (the dashboard's content area, a table, a list), both axes, never the
  // page itself. On a phone the frame is short, so most steps need this.
  async function bringIntoView(target: Element, id: number): Promise<void> {
    const stage = options.stage.value
    let box = target.parentElement
    while (box && box !== stage) {
      const { overflowY, overflowX } = getComputedStyle(box)
      const scrollsY = /(auto|scroll)/.test(overflowY) && box.scrollHeight > box.clientHeight
      const scrollsX = /(auto|scroll)/.test(overflowX) && box.scrollWidth > box.clientWidth
      if (scrollsY || scrollsX) {
        const outer = box.getBoundingClientRect()
        const inner = target.getBoundingClientRect()
        const fitsY = inner.top >= outer.top && inner.bottom <= outer.bottom
        const fitsX = inner.left >= outer.left && inner.right <= outer.right
        if ((scrollsY && !fitsY) || (scrollsX && !fitsX)) {
          box.scrollTo({
            top:
              scrollsY && !fitsY
                ? box.scrollTop + inner.top - outer.top - (outer.height - inner.height) / 2
                : box.scrollTop,
            left:
              scrollsX && !fitsX
                ? box.scrollLeft + inner.left - outer.left - (outer.width - inner.width) / 2
                : box.scrollLeft,
            behavior: 'smooth',
          })
          await wait(380, id)
        }
      }
      box = box.parentElement
    }
  }

  // Whether the target shows inside the stage's own box. What the frame clips
  // (a row below a short phone layout) is not a place the cursor should go:
  // it would leave the frame and click where the visitor sees nothing.
  function showsInStage(target: Element): boolean {
    const stage = options.stage.value
    if (!stage) return true
    const s = stage.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    const cx = r.left + Math.min(r.width * 0.4, 48)
    const cy = r.top + r.height * 0.55
    return cx >= s.left && cx <= s.right && cy >= s.top && cy <= s.bottom
  }

  // Scripted focus shouldn't raise a phone's keyboard. That includes focus the
  // components move themselves, like the CommandPalette focusing its input.
  function quiet(el: EventTarget | null) {
    if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      !el.hasAttribute('inputmode')
    ) {
      el.setAttribute('inputmode', 'none')
      quieted.add(el)
    }
  }
  // Only the stage's own fields, never the visitor's (the header search).
  const onFocusIn = (event: FocusEvent) => {
    if (event.target instanceof Node && options.stage.value?.contains(event.target))
      quiet(event.target)
  }

  function focusQuietly(target: HTMLElement) {
    quiet(target)
    target.focus({ preventScroll: true })
  }

  // Blurred too, so the visitor's own tap focuses it fresh, with a keyboard.
  function releaseFocus() {
    if (typeof document === 'undefined') return
    document.removeEventListener('focusin', onFocusIn, true)
    for (const el of quieted) {
      el.removeAttribute('inputmode')
      if (document.activeElement === el) el.blur()
    }
    quieted.clear()
  }

  async function glideTo(target: Element, id: number): Promise<boolean> {
    await bringIntoView(target, id)
    if (!showsInStage(target)) return false
    const r = target.getBoundingClientRect()
    // Page coordinates: the cursor lives in <body>, above every layer, and
    // scrolls with the page. Aim a little left of center and just below the
    // midline, like a hand.
    const tx = r.left + window.scrollX + Math.min(r.width * 0.4, 48)
    const ty = r.top + window.scrollY + r.height * 0.55
    const distance = Math.hypot(tx - x.get(), ty - y.get())
    const duration = Math.min(0.9, 0.35 + distance / 1400)
    // y settles a touch sooner than x, so the path arcs instead of running
    // on a ruler. Critically damped: no overshoot on arrival.
    animate(x, tx, { type: 'spring', bounce: 0, duration })
    animate(y, ty, { type: 'spring', bounce: 0, duration: duration * 0.85 })
    await wait(duration * 1000 + 60, id)
    return true
  }

  async function play(id: number): Promise<void> {
    options.reset()
    // Enter from the stage's lower right, off the content.
    const stage = options.stage.value
    if (stage) {
      const s = stage.getBoundingClientRect()
      x.jump(s.left + window.scrollX + s.width * 0.78)
      y.jump(s.top + window.scrollY + s.height * 0.82)
      paint()
    }
    visible.value = true
    for (;;) {
      for (const step of options.steps) {
        const found = step.to?.()
        // Hidden or not laid out (a layout that differs on narrow screens): skip
        // the step rather than fly to a zero-size box at the page's corner.
        const target = found && found.getClientRects().length > 0 ? found : undefined
        if (step.to && !target) continue
        // Still out of the frame after scrolling: skip the step, as for a hidden target.
        if (target && !(await glideTo(target, id))) continue
        if (step.contextmenu && target) {
          pressed.value = true
          await wait(110, id)
          const r = target.getBoundingClientRect()
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: r.left + Math.min(r.width * 0.4, 48),
              clientY: r.top + r.height * 0.55,
            }),
          )
          pressed.value = false
          options.onClick?.()
        }
        if (step.click && target) {
          pressed.value = true
          await wait(110, id)
          // A bare .click() doesn't focus a text field, and some (Combobox)
          // open on focus. The pointerdown first marks the focus as
          // pointer-driven, so the field shows its click style, not the
          // keyboard ring.
          if (target instanceof HTMLInputElement) {
            target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
            focusQuietly(target)
          }
          ;(target as HTMLElement).click()
          pressed.value = false
          options.onClick?.()
        }
        if (step.keys && target instanceof HTMLElement) {
          focusQuietly(target)
          for (const key of step.keys) {
            target.dispatchEvent(
              new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
            )
            await wait(160, id)
          }
        }
        if (
          step.type &&
          (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
        ) {
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
      releaseFocus()
      if (!on || typeof document === 'undefined') return
      document.addEventListener('focusin', onFocusIn, true)
      const id = run
      play(id).catch((error) => {
        if (!(error instanceof Cancelled)) throw error
      })
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    run++
    releaseFocus()
    unsubscribe.forEach((stop) => stop())
  })

  return { pressed, visible }
}
