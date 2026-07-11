import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ThemedFixture from './fixtures/ThemedFixture.vue'
import ThemedUiDefaultsFixture from './fixtures/ThemedUiDefaultsFixture.vue'
import NestedThemeFixture from './fixtures/NestedThemeFixture.vue'
import ScopedDialogFixture from './fixtures/ScopedDialogFixture.vue'

function bgOf(testId: string) {
  return getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!).backgroundColor
}
function colorOf(testId: string) {
  return getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!).color
}

// Teleport-to-head content lives outside the test's mount container. Vue
// correctly removes it on unmount (verified below) — but Vite's own dev-mode
// CSS injection (from this file's `import '../src/style.css'`) already puts
// unrelated <style> tags in <head> before any component mounts, so tests
// compare against a captured baseline rather than assuming zero.
function headStyleCount() {
  return document.querySelectorAll('head style').length
}
const baselineHeadStyles = headStyleCount()

test('a mid-tone seed color repaints the button, gets white contrast text, and cleans up its <style> on unmount', async () => {
  // indigo-500-ish — clearly not near-white, not near-black
  const screen = render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })

  await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(99, 102, 241)'))
  // luminance of #6366f1 is low enough that WCAG picks light text
  expect(colorOf('themed-primary')).toBe('rgb(250, 250, 250)')
  expect(headStyleCount()).toBe(baselineHeadStyles + 1)

  screen.unmount()
  await vi.waitFor(() => expect(headStyleCount()).toBe(baselineHeadStyles))
})

test('a pale seed color flips contrast text to dark (luminance actually computed, not hardcoded)', async () => {
  const screen = render(ThemedFixture, { props: { theme: { primary: '#fde68a' } } }) // pale yellow

  await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(253, 230, 138)'))
  expect(colorOf('themed-primary')).toBe('rgb(24, 24, 27)')
  screen.unmount()
})

test('hover state is darker than the base seed via color-mix, not identical', async () => {
  const screen = render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })
  await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(99, 102, 241)'))

  // Read from the themed button itself, not document.documentElement — the
  // override is scoped to this ConfigProvider's own subtree (a real wrapper
  // element with a unique attribute, not `:root`), so it never touches the
  // document root at all. See ConfigProvider.vue's scopeSelector comment.
  const hoverMix = getComputedStyle(
    document.querySelector('[data-testid="themed-primary"]')!,
  ).getPropertyValue('--ui-primary-hover')
  expect(hoverMix).toContain('color-mix')
  // Resolve what that color-mix actually paints as by applying it to a probe
  const probe = document.createElement('div')
  probe.style.color = hoverMix
  document.body.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  expect(resolved).not.toBe('rgb(99, 102, 241)')
  screen.unmount()
})

test('danger seed themes independently from primary', async () => {
  const screen = render(ThemedFixture, {
    props: { theme: { primary: '#6366f1', danger: '#059669' } }, // green "danger" — proves it is not hardcoded red
  })
  await vi.waitFor(() => expect(bgOf('themed-danger')).toBe('rgb(5, 150, 105)'))
  screen.unmount()
})

test('no theme prop injects no stylesheet at all', async () => {
  const screen = render(ThemedFixture, { props: { theme: {} } })
  await new Promise((r) => setTimeout(r, 50))
  expect(headStyleCount()).toBe(baselineHeadStyles)
  screen.unmount()
})

test('a nested ConfigProvider theme is scoped to its own subtree — it must NOT leak to buttons outside it', async () => {
  // Regression test for a real bug: generateThemeCss originally always
  // targeted :root, so ANY ConfigProvider's theme (nested or not) silently
  // overrode the same global tokens for the whole page. Confirmed directly
  // before this was fixed: an inner provider's radius:'0px' also changed a
  // sibling button rendered entirely outside its own subtree.
  const screen = render(NestedThemeFixture, { props: { innerRadius: '0px' } })
  await vi.waitFor(() => expect(document.querySelector('[data-testid="inner-btn"]')).not.toBeNull())

  const outerRadius = getComputedStyle(
    document.querySelector('[data-testid="outer-btn"]')!,
  ).borderRadius
  const innerRadius = getComputedStyle(
    document.querySelector('[data-testid="inner-btn"]')!,
  ).borderRadius

  expect(innerRadius).toBe('0px')
  expect(outerRadius).not.toBe('0px')
  screen.unmount()
})

test('a scoped theme still reaches a Dialog opened from inside it, despite Dialog Teleporting to body', async () => {
  // Regression test: Teleport moves the dialog's real DOM node out from
  // under the ConfigProvider's own scope wrapper entirely, so plain CSS
  // custom-property inheritance can't reach it on its own — confirmed
  // directly before the fix: a dialog opened from inside a radius:'0px'
  // scoped provider rendered with the library's default 14px panel radius,
  // not 0px. Dialog now injects the nearest scope via context (Vue's
  // provide/inject, unaffected by Teleport) and re-applies it to its own
  // teleported root.
  const screen = render(ScopedDialogFixture)
  await screen.getByTestId('trigger').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-panel')).not.toBeNull())

  // .ui-dialog-panel's own radius is `calc(var(--ui-radius) + 4px)`, not the
  // raw token — 4px confirms --ui-radius really did resolve to 0px here
  // (the un-fixed baseline, confirmed directly before this fix, was 14px:
  // the library default calc(10px + 4px), meaning the override never
  // reached the teleported panel at all).
  const panelRadius = getComputedStyle(document.querySelector('.ui-dialog-panel')!).borderRadius
  expect(panelRadius).toBe('4px')
})

test('theme.button.ui applies app-wide; a local ui prop overrides it per-instance', async () => {
  const screen = render(ThemedUiDefaultsFixture)

  await expect.element(screen.getByTestId('inherits')).toHaveClass('from-theme')
  await expect.element(screen.getByTestId('overrides')).toHaveClass('local-override')
  await expect.element(screen.getByTestId('overrides')).not.toHaveClass('from-theme')
})

test('the seed color survives dark mode instead of reverting to the library default', async () => {
  // Regression test: the library's own `:root[data-theme='dark']` block has
  // HIGHER specificity than a plain `:root` override (attribute selector),
  // so a theme that only overrode `:root` would silently lose in dark mode
  // no matter what order the stylesheets loaded in.
  document.documentElement.dataset.theme = 'dark'
  try {
    const screen = render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })
    await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(99, 102, 241)'))
    // Contrast still computed correctly, not just carried over from light mode
    expect(colorOf('themed-primary')).toBe('rgb(250, 250, 250)')
    screen.unmount()
  } finally {
    delete document.documentElement.dataset.theme
  }
})
