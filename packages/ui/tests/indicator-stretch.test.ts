// `motion.stretch` and `motion.squash`: the indicator's edges move on their own springs, and it
// squashes on the cross axis as it leaves. Pagination's contrast labels follow it every frame.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Tabs from '../src/components/Tabs/Tabs.vue'
import SelectButton from '../src/components/SelectButton/SelectButton.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
// The spring engine loads once mounted; a real first move comes long after that.
const engine = () => new Promise((resolve) => setTimeout(resolve, 300))

const tabs = ['a', 'b', 'c', 'd']
async function renderTabs(motion: unknown) {
  const active = shallowRef('a')
  const screen = await render({
    setup: () => () =>
      h(
        Tabs as never,
        {
          items: tabs,
          active: active.value,
          'onUpdate:active': (value: string) => (active.value = value),
          motion,
        },
        {
          default: ({ itemProps, indicatorProps }: Record<string, (arg?: string) => object>) => [
            h('span', indicatorProps!()),
            ...tabs.map((tab) =>
              h(
                'button',
                { ...itemProps!(tab), style: 'width: 80px; height: 32px; padding: 0; border: 0' },
                tab,
              ),
            ),
          ],
        },
      ),
  })
  const indicator = () => screen.container.querySelector<HTMLElement>('.ui-tabs-indicator')!
  const tab = (value: string) =>
    screen.container.querySelector<HTMLElement>(`[data-tab-value="${value}"]`)!
  return { active, indicator, tab }
}

async function widest(indicator: () => HTMLElement, ms = 500) {
  let width = 0
  const start = performance.now()
  while (performance.now() - start < ms) {
    width = Math.max(width, indicator().getBoundingClientRect().width)
    await frame()
  }
  return width
}

test('`stretch` stretches the indicator past both tabs mid-move, then settles exactly on the target', async () => {
  const { active, indicator, tab } = await renderTabs({ stretch: true })
  await engine()
  const from = tab('a').getBoundingClientRect()
  active.value = 'b'
  const width = await widest(indicator)
  const to = tab('b').getBoundingClientRect()
  expect(width).toBeGreaterThan(Math.max(from.width, to.width) + 8)
  await vi.waitFor(() => {
    const at = indicator().getBoundingClientRect()
    expect(Math.abs(at.left - to.left)).toBeLessThan(0.01)
    expect(Math.abs(at.width - to.width)).toBeLessThan(0.01)
  })
  // The springs own position and size; only the fade is left to CSS.
  expect(indicator().style.transitionProperty).toBe('opacity')
})

test('`stretch` also works backwards, with a tuned trailing edge', async () => {
  const { active, indicator, tab } = await renderTabs({
    spring: { damping: 1, response: 0.3 },
    stretch: { trail: { damping: 0.6, response: 0.5 }, delay: 0.08 },
  })
  await engine()
  active.value = 'd'
  await vi.waitFor(
    () =>
      expect(
        Math.abs(indicator().getBoundingClientRect().left - tab('d').getBoundingClientRect().left),
      ).toBeLessThan(0.01),
    { timeout: 3000 },
  )
  active.value = 'c'
  const width = await widest(indicator)
  expect(width).toBeGreaterThan(80 + 8)
  await vi.waitFor(
    () => {
      const at = indicator().getBoundingClientRect()
      const to = tab('c').getBoundingClientRect()
      expect(Math.abs(at.left - to.left)).toBeLessThan(0.01)
      expect(Math.abs(at.width - to.width)).toBeLessThan(0.01)
    },
    { timeout: 3000 },
  )
})

test('under a ConfigProvider with `motion: false`, a stretch never stretches', async () => {
  const active = shallowRef('a')
  const screen = await render({
    setup: () => () =>
      h(ConfigProvider as never, { motion: false }, () =>
        h(
          Tabs as never,
          {
            items: tabs,
            active: active.value,
            motion: { stretch: true, squash: 0.8 },
          },
          {
            default: ({ itemProps, indicatorProps }: Record<string, (arg?: string) => object>) => [
              h('span', indicatorProps!()),
              ...tabs.map((tab) =>
                h('button', { ...itemProps!(tab), style: 'width: 80px; height: 32px' }, tab),
              ),
            ],
          },
        ),
      ),
  })
  await engine()
  const indicator = () => screen.container.querySelector<HTMLElement>('.ui-tabs-indicator')!
  active.value = 'b'
  expect(await widest(indicator, 200)).toBeLessThan(80.5)
  expect(indicator().style.scale).toBe('')
})

test('without `stretch`, a spring keeps the indicator one rigid size', async () => {
  const { active, indicator } = await renderTabs({ spring: { damping: 1, response: 0.3 } })
  await engine()
  active.value = 'b'
  expect(await widest(indicator)).toBeLessThan(80.5)
})

test('`squash` dips the cross-axis scale below 1, then springs back to 1', async () => {
  const at = shallowRef('a')
  const screen = await render({
    setup: () => () =>
      h(SelectButton as never, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
          { value: 'c', label: 'Charlie' },
        ],
        modelValue: at.value,
        'onUpdate:modelValue': (value: string) => (at.value = value),
        motion: { squash: 0.8 },
      }),
  })
  await engine()
  const indicator = screen.container.querySelector<HTMLElement>('.ui-select-button-indicator')!
  // Its rendered height against its layout height: the cross-axis scale.
  const scaleY = () => indicator.getBoundingClientRect().height / indicator.offsetHeight
  expect(scaleY()).toBeCloseTo(1, 3)
  at.value = 'b'
  let lowest = 1
  const start = performance.now()
  while (performance.now() - start < 300) {
    lowest = Math.min(lowest, scaleY())
    // Width untouched: only the cross axis squashes.
    expect(indicator.style.scale.startsWith('1 ') || indicator.style.scale === '').toBe(true)
    await frame()
  }
  expect(lowest).toBeLessThan(0.9)
  await vi.waitFor(() => {
    expect(indicator.style.scale).toBe('')
    expect(scaleY()).toBeCloseTo(1, 3)
  })
})

// The clip is `inset(top calc(100% - right) bottom left …)`, in px from the labels' own box.
function clipEdges(labels: HTMLElement) {
  const box = labels.getBoundingClientRect()
  const clip = getComputedStyle(labels).clipPath
  const number = '(-?[\\d.]+(?:e-?\\d+)?)'
  const match = clip.match(
    new RegExp(`inset\\(${number}(px|%) (?:calc\\(100% - ${number}px\\)|100%) \\S+ ${number}px`),
  )
  if (!match) throw new Error(`Unexpected clip: ${clip}`)
  const top = match[2] === '%' ? (parseFloat(match[1]!) / 100) * box.height : parseFloat(match[1]!)
  return { left: parseFloat(match[4]!), right: parseFloat(match[3] ?? '0'), top }
}

// Each case also proves it moved on its springs: a bouncy spring overshoots, a stretch widens.
const pageCases = [
  {
    motion: { spring: { damping: 0.6, response: 0.35 } },
    sprung: (seen: Box[], to: Box) => Math.max(...seen.map((at) => at.left)) > to.left + 1,
  },
  {
    motion: { stretch: true, squash: 0.8 },
    sprung: (seen: Box[], to: Box) =>
      Math.max(...seen.map((at) => at.right - at.left)) > to.right - to.left + 4,
  },
]
type Box = { left: number; right: number; top: number }

for (const { motion, sprung } of pageCases) {
  test(`Pagination's labels clip follows the indicator's live box every frame (${JSON.stringify(motion)})`, async () => {
    const page = shallowRef(1)
    const screen = await render({
      setup: () => () =>
        h(Pagination as never, {
          total: 100,
          page: page.value,
          'onUpdate:page': (value: number) => (page.value = value),
          motion,
        }),
    })
    await engine()
    const indicator = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator')!
    const labels = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator-labels')!
    const relative = (el: Element): Box => {
      const at = el.getBoundingClientRect()
      const origin = labels.getBoundingClientRect()
      return {
        left: at.left - origin.left,
        right: at.right - origin.left,
        top: at.top - origin.top,
      }
    }
    const from = relative(indicator)
    page.value = 5
    const seen: Box[] = []
    for (let i = 0; i < 30; i++) {
      await frame()
      const live = relative(indicator)
      const clip = clipEdges(labels)
      seen.push(live)
      expect(Math.abs(clip.left - live.left)).toBeLessThan(0.5)
      expect(Math.abs(clip.right - live.right)).toBeLessThan(0.5)
      expect(Math.abs(clip.top - live.top)).toBeLessThan(0.5)
    }
    const to = relative(screen.container.querySelector('[aria-current="page"]')!)
    expect(to.left).toBeGreaterThan(from.left + 40)
    // Checked mid-move, not only at rest.
    const midway = seen.filter((at) => at.left > from.left + 4 && at.left < to.left - 4)
    expect(midway.length).toBeGreaterThan(2)
    expect(sprung(seen, to)).toBe(true)
    await vi.waitFor(() => {
      const at = relative(indicator)
      expect(Math.abs(at.left - to.left)).toBeLessThan(0.01)
      expect(Math.abs(at.right - to.right)).toBeLessThan(0.01)
      const clip = clipEdges(labels)
      expect(clip.left).toBeCloseTo(at.left, 2)
      expect(clip.right).toBeCloseTo(at.right, 2)
      expect(clip.top).toBe(0)
    })
  })
}

// Its element arrives after the first write; that write's `0ms` must not stick to later moves.
test('SelectButton glides its first move after mounting', async () => {
  const at = shallowRef('a')
  const screen = await render({
    setup: () => () =>
      h(SelectButton as never, {
        items: [
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Bravo' },
        ],
        modelValue: at.value,
      }),
  })
  await engine()
  const indicator = screen.container.querySelector<HTMLElement>('.ui-select-button-indicator')!
  at.value = 'b'
  await frame()
  await frame()
  expect(getComputedStyle(indicator).transitionDuration).not.toMatch(/^0s/)
})

test("right to left, Pagination's labels clip still covers the indicator", async () => {
  const page = shallowRef(1)
  const screen = await render({
    setup: () => () =>
      h('div', { dir: 'rtl' }, [
        h(Pagination as never, {
          total: 100,
          page: page.value,
          'onUpdate:page': (value: number) => (page.value = value),
          motion: { spring: { damping: 1, response: 0.3 } },
        }),
      ]),
  })
  await engine()
  const indicator = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator')!
  const labels = screen.container.querySelector<HTMLElement>('.ui-pagination-indicator-labels')!
  page.value = 4
  await vi.waitFor(() => {
    const at = indicator.getBoundingClientRect()
    const origin = labels.getBoundingClientRect()
    const clip = clipEdges(labels)
    expect(clip.left).toBeCloseTo(at.left - origin.left, 1)
    expect(clip.right).toBeCloseTo(at.right - origin.left, 1)
  })
})
