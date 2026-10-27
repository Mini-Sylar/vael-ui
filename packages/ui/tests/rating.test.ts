import '../src/style.css'
import { h, ref } from 'vue'
import { userEvent } from 'vitest/browser'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Rating from '../src/components/Rating/Rating.vue'
import Field from '../src/components/Field/Field.vue'
import { contrast } from './utils/contrast'

const pointerId = 1
function pointerdown(el: Element, clientX: number) {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX, clientY: 0, pointerId, bubbles: true }),
  )
}
function pointerup(clientX: number) {
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX, clientY: 0, pointerId, bubbles: true }),
  )
}

async function renderModel(props: Record<string, unknown> = {}) {
  const modelValue = ref((props.modelValue as number) ?? 0)
  const Wrapper = {
    render: () =>
      h(Rating as any, {
        ...props,
        modelValue: modelValue.value,
        'onUpdate:modelValue': (v: number) => (modelValue.value = v),
      }),
  }
  return { screen: await render(Wrapper), modelValue }
}

test('clicking a star position commits that value', async () => {
  const { screen, modelValue } = await renderModel({ max: 5 })
  const root = screen.container.querySelector('.ui-rating')!
  const rect = root.getBoundingClientRect()

  pointerdown(root, rect.left + rect.width * 0.5)
  pointerup(rect.left + rect.width * 0.5)

  expect(modelValue.value).toBeGreaterThanOrEqual(2)
  expect(modelValue.value).toBeLessThanOrEqual(3)
})

test('allowHalf snaps to the nearest 0.5', async () => {
  const { screen, modelValue } = await renderModel({ max: 5, allowHalf: true })
  const root = screen.container.querySelector('.ui-rating')!
  const rect = root.getBoundingClientRect()

  // Just past the 2nd star's left edge — half of star 3, i.e. 2.5.
  pointerdown(root, rect.left + (rect.width / 5) * 2.1)
  pointerup(rect.left + (rect.width / 5) * 2.1)

  expect(modelValue.value).toBe(2.5)
})

test('keyboard: arrows step by 1 (default), Home/End jump to bounds', async () => {
  const { screen, modelValue } = await renderModel({ max: 5, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  root.focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(modelValue.value).toBe(3)

  await userEvent.keyboard('{ArrowLeft}')
  expect(modelValue.value).toBe(2)

  await userEvent.keyboard('{Home}')
  expect(modelValue.value).toBe(0)

  await userEvent.keyboard('{End}')
  expect(modelValue.value).toBe(5)
})

test('keyboard arrows step by 0.5 when allowHalf is set', async () => {
  const { screen, modelValue } = await renderModel({ max: 5, allowHalf: true, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  root.focus()

  await userEvent.keyboard('{ArrowRight}')
  expect(modelValue.value).toBe(2.5)
})

test('readonly ignores pointer and keyboard interaction', async () => {
  const { screen, modelValue } = await renderModel({ max: 5, modelValue: 3, readonly: true })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  const rect = root.getBoundingClientRect()

  pointerdown(root, rect.left + rect.width)
  pointerup(rect.left + rect.width)
  root.focus()
  await userEvent.keyboard('{ArrowRight}')

  expect(modelValue.value).toBe(3)
})

test('disabled has tabindex -1 and ignores interaction', async () => {
  const { screen, modelValue } = await renderModel({ max: 5, modelValue: 1, disabled: true })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('tabindex')).toBe('-1')

  const rect = root.getBoundingClientRect()
  pointerdown(root, rect.left + rect.width)
  pointerup(rect.left + rect.width)
  expect(modelValue.value).toBe(1)
})

test('aria-valuenow/valuemax/valuetext reflect the value', async () => {
  const { screen } = await renderModel({ max: 5, modelValue: 3 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('aria-valuenow')).toBe('3')
  expect(root.getAttribute('aria-valuemax')).toBe('5')
  expect(root.getAttribute('aria-valuetext')).toBe('3 of 5')
})

test('custom valueText overrides the default aria-valuetext', async () => {
  const { screen } = await renderModel({
    max: 5,
    modelValue: 3,
    valueText: (v: number) => `${v} stars`,
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  expect(root.getAttribute('aria-valuetext')).toBe('3 stars')
})

test('form participation: hidden input carries the value under name', async () => {
  const modelValue = ref(4)
  const Wrapper = {
    render: () =>
      h('form', { 'data-testid': 'form' }, [
        h(Rating as any, {
          name: 'stars',
          modelValue: modelValue.value,
          'onUpdate:modelValue': (v: number) => (modelValue.value = v),
        }),
      ]),
  }
  const screen = await render(Wrapper)
  const form = screen.container.querySelector<HTMLFormElement>('[data-testid="form"]')!
  const data = new FormData(form)
  expect(data.get('stars')).toBe('4')
})

test('the 3rd star is fully filled and the 4th is empty at value 3', async () => {
  const { screen } = await renderModel({ max: 5, modelValue: 3 })
  const items = screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')
  expect(items[2]!.style.getPropertyValue('--ui-rating-fill')).toBe('100%')
  expect(items[3]!.style.getPropertyValue('--ui-rating-fill')).toBe('0%')
})

function pointermove(el: Element, type: 'pointerenter' | 'pointermove', clientX: number) {
  el.dispatchEvent(new PointerEvent(type, { clientX, clientY: 0, pointerId, bubbles: true }))
}

test('hover preview is visual only: aria-valuenow keeps the committed value', async () => {
  const { screen } = await renderModel({ max: 5, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  const items = screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')
  const rect = root.getBoundingClientRect()
  pointermove(root, 'pointerenter', rect.right - 1)
  pointermove(root, 'pointermove', rect.right - 1)
  await expect.poll(() => items[4]!.style.getPropertyValue('--ui-rating-fill')).toBe('100%')
  expect(root.getAttribute('aria-valuenow')).toBe('2')
  expect(root.getAttribute('aria-valuetext')).toBe('2 of 5')
})

test('keyboard input clears a resting hover preview so the change shows at once', async () => {
  // Chrome replays pointer moves under a resting real cursor when layout changes;
  // park it away from the stars so only the synthetic events below count.
  const parking = document.createElement('div')
  parking.style.cssText =
    'position: fixed; inset-block-end: 0; inset-inline-end: 0; inline-size: 4px; block-size: 4px'
  document.body.append(parking)
  await userEvent.hover(parking)
  const { screen, modelValue } = await renderModel({ max: 5, modelValue: 2 })
  const root = screen.container.querySelector<HTMLElement>('.ui-rating')!
  // Read fresh: a committed change re-keys the row (its pop).
  const items = () => screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')
  const rect = root.getBoundingClientRect()
  pointermove(root, 'pointermove', rect.right - 1)
  await expect.poll(() => items()[4]!.style.getPropertyValue('--ui-rating-fill')).toBe('100%')
  root.focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(modelValue.value).toBe(3)
  await expect.poll(() => items()[3]!.style.getPropertyValue('--ui-rating-fill')).toBe('0%')
  expect(items()[2]!.style.getPropertyValue('--ui-rating-fill')).toBe('100%')
  parking.remove()
})

test('empty stars keep ~3:1 contrast against the surface in both themes', async () => {
  const { screen } = await renderModel({ max: 5, modelValue: 0 })
  const empty = screen.container.querySelector<SVGElement>('.ui-rating-icon--empty')!
  try {
    for (const theme of ['light', 'dark']) {
      document.documentElement.dataset.theme = theme
      const surface = getComputedStyle(document.documentElement).getPropertyValue('--ui-surface')
      expect(contrast(getComputedStyle(empty).color, surface, surface)).toBeGreaterThanOrEqual(3)
    }
  } finally {
    delete document.documentElement.dataset.theme
  }
})

test("inside a Field, the label's for points at the slider and aria-labelledby stays", async () => {
  const screen = await render({
    render: () => h(Field, { label: 'Score' }, { default: () => h(Rating) }),
  })
  const label = screen.container.querySelector<HTMLLabelElement>('.ui-field-label')!
  const slider = screen.getByRole('slider', { name: 'Score' }).element()
  expect(document.getElementById(label.htmlFor)).toBe(slider)
  expect(slider.getAttribute('aria-labelledby')).toBe(label.id)
})

test('the row pops on every committed change, never on mount, and the stars stay the same nodes', async () => {
  const { screen } = await renderModel({ max: 5, modelValue: 3 })
  const track = () => screen.container.querySelector<HTMLElement>('.ui-rating-track')!
  const stars = [...screen.container.querySelectorAll('.ui-rating-item')]
  const popping = () =>
    track()
      .getAnimations()
      .map((a) => (a as CSSAnimation).animationName)
  await new Promise(requestAnimationFrame)
  expect(track().getAnimations()).toHaveLength(0)
  screen.container.querySelector<HTMLElement>('.ui-rating')!.focus()
  await userEvent.keyboard('{ArrowRight}')
  await new Promise(requestAnimationFrame)
  expect(popping()).toEqual(['ui-rating-pop'])
  await userEvent.keyboard('{ArrowRight}')
  await new Promise(requestAnimationFrame)
  expect(popping()).toEqual(['ui-rating-pop-again'])
  // Your own animations on the stars keep their targets.
  expect([...screen.container.querySelectorAll('.ui-rating-item')]).toEqual(stars)
})

test('replay plays the stars’ initial again, staggered, without remounting them', async () => {
  const { shallowRef, nextTick } = await import('vue')
  const bursts = shallowRef(0)
  const screen = await render({
    setup: () => () =>
      h(Rating as any, {
        modelValue: 3,
        motion: {
          initial: { item: { scale: [1, 1.6, 1] } },
          duration: 300,
          stagger: 0.05,
          replay: bursts.value,
        },
      }),
  })
  const stars = () => [...screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')]
  await new Promise((r) => setTimeout(r, 600))
  const before = stars()
  bursts.value++
  await nextTick()
  await expect.poll(() => stars()[4]!.getAnimations().length).toBeGreaterThan(0)
  expect(stars()).toEqual(before)
  expect(Math.round(Number(stars()[4]!.getAnimations()[0]!.effect!.getTiming().delay))).toBe(200)
})

test('appear: false keeps the stars still on mount; replay still plays them', async () => {
  const { shallowRef, nextTick } = await import('vue')
  const bursts = shallowRef(0)
  const screen = await render({
    setup: () => () =>
      h(Rating as any, {
        modelValue: 3,
        motion: {
          initial: { item: { opacity: 0 } },
          duration: 300,
          appear: false,
          replay: bursts.value,
        },
      }),
  })
  const star = () => screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')[0]!
  await new Promise((r) => setTimeout(r, 100))
  expect(getComputedStyle(star()).opacity).toBe('1')
  bursts.value++
  await nextTick()
  await expect.poll(() => Number(getComputedStyle(star()).opacity)).toBeLessThan(0.9)
})

test('a replay after the first starts within the same update', async () => {
  const { shallowRef, nextTick } = await import('vue')
  const bursts = shallowRef(0)
  const screen = await render({
    setup: () => () =>
      h(Rating as any, {
        modelValue: 3,
        motion: {
          initial: { item: { scale: [1, 1.5, 1] } },
          duration: 200,
          appear: false,
          replay: bursts.value,
        },
      }),
  })
  const star = () => screen.container.querySelectorAll<HTMLElement>('.ui-rating-item')[0]!
  bursts.value++
  await expect.poll(() => star().getAnimations().length).toBeGreaterThan(0)
  await new Promise((r) => setTimeout(r, 400))
  bursts.value++
  await nextTick()
  // Its batch flushes in a microtask, nothing more.
  for (let i = 0; i < 4; i++) await Promise.resolve()
  expect(
    star()
      .getAnimations()
      .some((a) => a.playState === 'running'),
  ).toBe(true)
})
