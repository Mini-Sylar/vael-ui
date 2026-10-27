// Sortable's `motion.spring`: the rows' own springs (moving, landing) take it.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h } from 'vue'

const springs: unknown[] = []
vi.mock('../src/motion/useSpringValue', async (importOriginal) => {
  const real = await importOriginal<typeof import('../src/motion/useSpringValue')>()
  return {
    ...real,
    createSpring: (...args: Parameters<typeof real.createSpring>) => {
      springs.push(args[1])
      return real.createSpring(...args)
    },
  }
})

const frame = () => new Promise(requestAnimationFrame)

test('a row moved with the keyboard rides your spring', async () => {
  const { default: Sortable } = await import('../src/components/Sortable/Sortable.vue')
  const spring = { damping: 0.6, response: 0.45 }
  render(() =>
    h(Sortable as never, {
      items: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      motion: { spring },
    }),
  )
  for (let i = 0; i < 3; i++) await frame()
  const handle = document.querySelector<HTMLElement>('.ui-sortable-handle')!
  handle.focus()
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  await frame()
  handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
  await vi.waitFor(() => expect(springs).toContainEqual(spring))
})
