/** v-animate's modifiers, `states` and `appear: 'later'` in the built Vapor build. Run `pnpm build` first. */
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import AnimateApiVaporRoot from './fixtures/AnimateApiVaporRoot.vue'

const frame = () => new Promise(requestAnimationFrame)
const moving = (el: Element | null) =>
  !!el && (el.getAnimations().length > 0 || !!(el as HTMLElement).style.transition)

test('Vapor: v-animate.rise, states and appear later', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(AnimateApiVaporRoot)
  const root = app.mount(host) as unknown as { items: number[] }
  try {
    const rise = () => host.querySelector<HTMLElement>('.rise')!
    // The built-in entrance: it comes in from below, faded.
    await vi.waitFor(() => expect(moving(rise())).toBe(true))
    expect(Number(getComputedStyle(rise()).opacity)).toBeLessThan(0.9)
    expect(parseFloat(getComputedStyle(rise()).translate.split(' ')[1] ?? '0')).toBeGreaterThan(2)

    // `appear: 'later'`: the first rows stay put, a row added later comes in.
    expect(moving(host.querySelector('.later-1')) || moving(host.querySelector('.later-2'))).toBe(
      false,
    )
    root.items = [1, 2, 3]
    await vi.waitFor(() => expect(moving(host.querySelector('.later-3'))).toBe(true))

    // `states`: a mouse hover holds its look.
    await new Promise((r) => setTimeout(r, 300))
    const button = host.querySelector<HTMLElement>('.hover')!
    button.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true, pointerType: 'mouse' }))
    await vi.waitFor(() => expect(Number(getComputedStyle(button).scale)).toBeGreaterThan(1.05))
    await frame()
  } finally {
    app.unmount()
    host.remove()
  }
})
