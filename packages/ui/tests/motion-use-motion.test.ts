import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { Transition, defineComponent, h, nextTick, shallowRef } from 'vue'
import { useMotion } from '../src/motion/useMotion'

const real = { global: { stubs: { transition: false } } }

afterEach(() => {
  document.body.innerHTML = ''
})

test('useMotion: bind it to <Transition>, no refs, and the moving element animates in and out', async () => {
  const open = shallowRef(false)
  const Sheet = defineComponent({
    setup() {
      const motion = useMotion('overlay', () => ({ initial: { root: { opacity: 0, y: 10 } } }))
      return () =>
        h(Transition, motion.transition, () =>
          open.value
            ? h('div', { 'data-testid': 'sheet' }, [
                h('p', { ref: motion.target('line'), 'data-testid': 'line' }, 'line'),
              ])
            : null,
        )
    },
  })
  render(Sheet, real)
  const sheet = () => document.querySelector<HTMLElement>('[data-testid="sheet"]')
  const frame = () => new Promise(requestAnimationFrame)
  open.value = true
  await nextTick()
  // The first frame you can see: still on its way, from 10px down.
  while (!sheet() || Number(getComputedStyle(sheet()!).opacity) < 0.02) await frame()
  expect(
    Number.parseFloat(getComputedStyle(sheet()!).translate.split(' ')[1] ?? '0'),
  ).toBeGreaterThan(2)
  // Its target joined: the moving element carries the presence marker.
  expect(sheet()!.hasAttribute('data-ui-presence')).toBe(true)
  await vi.waitFor(() => expect(getComputedStyle(sheet()!).translate).toBe('none'), {
    timeout: 2000,
  })
  open.value = false
  await vi.waitFor(() => expect(sheet()).toBeNull(), { timeout: 2000 })
})
