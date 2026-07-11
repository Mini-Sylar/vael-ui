// Wrapper display switches between `inline-flex`/`flex` via pure CSS,
// so these assertions need the real stylesheet.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Button from '../src/components/Button.vue'
import ButtonScopedOverrideFixture from './fixtures/ButtonScopedOverrideFixture.vue'

const wrapper = () => document.querySelector<HTMLElement>('.ui-button-badge-wrapper')!
const badge = () => document.querySelector<HTMLElement>('.ui-button-badge')

test('no #badge slot: no wrapper renders at all, the button is the component root', async () => {
  render(Button, { slots: { default: 'Save' } })
  // No wrapper, not a display:contents one — an unconditionally-rendered
  // wrapper would defeat Vue's "parent scoped styles reach the child root"
  // mechanism for every badge-less Button (see Button.vue's own comment).
  expect(document.querySelector('.ui-button-badge-wrapper')).toBeNull()
  expect(document.querySelector('.ui-button')?.tagName).toBe('BUTTON')
  expect(badge()).toBeNull()
})

// Regression test: a wrapper unconditionally present around Button's root
// meant Vue's scope-id attribute (from a consumer's own `<style scoped>`)
// landed on the invisible wrapper, never on the real <button> — so a plain
// `<Button class="foo">` overridden via `.foo { ... }` in scoped CSS
// silently never applied, forcing `:deep()` for every badge-less Button.
test("a consumer's own scoped-style class overrides a badge-less Button with no :deep()", async () => {
  render(ButtonScopedOverrideFixture)
  const el = document.querySelector<HTMLElement>('.consumer-scoped-class')!
  expect(getComputedStyle(el).color).toBe('rgb(1, 2, 3)')
})

test('#badge slot renders inside the wrapper with the expected default placement', async () => {
  render(Button, { slots: { default: 'Inbox', badge: '<span>3</span>' } })
  expect(getComputedStyle(wrapper()).display).toBe('inline-flex')
  await expect.element(badge()!).toHaveAttribute('data-placement', 'top-end')
  await expect.element(badge()!).toHaveTextContent('3')
})

test('badgePlacement prop controls the corner', async () => {
  render(Button, {
    props: { badgePlacement: 'bottom-start' },
    slots: { default: 'Inbox', badge: '<span>3</span>' },
  })
  await expect.element(badge()!).toHaveAttribute('data-placement', 'bottom-start')
})

test('badge does not intercept clicks meant for the button beneath it', async () => {
  let clicks = 0
  render(Button, {
    props: { onClick: () => clicks++ },
    slots: { default: 'Inbox', badge: '<span>3</span>' },
  })
  expect(getComputedStyle(badge()!).pointerEvents).toBe('none')
  await document.querySelector<HTMLButtonElement>('.ui-button')!.click()
  expect(clicks).toBe(1)
})

// EXTREME composition: block (full-width) + badge + loading + icon slot all
// at once — the case most likely to expose a shortcoming in the wrapper,
// since `.ui-button--block`'s own `inline-size: 100%` lives on the INNER
// button, not the wrapper, and has nothing to resolve against once the
// wrapper stops being `display: contents`.
test('block + badge together: wrapper stretches to full width, badge still corner-anchored', async () => {
  const screen = render(Button, {
    props: { block: true, badgePlacement: 'top-end' },
    slots: { default: 'Full width action', badge: '<span>9+</span>' },
  })
  const wrapperEl = wrapper()
  expect(getComputedStyle(wrapperEl).display).toBe('flex')
  expect(getComputedStyle(wrapperEl).inlineSize).not.toBe('0px')

  // The button itself must still visually fill that stretched wrapper.
  const buttonEl = screen.getByRole('button').element() as HTMLElement
  expect(buttonEl.getBoundingClientRect().width).toBeGreaterThan(0)
  expect(Math.round(buttonEl.getBoundingClientRect().width)).toBe(
    Math.round(wrapperEl.getBoundingClientRect().width),
  )

  await expect.element(badge()!).toHaveAttribute('data-placement', 'top-end')
})
