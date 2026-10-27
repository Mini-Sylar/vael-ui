// The glide between steps follows the Tour's motion timing, and the cutout box is exposed as CSS vars.
import '../src/style.css'
import { page } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Tour from '../src/components/Tour/Tour.vue'
import type { TourStep } from '../src/components/Tour/Tour.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'

interface TourHandle {
  spotlightEl: HTMLElement | null
  positionerEl: HTMLElement | null
}

const steps: TourStep[] = [
  { target: '#timing-a', title: 'Timing A' },
  { target: '#timing-b', title: 'Timing B', side: 'top' },
]

async function renderTour(
  props: Record<string, unknown> = {},
  provider?: Record<string, unknown>,
  openOnMount = false,
) {
  const tour = shallowRef<TourHandle | null>(null)
  const open = shallowRef(openOnMount)
  const tree = () => [
    h('button', { id: 'timing-a', style: 'margin: 16px' }, 'A'),
    h('div', { id: 'timing-b', style: 'margin: 220px 0 0 200px; width: 160px; height: 80px' }, 'B'),
    h(Tour as never, {
      ref: (instance: unknown) => (tour.value = instance as TourHandle | null),
      open: open.value,
      'onUpdate:open': (value: boolean) => (open.value = value),
      steps,
      ...props,
    }),
  ]
  await render(() => (provider ? h(ConfigProvider, provider, tree) : tree()))
  open.value = true
  await expect.element(page.getByText('Timing A')).toBeVisible()
  const spotlight = tour.value!.spotlightEl as HTMLElement
  await vi.waitFor(() =>
    expect(spotlight.style.getPropertyValue('--ui-tour-cutout-x')).not.toBe(''),
  )
  await settle(spotlight)
  return { tour, spotlight }
}

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve))
const px = (el: HTMLElement, name: string) =>
  Number.parseFloat(el.style.getPropertyValue(`--ui-tour-cutout-${name}`))
const boxOf = (el: HTMLElement) => ({
  x: px(el, 'x'),
  y: px(el, 'y'),
  width: px(el, 'width'),
  height: px(el, 'height'),
  radius: px(el, 'radius'),
})

// Unchanged across a few frames: a glide moves it every frame.
async function settle(el: HTMLElement) {
  await vi.waitFor(
    async () => {
      const before = el.style.getPropertyValue('--ui-tour-cutout')
      for (let i = 0; i < 3; i++) await nextFrame()
      expect(el.style.getPropertyValue('--ui-tour-cutout')).toBe(before)
    },
    { timeout: 3000 },
  )
}

interface Sample {
  t: number
  x: number
  y: number
  path: string
}

// Every frame's cutout from just before Next until it settles.
async function sampleGlide(spotlight: HTMLElement) {
  const samples: Sample[] = []
  let sampling = true
  const sample = (t: number) => {
    samples.push({
      t,
      x: px(spotlight, 'x'),
      y: px(spotlight, 'y'),
      path: spotlight.style.getPropertyValue('--ui-tour-cutout'),
    })
    if (sampling) requestAnimationFrame(sample)
  }
  requestAnimationFrame(sample)
  await nextFrame()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Timing B')).toBeVisible()
  await settle(spotlight)
  sampling = false
  const from = samples[0]!
  const to = samples.at(-1)!
  const progress = (s: Sample) => (s.y - from.y) / (to.y - from.y)
  const start = samples.findIndex((s) => progress(s) > 0.001)
  const end = samples.findIndex((s) => progress(s) >= 0.999)
  // The glide begins in the frame before the first moved one.
  const t0 = samples[start - 1]!.t
  return { samples, progress, t0, duration: samples[end]!.t - t0, travel: to.y - from.y }
}

test('motion { duration: 800, easing: linear } glides the cutout over ~800ms, halfway at ~400ms', async () => {
  const { spotlight } = await renderTour({ motion: { duration: 800, easing: 'linear' } })
  const { samples, progress, t0, duration, travel } = await sampleGlide(spotlight)
  expect(travel).toBeGreaterThan(150)
  expect(duration).toBeGreaterThan(750)
  expect(duration).toBeLessThan(900)
  const mid = samples.reduce((a, b) =>
    Math.abs(b.t - t0 - 400) < Math.abs(a.t - t0 - 400) ? b : a,
  )
  expect(progress(mid)).toBeGreaterThan(0.4)
  expect(progress(mid)).toBeLessThan(0.6)
})

test('a style’s tour key times the glide when the Tour sets none', async () => {
  const { spotlight } = await renderTour(
    {},
    { motion: { version: 1, tour: { duration: 800, easing: 'linear' } } },
  )
  const { duration } = await sampleGlide(spotlight)
  expect(duration).toBeGreaterThan(750)
  expect(duration).toBeLessThan(900)
})

test('unset: the glide keeps its distance-based 220–380ms on the built-in curve', async () => {
  const { spotlight } = await renderTour()
  const { samples, progress, t0, duration } = await sampleGlide(spotlight)
  expect(duration).toBeGreaterThan(200)
  expect(duration).toBeLessThan(420)
  // Ease-out: well past halfway by a third of the way through.
  const third = samples.reduce((a, b) =>
    Math.abs(b.t - t0 - duration / 3) < Math.abs(a.t - t0 - duration / 3) ? b : a,
  )
  expect(progress(third)).toBeGreaterThan(0.6)
})

test('the callout’s glide takes the same timing', async () => {
  const { tour } = await renderTour({ motion: { duration: 800, easing: 'linear' } })
  const positioner = tour.value!.positionerEl as HTMLElement
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Timing B')).toBeVisible()
  const glide = () => positioner.getAnimations().find((a) => a.id === 'ui-tour-glide')
  await vi.waitFor(() => expect(glide()).toBeDefined())
  const timing = glide()!.effect!.getTiming()
  expect(timing.duration).toBe(800)
  expect(timing.easing).toBe('linear')
})

test('the callout keeps the built-in glide when unset', async () => {
  const { tour } = await renderTour()
  const positioner = tour.value!.positionerEl as HTMLElement
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Timing B')).toBeVisible()
  const glide = () => positioner.getAnimations().find((a) => a.id === 'ui-tour-glide')
  await vi.waitFor(() => expect(glide()).toBeDefined())
  const timing = glide()!.effect!.getTiming()
  expect(timing.duration).toBeGreaterThanOrEqual(220)
  expect(timing.duration).toBeLessThanOrEqual(380)
  expect(timing.easing).toBe('cubic-bezier(0.23, 1, 0.32, 1)')
})

test('the cutout vars match the cutout’s box at rest', async () => {
  const { spotlight } = await renderTour({ spotlightPadding: 6, spotlightRadius: 999 })
  const rect = document.querySelector('#timing-a')!.getBoundingClientRect()
  const box = boxOf(spotlight)
  expect(box.x).toBeCloseTo(rect.left - 6, 1)
  expect(box.y).toBeCloseTo(rect.top - 6, 1)
  expect(box.width).toBeCloseTo(rect.width + 12, 1)
  expect(box.height).toBeCloseTo(rect.height + 12, 1)
  // The radius is clamped to fit, like the cutout's.
  expect(box.radius).toBeCloseTo(Math.min(box.width, box.height) / 2, 1)
  const r = box.radius
  expect(spotlight.style.getPropertyValue('--ui-tour-cutout')).toContain(`M${box.x + r},${box.y} `)
})

test('the cutout vars follow the cutout every frame of the glide', async () => {
  const { spotlight } = await renderTour({ motion: { duration: 600, easing: 'linear' } })
  const { samples, progress } = await sampleGlide(spotlight)
  const moving = samples.filter((s) => progress(s) > 0.05 && progress(s) < 0.95)
  expect(new Set(moving.map((s) => s.y)).size).toBeGreaterThan(5)
  // Each frame's vars describe the path drawn in that same frame.
  for (const s of moving) expect(s.path).toContain(`,${s.y} H`)
  const rect = document.querySelector('#timing-b')!.getBoundingClientRect()
  expect(boxOf(spotlight).y).toBeCloseTo(rect.top - 4, 1)
})

test('mounted already open, the first Next glides the callout too', async () => {
  const { tour } = await renderTour({}, undefined, true)
  const positioner = tour.value!.positionerEl as HTMLElement
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Timing B')).toBeVisible()
  await vi.waitFor(() =>
    expect(positioner.getAnimations().some((a) => a.id === 'ui-tour-glide')).toBe(true),
  )
})

test('a pill-shaped cutout eases its corner from the one it draws, not from 999', async () => {
  const { spotlight } = await renderTour({
    steps: [
      { target: '#timing-a', title: 'Timing A', spotlightRadius: 999 },
      { target: '#timing-b', title: 'Timing B', side: 'top', spotlightRadius: 8 },
    ],
    motion: { duration: 800, easing: 'linear' },
  })
  const pill = px(spotlight, 'radius')
  await page.getByRole('button', { name: 'Next' }).click()
  await new Promise((r) => setTimeout(r, 400))
  // About halfway between the pill's drawn corner and 8.
  expect(px(spotlight, 'radius')).toBeLessThan((pill + 8) / 2 + 4)
})

test('on a curve that starts slow, the callout still lands on its step', async () => {
  const { tour } = await renderTour({
    steps: [
      { target: '#timing-a', title: 'Timing A' },
      {
        target: '#timing-b',
        title: 'Timing B',
        side: 'top',
        // Longer: the panel eases to its new size, and placement writes its style as it does.
        description:
          'A much longer description than the first step has, so the panel grows to fit it over several frames while the callout travels to its new spot above the target.',
      },
    ],
    motion: { duration: 420, easing: 'cubic-bezier(0.8, 0, 1, 1)' },
  })
  const positioner = tour.value!.positionerEl as HTMLElement
  const clicked = performance.now()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByText('Timing B')).toBeVisible()
  // On time: one 420ms glide from the click, however often placement rewrote it on the way.
  await vi.waitFor(() =>
    expect(positioner.getAnimations().filter((a) => a.playState === 'running')).toHaveLength(0),
  )
  expect(performance.now() - clicked).toBeLessThan(560)
  expect(getComputedStyle(positioner).translate).toBe('none')
})
