import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, ref } from 'vue'
import ColorPicker from '../src/components/ColorPicker/ColorPicker.vue'

const swatch = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>('.ui-color-picker-swatch')!
const panel = () => document.querySelector<HTMLElement>('.ui-color-picker-panel')
const area = () => document.querySelector<HTMLElement>('.ui-color-picker-area')!

async function openPicker(root: HTMLElement) {
  swatch(root).click()
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  await nextTick()
}

test('the swatch shows the color and opens a labelled picker panel', async () => {
  const screen = await render(ColorPicker, { props: { modelValue: '#3B82F6', label: 'Accent' } })
  const button = swatch(screen.container)
  expect(button.getAttribute('aria-label')).toBe('Accent')
  expect(button.style.getPropertyValue('--ui-color-picker-value')).toBe('#3B82F6')
  await openPicker(screen.container)
  expect(button.getAttribute('aria-expanded')).toBe('true')
  expect(area().getAttribute('role')).toBe('slider')
  expect(document.querySelector('.ui-color-picker-hue [role="slider"]')).not.toBeNull()
  expect(document.querySelector<HTMLInputElement>('.ui-color-picker-value input')!.value).toBe(
    '#3B82F6',
  )
})

test('pressing on the plane sets saturation and brightness from the pointer', async () => {
  const onUpdate = vi.fn()
  const screen = await render(ColorPicker, {
    props: { modelValue: '#ff0000', 'onUpdate:modelValue': onUpdate },
  })
  await openPicker(screen.container)
  const rect = area().getBoundingClientRect()
  // Bottom-left corner: no saturation, no brightness, whatever the hue.
  area().dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      button: 0,
      pointerId: 1,
      clientX: rect.left,
      clientY: rect.bottom,
    }),
  )
  expect(onUpdate).toHaveBeenLastCalledWith('#000000')
  // Top-right corner: full saturation and brightness, so pure red again.
  area().dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 1,
      clientX: rect.right,
      clientY: rect.top,
    }),
  )
  expect(onUpdate).toHaveBeenLastCalledWith('#ff0000')
  area().dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
})

test('arrow keys on the plane step saturation and brightness', async () => {
  const onUpdate = vi.fn()
  const screen = await render(ColorPicker, {
    props: { modelValue: '#ff0000', 'onUpdate:modelValue': onUpdate },
  })
  await openPicker(screen.container)
  area().dispatchEvent(
    new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }),
  )
  expect(onUpdate).toHaveBeenLastCalledWith('#e60000')
})

test('the hex field commits a valid value on change and ignores a bad one', async () => {
  const onUpdate = vi.fn()
  const screen = await render(ColorPicker, {
    props: { modelValue: '#000000', 'onUpdate:modelValue': onUpdate },
  })
  await openPicker(screen.container)
  const hex = document.querySelector<HTMLInputElement>('.ui-color-picker-value input')!
  hex.value = '00ff00'
  hex.dispatchEvent(new Event('change', { bubbles: true }))
  expect(onUpdate).toHaveBeenLastCalledWith('#00ff00')
  hex.value = 'not a color'
  hex.dispatchEvent(new Event('change', { bubbles: true }))
  expect(onUpdate).toHaveBeenCalledTimes(1)
})

test('presets are pressable swatches; the current one reads pressed', async () => {
  const onUpdate = vi.fn()
  const screen = await render(ColorPicker, {
    props: {
      modelValue: '#22c55e',
      presets: ['#ef4444', '#22c55e'],
      'onUpdate:modelValue': onUpdate,
    },
  })
  await openPicker(screen.container)
  const presets = [...document.querySelectorAll<HTMLButtonElement>('.ui-color-picker-preset')]
  expect(presets.map((p) => p.getAttribute('aria-pressed'))).toEqual(['false', 'true'])
  presets[0].click()
  expect(onUpdate).toHaveBeenCalledWith('#ef4444')
})

test('a grey keeps the hue it had, so the thumbs do not jump', async () => {
  const screen = await render(ColorPicker, { props: { modelValue: '#ff0000' } })
  await openPicker(screen.container)
  await screen.rerender({ modelValue: '#808080' })
  await nextTick()
  const hueThumb = document.querySelector<HTMLElement>('.ui-color-picker-hue [role="slider"]')!
  expect(hueThumb.getAttribute('aria-valuenow')).toBe('0')
})

test('disabled blocks the swatch; a name submits the hex; el is exposed', async () => {
  const captured = ref<InstanceType<typeof ColorPicker> | null>(null)
  const Wrapper = {
    render: () =>
      h(ColorPicker, { modelValue: '#000000', disabled: true, name: 'accent', ref: captured }),
  }
  const screen = await render(Wrapper)
  expect(swatch(screen.container).disabled).toBe(true)
  expect(screen.container.querySelector<HTMLInputElement>('input[name="accent"]')!.value).toBe(
    '#000000',
  )
  expect(captured.value?.el).toBeInstanceOf(HTMLElement)
})

test('show-eye-dropper=false hides the eyedropper even where the browser has one', async () => {
  const screen = await render(ColorPicker, {
    props: { modelValue: '#000000', showEyeDropper: false },
  })
  await openPicker(screen.container)
  expect(document.querySelector('.ui-color-picker-eyedropper')).toBeNull()
})

test('the trigger, preset and default slots take over the swatch, each preset and the panel foot', async () => {
  const screen = await render(ColorPicker, {
    props: { modelValue: '#ff0000', presets: ['#ff0000', '#00ff00'] },
    slots: {
      trigger: ({ color }: { color: string }) => h('button', { class: 'my-trigger' }, color),
      preset: ({ selected }: { selected: boolean }) =>
        selected ? h('b', { class: 'tick' }, '✓') : null,
      default: ({ pick }: { pick: (color: string) => void }) =>
        h('button', { class: 'recent', onClick: () => pick('#0000ff') }, 'Recent'),
    },
  })
  const trigger = screen.container.querySelector<HTMLButtonElement>('.my-trigger')!
  expect(trigger.textContent).toBe('#ff0000')
  expect(screen.container.querySelector('.ui-color-picker-swatch')).toBeNull()
  trigger.click()
  await vi.waitFor(() => expect(panel()).not.toBeNull())
  expect(document.querySelectorAll('.ui-color-picker-preset .tick')).toHaveLength(1)
  document.querySelector<HTMLButtonElement>('.recent')!.click()
  await nextTick()
  expect(trigger.textContent).toBe('#0000ff')
})

test('motion=false marks the root; swatchEl, panelEl, areaEl and thumbEl are exposed', async () => {
  const captured = ref<InstanceType<typeof ColorPicker> | null>(null)
  const Wrapper = {
    render: () => h(ColorPicker, { modelValue: '#000000', motion: false, ref: captured }),
  }
  const screen = await render(Wrapper)
  expect(screen.container.querySelector('.ui-color-picker')?.getAttribute('data-motion')).toBe(
    'off',
  )
  expect(captured.value?.swatchEl).toBe(swatch(screen.container))
  expect(captured.value?.panelEl).toBeNull()
  await openPicker(screen.container)
  expect(captured.value?.panelEl).toBeInstanceOf(HTMLElement)
  expect(captured.value?.areaEl).toBe(area())
  expect(captured.value?.thumbEl).toBeInstanceOf(HTMLElement)
})

test('a wide system font cannot push the panel wider than itself, and the eyedropper matches the hex field', async () => {
  // Windows' system font is wider than macOS's, and a native input sizes its minimum width
  // from the font. A bigger font here stands in for it.
  const wide = document.createElement('style')
  wide.textContent =
    '.ui-color-picker-value input { font-family: Verdana, sans-serif; font-size: 1.25rem }'
  document.head.append(wide)
  try {
    const screen = await render(ColorPicker, { props: { modelValue: '#3B82F6' } })
    await openPicker(screen.container)
    const body = panel()!.querySelector<HTMLElement>('.ui-popover-body')!
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth)
  } finally {
    wide.remove()
  }
  const screen = await render(ColorPicker, { props: { modelValue: '#3B82F6' } })
  await openPicker(screen.container)
  const eyedropper = document.querySelector<HTMLElement>('.ui-color-picker-eyedropper')
  if (!eyedropper) return // no EyeDropper API in this browser
  const field = document.querySelector<HTMLElement>('.ui-color-picker-value')!
  const height = (el: HTMLElement) => el.getBoundingClientRect().height
  expect(height(eyedropper)).toBeCloseTo(height(field), 0)
  expect(eyedropper.getBoundingClientRect().width).toBeCloseTo(height(eyedropper), 0)
})
