import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { TransitionGroup, defineComponent, h, nextTick, shallowRef } from 'vue'
import { useMotion } from '../src/motion/useMotion'

const real = { global: { stubs: { transition: false, 'transition-group': false } } }
const byId = (id: string) => (el: Element | null) =>
  (el?.getAnimations() ?? []).filter((a) => a.id === id)
const presence = byId('ui-presence')
const slides = byId('ui-slide')
const sizing = byId('ui-size')

afterEach(() => {
  document.body.innerHTML = ''
})

function list(initial: number[]) {
  const items = shallowRef(initial)
  const List = defineComponent({
    setup() {
      const motion = useMotion('list', () => ({ stagger: 0.02 }))
      return () =>
        h(
          TransitionGroup,
          { tag: 'ul', ...motion.transition, style: 'margin: 0; padding: 0; list-style: none' },
          () =>
            items.value.map((n) =>
              h('li', { key: n, 'data-item': n, style: 'height: 30px; margin: 0' }, `item ${n}`),
            ),
        )
    },
  })
  render(List, real)
  // The list engine loads on demand; an app has it long before its list first changes. Once the
  // module is in, a macrotask lets useMotion's own callback (any order among import()s) run first.
  const ready = import('../src/motion/list').then(
    () => new Promise((resolve) => setTimeout(resolve)),
  )
  const item = (n: number) => document.querySelector<HTMLElement>(`[data-item="${n}"]`)
  const ul = () => document.querySelector('ul')!
  return { items, item, ul, ready }
}

test('list: a new item enters while the others slide down to make room', async () => {
  const { items, item, ul, ready } = list([1, 2, 3])
  await ready
  await nextTick()
  items.value = [0, 1, 2, 3]
  await nextTick()
  expect(presence(item(0)).length).toBeGreaterThan(0)
  for (const n of [1, 2, 3]) expect(slides(item(n))).toHaveLength(1)
  // The list's box follows its new height.
  await vi.waitFor(() => expect(sizing(ul()).length).toBe(1))
})

test('list: a removed item lifts out where it was while the rest slide up', async () => {
  const { items, item, ready } = list([1, 2, 3])
  await ready
  await nextTick()
  const top = item(2)!.getBoundingClientRect().top
  items.value = [1, 3]
  await nextTick()
  const leaving = item(2)!
  expect(leaving.style.position).toBe('absolute')
  expect(leaving.getBoundingClientRect().top).toBeCloseTo(top, 0)
  expect(slides(item(3))).toHaveLength(1)
  await vi.waitFor(() => expect(item(2)).toBeNull(), { timeout: 1000 })
})

test('list: a sort with no enters or leaves still slides everyone to their new place', async () => {
  const { items, item, ready } = list([1, 2, 3])
  await ready
  await nextTick()
  items.value = [3, 1, 2]
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  for (const n of [1, 2, 3]) expect(slides(item(n))).toHaveLength(1)
})

test(
  'list: spam adding and removing settles with every row exactly in place',
  { timeout: 10000 },
  async () => {
    const { items, item, ul, ready } = list([1, 2, 3])
    await ready
    await nextTick()
    let next = 10
    for (let i = 0; i < 12; i++) {
      items.value = [next++, ...items.value]
      await new Promise((resolve) => setTimeout(resolve, i % 3 === 0 ? 0 : 30))
    }
    for (let i = 0; i < 8; i++) {
      items.value = items.value.slice(1)
      await new Promise((resolve) => setTimeout(resolve, i % 2 ? 0 : 25))
    }
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const rows = [...ul().children] as HTMLElement[]
    expect(rows).toHaveLength(items.value.length)
    rows.forEach((row, i) => {
      expect(Number(getComputedStyle(row).opacity)).toBe(1)
      expect(getComputedStyle(row).translate).toBe('none')
      expect(row.style.position).toBe('')
      // Exactly in its slot: 30px rows from the list's top.
      expect(row.getBoundingClientRect().top - ul().getBoundingClientRect().top).toBeCloseTo(
        i * 30,
        0,
      )
    })
    expect(ul().getBoundingClientRect().height).toBeCloseTo(rows.length * 30, 0)
    expect(item(1)).not.toBeNull()
    expect(document.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0)
  },
)
