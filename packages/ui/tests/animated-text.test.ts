import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import AnimatedText from '../src/components/AnimatedText/AnimatedText.vue'

const global = { stubs: { transition: false } }

test('renders the value', async () => {
  const screen = await render(AnimatedText, { props: { value: 'Copy' } })
  await expect.element(screen.getByText('Copy')).toBeInTheDocument()
})

test('a new value crossfades in while the old one leaves, then the old one is removed', async () => {
  const value = shallowRef('Copy')
  const screen = await render({ render: () => h(AnimatedText, { value: value.value }) }, { global })
  value.value = 'Copied to clipboard'
  await nextTick()
  const values = () => screen.container.querySelectorAll('.ui-animated-text-value')
  expect(values()).toHaveLength(2)
  expect(values()[0]).toHaveClass('ui-animated-text-leave-active')
  await vi.waitFor(() => expect(values()).toHaveLength(1))
  expect(values()[0]!.textContent).toBe('Copied to clipboard')
})

test('the width eases from the old text to the new one and is released after', async () => {
  const value = shallowRef('Hi')
  const screen = await render({ render: () => h(AnimatedText, { value: value.value }) }, { global })
  const root = screen.container.querySelector<HTMLElement>('.ui-animated-text')!
  const before = root.getBoundingClientRect().width
  value.value = 'A much longer label'
  await nextTick()
  await nextTick()
  expect(root.style.inlineSize).not.toBe('')
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 40)))
  const mid = root.getBoundingClientRect().width
  expect(mid).toBeGreaterThan(before)
  await vi.waitFor(() => expect(root.style.inlineSize).toBe(''))
})

test('motion false swaps at once', async () => {
  const value = shallowRef('One')
  const screen = await render({
    render: () => h(AnimatedText, { value: value.value, motion: false }),
  })
  value.value = 'Two'
  await nextTick()
  const values = screen.container.querySelectorAll('.ui-animated-text-value')
  expect(values).toHaveLength(1)
  expect(values[0]!.textContent).toBe('Two')
  expect(screen.container.querySelector<HTMLElement>('.ui-animated-text')!.style.inlineSize).toBe(
    '',
  )
})

test('the new text stays on one line while the width eases', async () => {
  const value = shallowRef('Hi')
  const screen = await render(
    { render: () => h(AnimatedText, { value: value.value }) },
    { global: { stubs: { transition: false } } },
  )
  const root = screen.container.querySelector<HTMLElement>('.ui-animated-text')!
  value.value = 'A considerably longer label than before'
  await nextTick()
  await nextTick()
  const entering = root.querySelector<HTMLElement>('.ui-animated-text-enter-active')!
  const fontSize = parseFloat(getComputedStyle(entering).fontSize)
  expect(entering.getBoundingClientRect().height).toBeLessThan(fontSize * 2)
})

test('the lazy stand-in shows the text at once, then the real component takes over', async () => {
  const { default: LazyAnimatedText } =
    await import('../src/components/internal/LazyAnimatedText.vue')
  const value = shallowRef('Ready')
  const screen = await render(
    { render: () => h(LazyAnimatedText, { value: value.value }) },
    { global },
  )
  expect(screen.container.querySelector('.ui-animated-text-value')!.textContent).toBe('Ready')
  await vi.waitFor(() => {
    value.value = value.value === 'Ready' ? 'Done' : 'Ready'
    return nextTick().then(() =>
      expect(screen.container.querySelectorAll('.ui-animated-text-value')).toHaveLength(2),
    )
  })
})
