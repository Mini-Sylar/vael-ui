// Wrapper display switches between `inline-flex`/`flex` via pure CSS,
// so these assertions need the real stylesheet.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Button from '../src/components/Button/Button.vue'
import ButtonScopedOverrideFixture from './fixtures/ButtonScopedOverrideFixture.vue'

const wrapper = () => document.querySelector<HTMLElement>('.ui-button-badge-wrapper')!
const badge = () => document.querySelector<HTMLElement>('.ui-button-badge')

test('no #badge slot: no wrapper renders at all, the button is the component root', async () => {
  await render(Button, { slots: { default: 'Save' } })
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
  await render(ButtonScopedOverrideFixture)
  const el = document.querySelector<HTMLElement>('.consumer-scoped-class')!
  expect(getComputedStyle(el).color).toBe('rgb(1, 2, 3)')
})

test('#badge slot renders inside the wrapper with the expected default placement', async () => {
  await render(Button, { slots: { default: 'Inbox', badge: '<span>3</span>' } })
  expect(getComputedStyle(wrapper()).display).toBe('inline-flex')
  await expect.element(badge()!).toHaveAttribute('data-placement', 'top-end')
  await expect.element(badge()!).toHaveTextContent('3')
})

test('badgePlacement prop controls the corner', async () => {
  await render(Button, {
    props: { badgePlacement: 'bottom-start' },
    slots: { default: 'Inbox', badge: '<span>3</span>' },
  })
  await expect.element(badge()!).toHaveAttribute('data-placement', 'bottom-start')
})

test('badge does not intercept clicks meant for the button beneath it', async () => {
  let clicks = 0
  await render(Button, {
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
  const screen = await render(Button, {
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

// A conditionally-rendered `#badge` slot (`v-if` on an unread count, say) used to
// flip the whole button between "wrapper" and "no wrapper" structure the instant
// the first badge appeared — throwing off any parent CSS that had grid-placed /
// nth-child-targeted the button. Setting `badgePlacement` now reserves the wrapper
// up front so the structure is stable, and the consumer's own root class rides
// onto the wrapper (the real outer element) either way.

test('badgePlacement set with no badge yet: the wrapper still renders, so the structure is stable', async () => {
  await render(Button, { props: { badgePlacement: 'top-end' }, slots: { default: 'Inbox' } })
  expect(document.querySelector('.ui-button-badge-wrapper')).not.toBeNull()
  expect(wrapper().querySelector('.ui-button')?.tagName).toBe('BUTTON')
  expect(badge()).toBeNull() // no badge content, just the reserved structure
})

test("the consumer's ui.root class lands on the wrapper when the wrapper is the outer element", async () => {
  await render(Button, {
    props: { badgePlacement: 'top-end', ui: { root: { class: 'grid-placed' } } },
    slots: { default: 'Inbox', badge: '<span>3</span>' },
  })
  // The wrapper is what a parent grid sees as its child — the placement class
  // has to be on it, not only on the inner button.
  expect(wrapper().classList.contains('grid-placed')).toBe(true)
  expect(document.querySelector('.ui-button')?.classList.contains('grid-placed')).toBe(true)
})

test('a plain class fallthrough also rides onto the wrapper', async () => {
  await render(Button, {
    attrs: { class: 'nav-item' },
    props: { badgePlacement: 'top-end' },
    slots: { default: 'Inbox', badge: '<span>3</span>' },
  })
  expect(wrapper().classList.contains('nav-item')).toBe(true)
})

// Regression test: a class carrying its own background/border/border-radius (the exact scenario
// from the issues doc — a custom `.profile-trigger` shape override) used to paint that background
// on the WRAPPER too, showing as a square box behind the actually-rounded button, because the
// wrapper has no border-radius of its own. The wrapper now forces its own paint properties off
// (!important) regardless of what the mirrored class contains — the button still receives the
// same class and paints normally.
test('a custom background/border/radius on the fallthrough class never paints on the wrapper', async () => {
  const style = document.createElement('style')
  style.textContent = '.custom-shape { background: rgb(10, 20, 30); border-radius: 999px; }'
  document.head.append(style)
  try {
    await render(Button, {
      attrs: { class: 'custom-shape' },
      props: { badgePlacement: 'top-end' },
      slots: { default: 'Inbox', badge: '<span>3</span>' },
    })
    const wrapperEl = wrapper()
    const buttonEl = document.querySelector<HTMLElement>('.ui-button')!
    expect(wrapperEl.classList.contains('custom-shape')).toBe(true)
    expect(getComputedStyle(wrapperEl).backgroundColor).not.toBe('rgb(10, 20, 30)')
    expect(getComputedStyle(wrapperEl).borderRadius).toBe('0px')
    // The button itself still gets the full custom styling — only the wrapper is neutered.
    expect(getComputedStyle(buttonEl).backgroundColor).toBe('rgb(10, 20, 30)')
  } finally {
    style.remove()
  }
})

// Regression test: when the badge briefly lived as a child of the button (an earlier fix for the
// squared-box/grid bugs above), the button's own `:active` press-scale dragged the badge along
// with it — shrinking it and nudging it toward the button's center, worse the larger the button.
// The badge is a sibling of the button (inside the wrapper), never a descendant, so the button's
// own transform can't touch it at all.
test("pressing the button never moves the badge — it isn't a descendant of the transformed element", async () => {
  await render(Button, {
    props: { badgePlacement: 'top-end' },
    slots: { default: 'A fairly wide button label', badge: '<span>3</span>' },
  })
  const buttonEl = document.querySelector<HTMLButtonElement>('.ui-button')!
  const before = badge()!.getBoundingClientRect()
  buttonEl.style.transform = 'scale(0.96)'
  const during = badge()!.getBoundingClientRect()
  buttonEl.style.transform = ''
  expect(during.left).toBe(before.left)
  expect(during.top).toBe(before.top)
  expect(during.width).toBe(before.width)
})
