import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import AnimatedNumber from '../src/components/AnimatedNumber/AnimatedNumber.vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import { digitGlyphs, numberParts } from '../src/composables/numberParts'

const en = new Intl.NumberFormat('en-US')

test('screen readers get the formatted value and the reels are hidden', async () => {
  const screen = await render(AnimatedNumber, {
    props: { value: 1234.5, locale: 'en-US', format: { style: 'currency', currency: 'USD' } },
  })
  const root = screen.container.querySelector('.ui-animated-number')!
  expect(root.querySelector('.ui-animated-number-text')!.textContent).toBe('$1,234.50')
  expect(root.querySelector('.ui-animated-number-chars')!.getAttribute('aria-hidden')).toBe('true')
})

test('each digit column rests on its digit', async () => {
  const screen = await render(AnimatedNumber, { props: { value: 507, locale: 'en-US' } })
  const digits = [...screen.container.querySelectorAll<HTMLElement>('.ui-animated-number-digit')]
  expect(digits.map((digit) => digit.style.getPropertyValue('--ui-digit'))).toEqual(['5', '0', '7'])
})

test('the reel lands with the column showing exactly its digit', async () => {
  const screen = await render(AnimatedNumber, {
    props: { value: 7, locale: 'en-US', motion: false },
  })
  const column = screen.container.querySelector<HTMLElement>('.ui-animated-number-digit')!
  const glyph = column.querySelectorAll<HTMLElement>('.ui-animated-number-reel > span')[7]!
  const a = column.getBoundingClientRect()
  const b = glyph.getBoundingClientRect()
  expect(Math.abs(a.top - b.top)).toBeLessThan(1)
  expect(Math.abs(a.height - b.height)).toBeLessThan(1)
})

test('integer digits keep their element by place value as the number grows', async () => {
  const value = shallowRef(999)
  const screen = await render({
    render: () => h(AnimatedNumber, { value: value.value, locale: 'en-US', motion: false }),
  })
  const ones = () =>
    [...screen.container.querySelectorAll('.ui-animated-number-digit')].at(-1) as HTMLElement
  const before = ones()
  value.value = 1000
  await nextTick()
  expect(ones()).toBe(before)
  expect(screen.container.querySelector('.ui-animated-number-text')!.textContent).toBe('1,000')
})

test('locale follows ConfigProvider, including its numbering system', async () => {
  const screen = await render({
    render: () => h(ConfigProvider, { locale: 'ar-EG' }, () => h(AnimatedNumber, { value: 42 })),
  })
  expect(screen.container.querySelector('.ui-animated-number-text')!.textContent).toBe('٤٢')
  const reel = screen.container.querySelector('.ui-animated-number-reel')!
  expect(reel.textContent).toBe('٠١٢٣٤٥٦٧٨٩')
})

test('motion false marks the root so the reel snaps', async () => {
  const screen = await render(AnimatedNumber, { props: { value: 1, motion: false } })
  const root = screen.container.querySelector('.ui-animated-number')!
  expect(root.getAttribute('data-motion')).toBe('off')
  const reel = root.querySelector<HTMLElement>('.ui-animated-number-reel')!
  expect(getComputedStyle(reel).transitionProperty).toBe('none')
})

test('numberParts keys integers by place value and fractions by position', () => {
  const keys = numberParts(en, 1234.56, digitGlyphs(en)).map((part) => part.key)
  expect(keys).toEqual(['i3', 'g3', 'i2', 'i1', 'i0', 'decimal1', 'f0', 'f1'])
})

test('numberParts keeps signs and symbols as non-digit parts', () => {
  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
  const parts = numberParts(usd, -5, digitGlyphs(usd))
  expect(parts.filter((part) => part.kind === 'symbol').map((part) => part.text)).toEqual([
    '-',
    '$',
    '.',
  ])
})

test('ui.root merges and el is exposed', async () => {
  const captured = shallowRef<InstanceType<typeof AnimatedNumber> | null>(null)
  const screen = await render({
    render: () => h(AnimatedNumber, { ref: captured, value: 1, ui: { root: 'mine' } }),
  })
  const root = screen.container.querySelector('.ui-animated-number')
  expect(root).toHaveClass('mine')
  expect(captured.value?.el).toBe(root)
})

test('right-to-left numbers keep the order the browser gives their text', async () => {
  const value = 0.042
  const format = { style: 'percent' } as const
  const screen = await render(AnimatedNumber, { props: { value, locale: 'ar-EG', format } })
  const shown = [...screen.container.querySelectorAll('.ui-animated-number-chars > span')].map(
    (char) =>
      char.querySelector('.ui-animated-number-placeholder')?.textContent ?? char.textContent,
  )
  expect(shown.filter((char) => char.trim() && char !== '؜')).toEqual(['٪', '٤'])
})

test('a right-to-left page shows a negative number with its sign where the browser puts it', async () => {
  const screen = await render({
    render: () => h('div', { dir: 'rtl' }, h(AnimatedNumber, { value: -5, locale: 'en-US' })),
  })
  await nextTick()
  const shown = [...screen.container.querySelectorAll('.ui-animated-number-chars > span')].map(
    (char) =>
      char.querySelector('.ui-animated-number-placeholder')?.textContent ?? char.textContent,
  )
  expect(shown).toEqual(['5', '-'])
})
