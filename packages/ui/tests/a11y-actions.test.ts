import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import type { Component } from 'vue'
import AnimatedText from '../src/components/AnimatedText/AnimatedText.vue'
import Avatar from '../src/components/Avatar/Avatar.vue'
import Button from '../src/components/Button/Button.vue'
import Card from '../src/components/Card/Card.vue'
import Dock from '../src/components/Dock/Dock.vue'
import Pagination from '../src/components/Pagination/Pagination.vue'
import Progress from '../src/components/Progress/Progress.vue'
import SpeedDial from '../src/components/SpeedDial/SpeedDial.vue'
import Timeline from '../src/components/Timeline/Timeline.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import Toolbar from '../src/components/Toolbar/Toolbar.vue'
import ToolbarOverflowFixture from './fixtures/ToolbarOverflowFixture.vue'
import { toast } from '../src/composables/useToast'

const frames = (n = 2) =>
  new Promise<void>((resolve) => {
    const step = (left: number) =>
      left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1))
    step(n)
  })

// A generic component, so h() needs it widened.
const Dial = SpeedDial as unknown as Component
const dialItems = [{ label: 'Copy' }, { label: 'Share' }, { label: 'Print' }]

test('SpeedDial: opening on hover leaves focus where it was; a click open focuses the first action', async () => {
  const screen = await render(() =>
    h('div', [
      h('button', { 'data-testid': 'outside' }, 'Outside'),
      h(Dial, { items: dialItems, openOn: 'hover', direction: 'down' }),
    ]),
  )
  const outside = screen.container.querySelector<HTMLElement>('[data-testid="outside"]')!
  outside.focus()
  await userEvent.hover(screen.container.querySelector('.ui-speed-dial')!)
  await vi.waitFor(() =>
    expect(screen.container.querySelectorAll('[role="menuitem"]')).toHaveLength(3),
  )
  await frames()
  expect(document.activeElement).toBe(outside)
  // One tab stop in the menu all the same.
  const tabStops = Array.from(screen.container.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  expect(tabStops.filter((el) => el.tabIndex === 0)).toHaveLength(1)
  await screen.unmount()

  const clicked = await render(SpeedDial, { props: { items: dialItems, direction: 'down' } })
  clicked.container.querySelector<HTMLElement>('[aria-haspopup="menu"]')!.click()
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(clicked.container.querySelector('[role="menuitem"]')),
  )
  await clicked.unmount()
})

test('SpeedDial: no empty role="menu" while closed; the trigger controls the menu while open', async () => {
  const screen = await render(SpeedDial, { props: { items: dialItems, direction: 'down' } })
  const trigger = screen.container.querySelector<HTMLElement>('[aria-haspopup="menu"]')!
  expect(screen.container.querySelector('[role="menu"]')).toBeNull()
  expect(trigger.hasAttribute('aria-controls')).toBe(false)

  trigger.click()
  await vi.waitFor(() => expect(screen.container.querySelector('[role="menu"]')).not.toBeNull())
  const menu = screen.container.querySelector<HTMLElement>('[role="menu"]')!
  expect(menu.id).not.toBe('')
  expect(trigger.getAttribute('aria-controls')).toBe(menu.id)
  await screen.unmount()
})

test('useMenu typeahead: an icon-only item matches by its aria-label', async () => {
  const Icon = { render: () => h('svg', { viewBox: '0 0 16 16' }) }
  const items = [
    { label: 'Copy', icon: Icon },
    { label: 'Share', icon: Icon },
    { label: 'Print', icon: Icon },
  ]
  const screen = await render(SpeedDial, { props: { items, direction: 'down' } })
  screen.container.querySelector<HTMLElement>('[aria-haspopup="menu"]')!.click()
  const actions = () =>
    Array.from(screen.container.querySelectorAll<HTMLElement>('[role="menuitem"]'))
  await vi.waitFor(() => expect(document.activeElement).toBe(actions()[0]))
  await userEvent.keyboard('p')
  expect(document.activeElement).toBe(actions()[2])
  await screen.unmount()
})

test('SpeedDial and Toolbar: default names come from the messages', async () => {
  const { default: ConfigProvider } =
    await import('../src/components/ConfigProvider/ConfigProvider.vue')
  const messages = { speedDial: { label: 'Aktionen' }, toolbar: { more: 'Mehr' } }
  const dial = await render(() =>
    h(ConfigProvider, { messages }, () => h(Dial, { items: dialItems, direction: 'down' })),
  )
  const trigger = dial.container.querySelector<HTMLElement>('[aria-haspopup="menu"]')!
  expect(trigger.getAttribute('aria-label')).toBe('Aktionen')
  trigger.click()
  await vi.waitFor(() =>
    expect(dial.container.querySelector('[role="menu"]')?.getAttribute('aria-label')).toBe(
      'Aktionen',
    ),
  )
  await dial.unmount()

  const toolbar = await render(() =>
    h(ConfigProvider, { messages }, () => h(ToolbarOverflowFixture, { width: '200px' })),
  )
  await vi.waitFor(() =>
    expect(
      toolbar.container.querySelector('[data-toolbar-ellipsis]')?.getAttribute('aria-label'),
    ).toBe('Mehr'),
  )
  await toolbar.unmount()
})

test('Toolbar: arrow keys typed in a text field stay with the field', async () => {
  const screen = await render(() =>
    h(Toolbar, { 'aria-label': 'Format' }, () => [
      h('button', { 'data-testid': 'bold' }, 'Bold'),
      h('input', { 'data-testid': 'search', 'aria-label': 'Search', value: 'hello' }),
      h('button', { 'data-testid': 'italic' }, 'Italic'),
    ]),
  )
  const input = screen.container.querySelector<HTMLInputElement>('[data-testid="search"]')!
  input.focus()
  input.setSelectionRange(5, 5)
  await userEvent.keyboard('{ArrowLeft}')
  expect(document.activeElement).toBe(input)
  expect(input.selectionStart).toBe(4)
  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(input)
  await screen.unmount()
})

test('Button: a non-button tag is role="button", focusable, and Enter and Space (on keyup) activate it', async () => {
  const onClick = vi.fn()
  const screen = await render(Button, { props: { as: 'div', onClick }, slots: { default: 'Go' } })
  const el = screen.container.querySelector<HTMLElement>('.ui-button')!
  expect(el.getAttribute('role')).toBe('button')
  expect(el.tabIndex).toBe(0)
  el.focus()
  await userEvent.keyboard('{Enter}')
  expect(onClick).toHaveBeenCalledTimes(1)
  await userEvent.keyboard('{ >}')
  expect(onClick).toHaveBeenCalledTimes(1)
  await userEvent.keyboard('{/ }')
  expect(onClick).toHaveBeenCalledTimes(2)
  await screen.unmount()

  // A real link keeps its own semantics.
  const link = await render(Button, { props: { as: 'a' }, attrs: { href: '#x' } })
  expect(link.container.querySelector('a')!.hasAttribute('role')).toBe(false)
  await link.unmount()
})

test('Progress: aria-label and aria-labelledby reach the progressbar', async () => {
  const screen = await render(() =>
    h('div', [
      h(Progress, { value: 40, 'aria-label': 'Upload' }),
      h('span', { id: 'sync-label' }, 'Sync'),
      h(Progress, { value: 60, 'aria-labelledby': 'sync-label' }),
    ]),
  )
  const bars = screen.container.querySelectorAll<HTMLElement>('[role="progressbar"]')
  expect(bars[0]!.getAttribute('aria-label')).toBe('Upload')
  expect(bars[1]!.getAttribute('aria-labelledby')).toBe('sync-label')
  await expect.element(page.getByRole('progressbar', { name: 'Sync' })).toBeInTheDocument()
  expect(screen.container.querySelector('.ui-progress')!.hasAttribute('aria-label')).toBe(false)
  await screen.unmount()
})

test('Toaster: an error toast is its own assertive live region; the rest stay polite', async () => {
  const screen = await render(Toaster)
  toast('Saved')
  toast('Upload failed', { variant: 'error' })
  await expect.element(page.getByText('Upload failed')).toBeVisible()
  const card = (title: string) =>
    Array.from(document.querySelectorAll<HTMLElement>('.ui-toast')).find((el) =>
      el.textContent?.includes(title),
    )!
  expect(card('Upload failed').getAttribute('aria-live')).toBe('assertive')
  expect(card('Upload failed').hasAttribute('role')).toBe(false)
  expect(card('Saved').hasAttribute('aria-live')).toBe(false)
  expect(card('Saved').closest('[aria-live]')!.getAttribute('aria-live')).toBe('polite')
  toast.dismiss()
  await screen.unmount()
})

test('Dock: the tab stop starts on the first enabled item', async () => {
  const screen = await render(Dock, {
    props: { items: [{ label: 'Off', disabled: true }, { label: 'Home' }, { label: 'Mail' }] },
  })
  const items = screen.container.querySelectorAll<HTMLButtonElement>('.ui-dock-item')
  expect(items[0]!.tabIndex).toBe(-1)
  expect(items[1]!.tabIndex).toBe(0)
  await screen.unmount()
})

test('Pagination: at the first page, previous stays focusable and ignores presses', async () => {
  const page$ = shallowRef(1)
  const screen = await render(() =>
    h(Pagination, {
      total: 50,
      pageSize: 10,
      page: page$.value,
      'onUpdate:page': (value: number) => (page$.value = value),
    }),
  )
  const previous = screen.container.querySelector<HTMLButtonElement>(
    '[aria-label="Previous page"]',
  )!
  expect(previous.disabled).toBe(false)
  expect(previous.getAttribute('aria-disabled')).toBe('true')
  previous.focus()
  expect(document.activeElement).toBe(previous)
  previous.click()
  await nextTick()
  expect(page$.value).toBe(1)
  expect(document.activeElement).toBe(previous)
  await screen.unmount()
})

test('Timeline: the active item has aria-current', async () => {
  const screen = await render(Timeline, { props: { items: ['One', 'Two', 'Three'], current: 1 } })
  const steps = screen.container.querySelectorAll<HTMLElement>('li')
  expect(steps[1]!.getAttribute('aria-current')).toBe('step')
  expect(steps[0]!.hasAttribute('aria-current')).toBe(false)
  await screen.unmount()
})

test('AnimatedText: the leaving text is aria-hidden during the swap', async () => {
  const value = shallowRef('Copy')
  const screen = await render(
    { render: () => h(AnimatedText, { value: value.value }) },
    { global: { stubs: { transition: false } } },
  )
  value.value = 'Copied'
  await nextTick()
  const values = screen.container.querySelectorAll<HTMLElement>('.ui-animated-text-value')
  expect(values).toHaveLength(2)
  expect(values[0]!.getAttribute('aria-hidden')).toBe('true')
  expect(values[1]!.hasAttribute('aria-hidden')).toBe(false)
  await screen.unmount()
})

test('Avatar: an image that is not shown is hidden, so only the initials are read', async () => {
  const screen = await render(Avatar, {
    props: { src: '/definitely-missing-avatar-image-404.png', name: 'Grace Hopper' },
  })
  const img = screen.container.querySelector<HTMLImageElement>('.ui-avatar-image')!
  await vi.waitFor(() => expect(img.getAttribute('aria-hidden')).toBe('true'))
  await expect.element(page.getByRole('img', { name: 'Grace Hopper' })).not.toBeInTheDocument()
  await screen.unmount()
})

test('Card: the header and footer are not page landmarks', async () => {
  const screen = await render(Card, {
    props: { title: 'Plan' },
    slots: { footer: '<button>Upgrade</button>' },
  })
  expect(screen.container.querySelector('header')).toBeNull()
  expect(screen.container.querySelector('footer')).toBeNull()
  await expect.element(page.getByRole('banner')).not.toBeInTheDocument()
  await expect.element(page.getByRole('contentinfo')).not.toBeInTheDocument()
  await screen.unmount()
})
