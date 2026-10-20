import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import Progress from '../src/components/Progress/Progress.vue'

const root = (container: HTMLElement) => container.querySelector<HTMLElement>('.ui-progress')!
const bar = (container: HTMLElement) =>
  container.querySelector<HTMLElement>('[role="progressbar"]')!
const fills = (container: HTMLElement) => [
  ...container.querySelectorAll<HTMLElement>('.ui-progress-fill'),
]

test.each([
  [40, '40', 'loading'],
  [150, '100', 'complete'],
  [100, '100', 'complete'],
  [-20, '0', 'loading'],
  [null, null, 'indeterminate'],
])('value %s gives aria-valuenow %s and data-state="%s"', async (value, valuenow, state) => {
  const screen = await render(Progress, { props: { value } })
  const el = bar(screen.container)
  expect(el.getAttribute('aria-valuemin')).toBe('0')
  expect(el.getAttribute('aria-valuemax')).toBe('100')
  expect(el.getAttribute('aria-valuenow')).toBe(valuenow)
  expect(root(screen.container).getAttribute('data-state')).toBe(state)
})

test('label and value-text reach assistive tech; variant and size render as classes', async () => {
  const screen = await render(Progress, {
    props: { value: 50, label: 'Uploading', valueText: '50 of 100', variant: 'danger', size: 'sm' },
  })
  const el = bar(screen.container)
  expect(el.getAttribute('aria-label')).toBe('Uploading')
  expect(el.getAttribute('aria-valuetext')).toBe('50 of 100')
  expect(root(screen.container)).toHaveClass('ui-progress--danger', 'ui-progress--sm')
})

test('segments stack in order and clamp to what is left of the range', async () => {
  const screen = await render(Progress, {
    props: { value: [{ value: 25 }, { value: 50 }, { value: 60 }] },
  })
  const [a, b, c] = fills(screen.container)
  expect(a.style.getPropertyValue('--ui-progress-scale')).toBe('0.25')
  expect(b.style.getPropertyValue('--ui-progress-scale')).toBe('0.5')
  expect(c.style.getPropertyValue('--ui-progress-scale')).toBe('0.25')
  // Laid out in order, each taking its share of the track.
  const track = screen.container
    .querySelector<HTMLElement>('.ui-progress-track')!
    .getBoundingClientRect()
  expect(b.getBoundingClientRect().left - track.left).toBeCloseTo(track.width * 0.25, 0)
  expect(c.getBoundingClientRect().width).toBeCloseTo(track.width * 0.25, 0)
  expect(bar(screen.container).getAttribute('aria-valuenow')).toBe('100')
  expect(root(screen.container).getAttribute('data-state')).toBe('complete')
})

test('unstyled segments shade in order; a variant or color keeps its own', async () => {
  const screen = await render(Progress, {
    props: {
      value: [
        { value: 10 },
        { value: 10, variant: 'danger' },
        { value: 10, color: 'teal' },
        { value: 10 },
      ],
    },
  })
  const [a, b, c, d] = fills(screen.container)
  expect(a.style.getPropertyValue('--ui-progress-shade')).toBe('')
  expect(b.classList.contains('ui-progress-segment--danger')).toBe(true)
  expect(c.style.getPropertyValue('--ui-progress-paint')).toBe('teal')
  expect(getComputedStyle(c).backgroundColor).toBe('rgb(0, 128, 128)')
  expect(d.style.getPropertyValue('--ui-progress-shade')).toBe('1')
})

test('a legend lists labelled segments with their share; legend=false or no labels hides it', async () => {
  const value = [
    { value: 40, label: 'Apps' },
    { value: 20, label: 'Photos' },
  ]
  const screen = await render(Progress, { props: { value, max: 80 } })
  const items = [...screen.container.querySelectorAll('.ui-progress-legend-item')]
  const text = (item: Element, part: string) =>
    item.querySelector(`.ui-progress-legend-${part}`)?.textContent
  expect(items.map((item) => [text(item, 'label'), text(item, 'value')])).toEqual([
    ['Apps', '50%'],
    ['Photos', '25%'],
  ])
  // Outside the progressbar, whose children are presentational.
  expect(screen.container.querySelector('[role="progressbar"] .ui-progress-legend')).toBeNull()

  const hidden = await render(Progress, { props: { value, legend: false } })
  expect(hidden.container.querySelector('.ui-progress-legend')).toBeNull()
  const unlabelled = await render(Progress, { props: { value: [{ value: 40 }] } })
  expect(unlabelled.container.querySelector('.ui-progress-legend')).toBeNull()
})

test('the legend slot replaces a row and receives the segment and its share', async () => {
  const screen = await render(Progress, {
    props: { value: [{ value: 30, label: 'Sent' }], max: 60 },
    slots: {
      legend: ({ segment, percent }: { segment: { label?: string }; percent: number }) =>
        h('b', `${segment.label}:${percent}`),
    },
  })
  expect(screen.container.querySelector('.ui-progress-legend-item b')?.textContent).toBe('Sent:50')
})

test('exposes el and fillEl for direct DOM/animation-lib access', async () => {
  const captured = ref<InstanceType<typeof Progress> | null>(null)
  const Wrapper = { render: () => h(Progress, { value: 50, ref: captured }) }
  await render(Wrapper)
  const fillEl = captured.value?.fillEl
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
  expect(fillEl).toBeInstanceOf(HTMLElement)
  expect(fillEl?.classList.contains('ui-progress-fill')).toBe(true)
})

test('motion-css=false turns the fill transition off', async () => {
  const screen = await render(Progress, { props: { value: 50, motionCss: false } })
  expect(root(screen.container).getAttribute('data-motion')).toBe('off')
  expect(getComputedStyle(fills(screen.container)[0]).transitionProperty).toBe('none')
})

// Computed dash values can come back wrapped in calc(); only the numbers matter.
const dashes = (value: string) =>
  value
    .replace(/calc\(|\)|px/g, '')
    .split(/[\s,]+/)
    .map(Number)
const arcs = (container: HTMLElement) => [
  ...container.querySelectorAll<SVGPathElement>('.ui-progress-ring .ui-progress-fill'),
]

test('type="circle" draws a ring that is still one progressbar, with the value as a dash of its path', async () => {
  const screen = await render(Progress, { props: { type: 'circle', value: 40, label: 'Upload' } })
  expect(root(screen.container).classList.contains('ui-progress--circle')).toBe(true)
  expect(bar(screen.container).getAttribute('aria-valuenow')).toBe('40')
  expect(bar(screen.container).getAttribute('aria-label')).toBe('Upload')
  const [arc] = arcs(screen.container)
  expect(arc!.getAttribute('pathLength')).toBe('100')
  expect(dashes(getComputedStyle(arc!).strokeDasharray)).toEqual([40, 200])
  // The ring is a square, sized by --ui-progress-ring-size.
  const track = bar(screen.container).getBoundingClientRect()
  expect(Math.round(track.width)).toBe(Math.round(track.height))
})

test('sweep=180 draws a half-ring gauge about half as tall as it is wide', async () => {
  const screen = await render(Progress, { props: { type: 'circle', sweep: 180, value: 75 } })
  expect(root(screen.container).classList.contains('ui-progress--arc')).toBe(true)
  const [arc] = arcs(screen.container)
  expect(arc!.getAttribute('d')).toBe('M 5 50 A 45 45 0 0 1 95 50')
  const track = bar(screen.container).getBoundingClientRect()
  expect(track.height / track.width).toBeCloseTo(0.55, 1)
})

test("any sweep keeps the full circle's scale, and the value fills the whole arc", async () => {
  const full = await render(Progress, { props: { type: 'circle', value: 50 } })
  const fullWidth = bar(full.container).getBoundingClientRect().width
  await full.unmount()

  // A quarter: narrower than the circle (its chord), drawn at the same radius.
  const quarter = await render(Progress, { props: { type: 'circle', sweep: 90, value: 50 } })
  const quarterBox = bar(quarter.container).getBoundingClientRect()
  expect(quarterBox.width).toBeLessThan(fullWidth)
  expect(quarterBox.width).toBeGreaterThan(fullWidth * 0.7)
  const [arc] = arcs(quarter.container)
  expect(arc!.getAttribute('pathLength')).toBe('100')
  expect(dashes(getComputedStyle(arc!).strokeDasharray)[0]).toBe(50)
  await quarter.unmount()

  // A speedometer: full width, taller than half.
  const gauge = await render(Progress, { props: { type: 'circle', sweep: 270, value: 50 } })
  const gaugeBox = bar(gauge.container).getBoundingClientRect()
  expect(gaugeBox.width).toBeCloseTo(fullWidth, 0)
  expect(gaugeBox.height / gaugeBox.width).toBeGreaterThan(0.8)
  expect(gaugeBox.height / gaugeBox.width).toBeLessThan(1)
})

test('the slot value is exact, and a long label never resizes the ring', async () => {
  // 14 / 850 came back as 14.000000000000002 through the old percentage round trip.
  const screen = await render(Progress, {
    props: { type: 'circle', sweep: 180, value: 14, max: 850 },
    slots: { default: ({ value }: { value: number }) => h('span', String(value)) },
  })
  expect(screen.container.querySelector('.ui-progress-center')!.textContent).toBe('14')
  const before = bar(screen.container).getBoundingClientRect()
  await screen.rerender({ value: 757.123456789123 })
  const after = bar(screen.container).getBoundingClientRect()
  expect(after.width).toBe(before.width)
  expect(after.height).toBe(before.height)
})

test('ring segments start where the one before ends, and keep their own colors', async () => {
  const screen = await render(Progress, {
    props: {
      type: 'circle',
      value: [
        { value: 20, label: 'Apps' },
        { value: 30, label: 'Photos', color: 'teal' },
      ],
    },
  })
  const [a, b] = arcs(screen.container)
  expect(a!.style.getPropertyValue('--ui-progress-start')).toBe('0')
  expect(b!.style.getPropertyValue('--ui-progress-start')).toBe('0.2')
  expect(dashes(getComputedStyle(b!).strokeDashoffset)).toEqual([-20])
  expect(getComputedStyle(b!).stroke).toBe('rgb(0, 128, 128)')
  expect(screen.container.querySelectorAll('.ui-progress-legend-item')).toHaveLength(2)
})

test('the default slot sits in the ring and receives the percentage; an empty ring hides its round end', async () => {
  const screen = await render(Progress, {
    props: { type: 'circle', value: 0, max: 200 },
    slots: { default: ({ percent }: { percent: number }) => h('span', `${percent}%`) },
  })
  expect(screen.container.querySelector('.ui-progress-center')!.textContent).toBe('0%')
  const [arc] = arcs(screen.container)
  expect(arc!.hasAttribute('data-empty')).toBe(true)
  expect(getComputedStyle(arc!).opacity).toBe('0')

  await screen.rerender({ value: 50 })
  expect(screen.container.querySelector('.ui-progress-center')!.textContent).toBe('25%')
  expect(arcs(screen.container)[0]!.hasAttribute('data-empty')).toBe(false)
})

test('an indeterminate ring loops a short arc instead of hiding as empty', async () => {
  const screen = await render(Progress, { props: { type: 'circle', value: null } })
  const [arc] = arcs(screen.container)
  expect(root(screen.container).dataset.state).toBe('indeterminate')
  expect(arc!.hasAttribute('data-empty')).toBe(false)
  expect(getComputedStyle(arc!).animationName).toBe('ui-progress-orbit')
  expect(bar(screen.container).hasAttribute('aria-valuenow')).toBe(false)
})

test('fillEl is the ring path, so animation libraries drive the same custom property', async () => {
  const progress = ref<InstanceType<typeof Progress> | null>(null)
  await render({ render: () => h(Progress, { ref: progress, type: 'circle', value: 10 }) })
  expect(progress.value!.fillEl).toBeInstanceOf(SVGPathElement)
  expect(progress.value!.fillEl!.style.getPropertyValue('--ui-progress-scale')).toBe('0.1')
})
