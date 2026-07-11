// The loader wrapper is always mounted and crossfades via CSS, so visibility
// assertions need the real stylesheet.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { useAsyncLoading } from '../src/composables/useAsyncLoading'
import ButtonFixture from './fixtures/ButtonFixture.vue'

const loader = () => document.querySelector<HTMLElement>('.ui-button-loader')!
const content = () => document.querySelector<HTMLElement>('.ui-button-content')!

function deferredTask() {
  let resolveTask!: () => void
  const task = () => new Promise<void>((resolve) => (resolveTask = resolve))
  return { task, resolve: () => resolveTask() }
}

test('default auto mode: a promise returned from @click drives loading', async () => {
  const { task, resolve } = deferredTask()
  const screen = render(ButtonFixture, { props: { task } })

  const button = screen.getByRole('button')
  await expect.element(button).toHaveTextContent('Save')
  await expect.element(button).not.toHaveAttribute('aria-busy')
  expect(getComputedStyle(loader()).opacity).toBe('0')

  await button.click()
  await expect.element(button).toHaveTextContent('Saving…')
  await expect.element(button).toHaveAttribute('aria-busy', 'true')
  await expect.element(button).toBeDisabled()
  await vi.waitFor(() => expect(getComputedStyle(loader()).opacity).toBe('1'))

  resolve()
  await expect.element(button).toHaveTextContent('Save')
  await expect.element(button).not.toHaveAttribute('aria-busy')
  await vi.waitFor(() => expect(getComputedStyle(loader()).opacity).toBe('0'))
})

test('overlay loader never shifts layout on a static-label button', async () => {
  const { task, resolve } = deferredTask()
  const screen = render(ButtonFixture, { props: { task, staticLabel: true } })

  const button = screen.getByRole('button')
  const el = () => loader().closest('button')!
  const idleWidth = el().offsetWidth

  await button.click()
  await vi.waitFor(() => expect(getComputedStyle(loader()).opacity).toBe('1'))
  expect(el().offsetWidth).toBe(idleWidth)
  // Content is hidden but keeps its layout box
  expect(getComputedStyle(content()).opacity).toBe('0')

  resolve()
  await vi.waitFor(() => expect(getComputedStyle(loader()).opacity).toBe('0'))
  expect(el().offsetWidth).toBe(idleWidth)
})

test('inline loader keeps the label visible and slides the spinner in', async () => {
  const { task, resolve } = deferredTask()
  const screen = render(ButtonFixture, {
    props: { task, loader: 'inline', staticLabel: true },
  })

  const button = screen.getByRole('button')
  expect(loader().offsetWidth).toBe(0)

  await button.click()
  await vi.waitFor(() => expect(getComputedStyle(loader()).opacity).toBe('1'))
  await vi.waitFor(() => expect(loader().offsetWidth).toBeGreaterThan(0))
  // The whole point of inline placement: the text stays readable
  expect(getComputedStyle(content()).opacity).toBe('1')

  resolve()
  await vi.waitFor(() => expect(loader().offsetWidth).toBe(0))
})

test('loading keeps focus in the button (aria-disabled, not native disabled) and guards re-entrant clicks', async () => {
  let calls = 0
  const { task, resolve } = deferredTask()
  const wrappedTask = () => {
    calls++
    return task()
  }
  const screen = render(ButtonFixture, { props: { task: wrappedTask } })
  const button = screen.getByRole('button')

  button.element().focus()
  await button.click()
  expect(calls).toBe(1)
  await expect.element(button).toHaveAttribute('aria-disabled', 'true')
  // Native disabled would silently steal focus — this must NOT happen.
  expect(document.activeElement).toBe(button.element())
  expect((button.element() as HTMLButtonElement).disabled).toBe(false)

  // A second click while loading must be a no-op, not a second run. Dispatch
  // at the DOM level directly — Playwright's own `.click()` refuses to click
  // an aria-disabled element at all (its actionability check treats
  // aria-disabled like native disabled), which would make this assertion
  // trivially true for the wrong reason. The guard this proves is
  // onRootClick's own `isLoading` check, for any input path that isn't
  // gated by that same actionability heuristic.
  button.element().dispatchEvent(new MouseEvent('click', { bubbles: true }))
  expect(calls).toBe(1)

  resolve()
  await expect.element(button).not.toHaveAttribute('aria-disabled')
})

test('variant, size and disabled render the expected state classes and cursor', async () => {
  const { task } = deferredTask()
  const screen = render(ButtonFixture, {
    props: { task, variant: 'danger', size: 'lg' },
  })
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('ui-button--danger')
  await expect.element(button).toHaveClass('ui-button--lg')
  await expect.element(button).toHaveClass('ui-button--loader-overlay')

  // Busy ≠ off: while loading the button keeps full opacity, progress cursor
  await button.click()
  const el = document.querySelector<HTMLElement>('.ui-button')!
  await vi.waitFor(() => expect(getComputedStyle(el).cursor).toBe('progress'))
  expect(getComputedStyle(el).opacity).toBe('1')
})

test('icon-only button is square per size with an expanded hit area', async () => {
  const { default: Button } = await import('../src/components/Button.vue')
  const screen = render(Button, {
    props: { icon: true, size: 'sm', 'aria-label': 'Add item' },
    slots: { default: '+' },
  })
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('ui-button--icon')
  await expect.element(button).toHaveAccessibleName('Add item')

  const el = document.querySelector<HTMLElement>('.ui-button')!
  expect(el.offsetWidth).toBe(el.offsetHeight)
  // sm is 28px visible; the ::after pseudo must extend the hit target to 40px
  expect(getComputedStyle(el, '::after').width).toBe('40px')
})

test('leading/trailing slots set the optical-alignment classes', async () => {
  const { default: Button } = await import('../src/components/Button.vue')
  const screen = render(Button, {
    slots: { default: 'Next', trailing: '→' },
  })
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('ui-button--has-trailing')
  expect(document.querySelector('.ui-button-trailing')).not.toBeNull()
})

test('ui.root accepts an object with class + style, merged onto the root', async () => {
  const { default: Button } = await import('../src/components/Button.vue')
  const screen = render(Button, {
    props: { ui: { root: { class: 'consumer-root', style: { '--test-prop': '1px' } } } },
    slots: { default: 'Save' },
  })
  const button = screen.getByRole('button')
  await expect.element(button).toHaveClass('consumer-root')
  await expect.element(button).toHaveClass('ui-button')
  expect(getComputedStyle(button.element()).getPropertyValue('--test-prop').trim()).toBe('1px')
})

test('ui prop still accepts a plain class string (back-compat)', async () => {
  const { default: Button } = await import('../src/components/Button.vue')
  const screen = render(Button, {
    props: { ui: { root: 'plain-string-class' } },
    slots: { default: 'Save' },
  })
  await expect.element(screen.getByRole('button')).toHaveClass('plain-string-class')
})

test('useAsyncLoading stays true until every overlapping run settles', async () => {
  const { loading, run } = useAsyncLoading()
  let resolveA!: () => void
  let resolveB!: () => void
  const a = run(() => new Promise<void>((r) => (resolveA = r)))
  const b = run(() => new Promise<void>((r) => (resolveB = r)))

  expect(loading.value).toBe(true)
  resolveA()
  await a
  expect(loading.value).toBe(true)
  resolveB()
  await b
  expect(loading.value).toBe(false)
})

test('run() propagates rejections and still clears loading', async () => {
  const failing = () => Promise.reject(new Error('nope'))
  const screen = render(ButtonFixture, { props: { task: failing } })
  const button = screen.getByRole('button')

  // The fixture fires run() without awaiting; swallow the expected rejection.
  const unhandled = vi.fn()
  window.addEventListener('unhandledrejection', (e) => {
    unhandled()
    e.preventDefault()
  })

  await button.click()
  await expect.element(button).toHaveTextContent('Save')
  await vi.waitFor(() => expect(unhandled).toHaveBeenCalled())
})
