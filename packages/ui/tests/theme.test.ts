import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ThemedFixture from './fixtures/ThemedFixture.vue'
import ThemedUiDefaultsFixture from './fixtures/ThemedUiDefaultsFixture.vue'
import NestedThemeFixture from './fixtures/NestedThemeFixture.vue'
import ScopedDialogFixture from './fixtures/ScopedDialogFixture.vue'
import '../src/components/Textarea/Textarea.css'
import '../src/components/Select/Select.css'
import '../src/components/CascadeSelect/CascadeSelect.css'
import '../src/components/TreeSelect/TreeSelect.css'
import '../src/components/OtpInput/OtpInput.css'
import '../src/components/internal/TimeField.css'
import '../src/components/CommandPalette/CommandPalette.css'

function bgOf(testId: string) {
  // The button's box is painted by its ::before layer.
  return getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!, '::before')
    .backgroundColor
}
function colorOf(testId: string) {
  return getComputedStyle(document.querySelector(`[data-testid="${testId}"]`)!).color
}

// ConfigProvider renders its theme <style> in place (not in <head>, which broke SSR
// hydration). Vite's dev CSS injection owns <head>, so only <body> is counted.
function themeStyleCount() {
  return document.querySelectorAll('body style').length
}

test('a mid-tone seed color repaints the button, gets white contrast text, and cleans up its <style> on unmount', async () => {
  // indigo-500-ish — clearly not near-white, not near-black
  const screen = await render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })

  await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(99, 102, 241)'))
  // luminance of #6366f1 is low enough that WCAG picks light text
  expect(colorOf('themed-primary')).toBe('rgb(250, 250, 250)')
  expect(themeStyleCount()).toBe(1)

  await screen.unmount()
  await vi.waitFor(() => expect(themeStyleCount()).toBe(0))
})

test('a pale seed color flips contrast text to dark (luminance actually computed, not hardcoded)', async () => {
  const screen = await render(ThemedFixture, { props: { theme: { primary: '#fde68a' } } }) // pale yellow

  await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(253, 230, 138)'))
  expect(colorOf('themed-primary')).toBe('rgb(24, 24, 27)')
  await screen.unmount()
})

test('hover state is darker than the base seed via color-mix, not identical', async () => {
  const screen = await render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })
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
  await screen.unmount()
})

test('danger seed themes independently from primary', async () => {
  const screen = await render(ThemedFixture, {
    props: { theme: { primary: '#6366f1', danger: '#059669' } }, // green "danger" — proves it is not hardcoded red
  })
  await vi.waitFor(() => expect(bgOf('themed-danger')).toBe('rgb(5, 150, 105)'))
  await screen.unmount()
})

test('no theme prop injects no stylesheet at all', async () => {
  const screen = await render(ThemedFixture, { props: { theme: {} } })
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  expect(themeStyleCount()).toBe(0)
  await screen.unmount()
})

test('theme.fontSize scales component text within its scope, and leaves the touch minimum alone', async () => {
  const screen = await render(ThemedFixture, { props: { theme: { fontSize: '20px' } } })
  const button = screen.container.querySelector('[data-testid="themed-primary"]')!
  const input = screen.container.querySelector('[data-testid="themed-input"]')!
  const plain = screen.container.querySelector('[data-testid="themed-plain"]')!
  const touchFontSize = () =>
    getComputedStyle(input).getPropertyValue('--ui-touch-font-size').trim()

  // Button rounds its text to whole pixels (its box sits on the pixel grid); Input scales exactly.
  await vi.waitFor(() => expect(getComputedStyle(button).fontSize).toBe('18px'))
  expect(getComputedStyle(input).fontSize).toBe('17.5px')
  expect(getComputedStyle(plain).fontSize).toBe('20px')
  expect(touchFontSize()).toBe('0px')
  expect(getComputedStyle(document.documentElement).fontSize).toBe('16px')

  await screen.rerender({ theme: { fontSize: '12px' } })
  await vi.waitFor(() => expect(getComputedStyle(button).fontSize).toBe('11px'))
  expect(getComputedStyle(input).fontSize).toBe('10.5px')
  expect(getComputedStyle(plain).fontSize).toBe('12px')
  expect(touchFontSize()).toBe('0px')
  await screen.unmount()
})

test('the document root font size also scales component text', async () => {
  const originalFontSize = document.documentElement.style.fontSize
  const screen = await render(ThemedFixture, { props: { theme: {} } })
  const button = screen.container.querySelector('[data-testid="themed-primary"]')!
  const input = screen.container.querySelector('[data-testid="themed-input"]')!
  try {
    document.documentElement.style.fontSize = '20px'
    await vi.waitFor(() => expect(getComputedStyle(button).fontSize).toBe('18px'))
    expect(getComputedStyle(input).fontSize).toBe('17.5px')
  } finally {
    document.documentElement.style.fontSize = originalFontSize
    await screen.unmount()
  }
})

// Every form control shares one touch rule, so none drifts to a different size than its neighbors.
test('every form control shares the same touch font-size floor', () => {
  const TOUCH = '(hover: none) and (pointer: coarse)'
  const floored = new Set<string>()
  const queries = new Set<string>()
  const walk = (rules: CSSRuleList, media?: string) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSMediaRule) walk(rule.cssRules, rule.conditionText)
      // Before the generic branch: with CSS nesting, a style rule has `cssRules` too.
      else if (rule instanceof CSSStyleRule) {
        if (rule.style.cssText.includes('max(var(--ui-touch-font-size)')) {
          floored.add(rule.selectorText)
          queries.add(media ?? 'none')
        }
      } else if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules, media)
    }
  }
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules)
    } catch {}
  }
  expect([...queries]).toEqual([TOUCH])
  for (const selector of [
    '.ui-input--md',
    '.ui-textarea--md',
    '.ui-select-trigger--md',
    '.ui-cascade-select-trigger--md',
    '.ui-tree-select-trigger--md',
    '.ui-otp-input',
    '.ui-time-field-input',
    '.ui-command-palette-input',
  ]) {
    expect(floored, selector).toContain(selector)
  }
  expect(
    getComputedStyle(document.documentElement).getPropertyValue('--ui-touch-font-size').trim(),
  ).toBe('0px')
})

test('a nested ConfigProvider theme is scoped to its own subtree — it must NOT leak to buttons outside it', async () => {
  // Regression test for a real bug: generateThemeCss originally always
  // targeted :root, so ANY ConfigProvider's theme (nested or not) silently
  // overrode the same global tokens for the whole page. Confirmed directly
  // before this was fixed: an inner provider's radius:'0px' also changed a
  // sibling button rendered entirely outside its own subtree.
  const screen = await render(NestedThemeFixture, { props: { innerRadius: '0px' } })
  await vi.waitFor(() => expect(document.querySelector('[data-testid="inner-btn"]')).not.toBeNull())

  const outerRadius = getComputedStyle(
    document.querySelector('[data-testid="outer-btn"]')!,
  ).borderRadius
  const innerRadius = getComputedStyle(
    document.querySelector('[data-testid="inner-btn"]')!,
  ).borderRadius

  expect(innerRadius).toBe('0px')
  expect(outerRadius).not.toBe('0px')
  await screen.unmount()
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
  const screen = await render(ScopedDialogFixture)
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
  const screen = await render(ThemedUiDefaultsFixture)

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
    const screen = await render(ThemedFixture, { props: { theme: { primary: '#6366f1' } } })
    await vi.waitFor(() => expect(bgOf('themed-primary')).toBe('rgb(99, 102, 241)'))
    // Contrast still computed correctly, not just carried over from light mode
    expect(colorOf('themed-primary')).toBe('rgb(250, 250, 250)')
    await screen.unmount()
  } finally {
    delete document.documentElement.dataset.theme
  }
})

test('setting or clearing a theme keeps the subtree mounted (focus and DOM identity survive)', async () => {
  const { default: ConfigProvider } =
    await import('../src/components/ConfigProvider/ConfigProvider.vue')
  const { defineComponent, h } = await import('vue')
  type Theme = { primary?: string } | undefined
  const Wrapper = defineComponent({
    props: { theme: { type: Object as () => Theme, default: undefined } },
    setup(props) {
      return () =>
        h(ConfigProvider, { theme: props.theme }, () =>
          h('button', { 'data-testid': 'inner' }, 'inner'),
        )
    },
  })
  const screen = await render(Wrapper, { props: { theme: undefined as Theme } })
  const before = screen.container.querySelector<HTMLButtonElement>('[data-testid="inner"]')!
  before.focus()
  await screen.rerender({ theme: { primary: '#6366f1' } as Theme })
  expect(screen.container.querySelector('[data-testid="inner"]')).toBe(before)
  expect(document.activeElement).toBe(before)
  await screen.rerender({ theme: undefined })
  expect(screen.container.querySelector('[data-testid="inner"]')).toBe(before)
})
