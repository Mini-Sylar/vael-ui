import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Select from '../src/components/Select/Select.vue'
import Combobox from '../src/components/Combobox/Combobox.vue'

// Real transitions: these tests watch the motion itself, frame by frame.
const global = { stubs: { transition: false, 'transition-group': false } }
const items = [
  { label: 'Accra', value: 'acc' },
  { label: 'Kumasi', value: 'kum' },
  { label: 'Tamale', value: 'tam' },
]

function frames(sample: () => string, ms: number): Promise<string[]> {
  return new Promise((resolve) => {
    const out: string[] = []
    const t0 = performance.now()
    const tick = () => {
      out.push(sample())
      if (performance.now() - t0 < ms) requestAnimationFrame(tick)
      else resolve(out)
    }
    requestAnimationFrame(tick)
  })
}

function overlapPx(a: DOMRect, b: DOMRect): number {
  return Math.min(a.right, b.right) - Math.max(a.left, b.left)
}

test('a removed chip collapses where it is, and the next chip follows its edge without covering it', async () => {
  const model = shallowRef(['acc', 'kum', 'tam'])
  const screen = await render(
    () =>
      h(Select as never, {
        items,
        multiple: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => (model.value = v),
        style: 'width: 360px',
      }),
    { global },
  )
  const [, leaving, next] = [...screen.container.querySelectorAll<HTMLElement>('.ui-chip')]
  const startLeft = leaving!.getBoundingClientRect().left
  const trace = frames(() => {
    if (!leaving!.isConnected) return 'gone'
    const a = leaving!.getBoundingClientRect()
    const b = next!.getBoundingClientRect()
    return [a.left, a.width, overlapPx(a, b), Number(getComputedStyle(leaving!).opacity)].join('|')
  }, 400)
  await userEvent.click(leaving!.querySelector('.ui-chip-remove')!)
  const rows = (await trace)
    .filter((f) => f !== 'gone')
    .map((f) => f.split('|').map(Number))
    .filter(([, , , opacity]) => opacity! < 1)
  expect(rows.length).toBeGreaterThan(1)
  for (const [left, , overlap] of rows) {
    expect(Math.abs(left! - startLeft)).toBeLessThan(1)
    expect(overlap!).toBeLessThan(1)
  }
  // It narrows over the frames rather than vanishing in one.
  const widths = rows.map(([, width]) => width!)
  expect(widths.some((w) => w > 5)).toBe(true)
  expect(widths.at(-1)!).toBeLessThan(widths[0]!)
})

test('clearing widens the value area smoothly and nothing jumps when the button goes', async () => {
  const model = shallowRef<string | null>('acc')
  const screen = await render(
    () =>
      h(Select as never, {
        items,
        clearable: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string | null) => (model.value = v),
      }),
    { global },
  )
  const value = screen.container.querySelector<HTMLElement>('.ui-select-value')!
  const clear = screen.container.querySelector<HTMLElement>('.ui-select-clear')!
  const trace = frames(
    () => `${value.getBoundingClientRect().width}|${clear.isConnected ? 1 : 0}`,
    500,
  )
  await userEvent.click(clear)
  const rows = (await trace).map((f) => f.split('|').map(Number) as [number, number])
  const steps = rows.slice(1).map(([x], i) => Math.abs(x - rows[i]![0]))
  const removedAt = rows.findIndex(([, present]) => present === 0)
  expect(removedAt).toBeGreaterThan(0)
  // The step when the button is removed is no bigger than a pixel.
  expect(steps[removedAt - 1]).toBeLessThan(1)
  // And it really widened, over several frames.
  expect(steps.filter((step) => step > 0.5).length).toBeGreaterThan(2)
})

test('chips leaving together never overlap one another', async () => {
  const model = shallowRef(['acc', 'kum', 'tam'])
  const screen = await render(
    () =>
      h(Select as never, {
        items,
        multiple: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => (model.value = v),
        style: 'width: 360px',
      }),
    { global },
  )
  const chips = [...screen.container.querySelectorAll<HTMLElement>('.ui-chip')]
  const trace = frames(() => {
    const boxes = chips.filter((c) => c.isConnected).map((c) => c.getBoundingClientRect())
    let worst = 0
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++)
        worst = Math.max(worst, overlapPx(boxes[i]!, boxes[j]!))
    return String(worst)
  }, 300)
  model.value = ['acc']
  for (const worst of await trace) expect(Number(worst)).toBeLessThan(1)
})

test('removing a chip starts its exit at once, not two frames later', async () => {
  const model = shallowRef(['acc', 'kum', 'tam'])
  const screen = await render(
    () =>
      h(Select as never, {
        items,
        multiple: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => (model.value = v),
        style: 'width: 360px',
      }),
    { global },
  )
  const chip = screen.container.querySelectorAll<HTMLElement>('.ui-chip')[1]!
  chip.querySelector<HTMLElement>('.ui-chip-remove')!.click()
  // Only Vue's update runs here; the browser hasn't drawn a frame yet.
  await nextTick()
  expect(chip.style.inlineSize).toBe('0px')
  expect(chip.style.opacity).toBe('0')
})

test('Combobox: when its last chip leaves, the text slides over and does not jump at the end', async () => {
  const model = shallowRef(['acc'])
  const screen = await render(
    () =>
      h(Combobox as never, {
        items,
        multiple: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: string[]) => (model.value = v),
        style: 'width: 360px',
      }),
    { global },
  )
  const input = screen.container.querySelector<HTMLElement>('input')!
  const chip = screen.container.querySelector<HTMLElement>('.ui-chip')!
  const trace = frames(
    () => `${input.getBoundingClientRect().left}|${chip.isConnected ? 1 : 0}`,
    500,
  )
  chip.querySelector<HTMLElement>('.ui-chip-remove')!.click()
  const rows = (await trace).map((f) => f.split('|').map(Number) as [number, number])
  const goneAt = rows.findIndex(([, present]) => present === 0)
  expect(goneAt).toBeGreaterThan(0)
  // The frame the empty chip slot is dropped: the text stays where the slide left it.
  expect(Math.abs(rows[goneAt]![0] - rows[goneAt - 1]![0])).toBeLessThan(1)
})
