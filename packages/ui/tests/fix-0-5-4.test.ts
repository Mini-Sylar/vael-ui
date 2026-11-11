// The 0.5.4 fixes, each guarded where it showed in a real app.
import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeAll, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, ref, shallowRef, withDirectives } from 'vue'
import Badge from '../src/components/Badge/Badge.vue'
import Button from '../src/components/Button/Button.vue'
import Collapsible from '../src/components/Collapsible/Collapsible.vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import Editable from '../src/components/Editable/Editable.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import OtpInput from '../src/components/OtpInput/OtpInput.vue'
import Input from '../src/components/Input/Input.vue'
import Menu from '../src/components/Menu/Menu.vue'
import Calendar from '../src/components/Calendar/Calendar.vue'
import TooltipHost from '../src/components/TooltipHost/TooltipHost.vue'
import { vTooltip } from '../src/directives/vTooltip'
import { vScrollMask } from '../src/directives/vScrollMask'
import { vAnimate } from '../src/motion/vAnimate'
import { resolveMessagesFromI18n } from '../src/messages'
import { springEasing } from '../src/motion/springEasing'
import { LAYOUT_ID } from '../src/motion/ids'
import { catchAnimations, runsOn } from './utils/startedAnimations'

beforeAll(catchAnimations)
const frame = () => new Promise(requestAnimationFrame)
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('Badge: the first render never pops, in any build; a count change does; motion false never does', async () => {
  const screen = await render(Badge, { props: { count: 1 } })
  const content = () => screen.container.querySelector<HTMLElement>('.ui-badge-content')!
  expect(content()).not.toHaveClass('ui-badge-content--animated')
  await screen.rerender({ count: 2 })
  expect(content()).toHaveClass('ui-badge-content--animated')
  const off = await render(Badge, { props: { count: 1, motion: false } })
  await off.rerender({ count: 2, motion: false })
  expect(off.container.querySelector('.ui-badge-content')).not.toHaveClass(
    'ui-badge-content--animated',
  )
})

test('Button: an idle spinner has no animation at all; its box is drawn inside the element, border reset or not', async () => {
  const screen = await render(Button, { slots: { default: 'Save' } })
  const button = screen.container.querySelector<HTMLElement>('.ui-button')!
  expect(button.querySelector('.ui-loader')!.getAnimations().length).toBe(0)
  const box = getComputedStyle(button, '::before')
  expect([box.top, box.left, box.bottom]).toEqual(['0px', '0px', '0px'])
  expect(Number.parseFloat(box.width)).toBeLessThanOrEqual(button.getBoundingClientRect().width)
  expect(getComputedStyle(button).borderTopWidth).toBe('0px')
  // Same height as an md Input next to it.
  const input = await render(Input)
  expect(button.getBoundingClientRect().height).toBe(
    input.container.querySelector('.ui-input')!.getBoundingClientRect().height,
  )
})

test('Collapsible with no trigger slot renders no trigger element', async () => {
  const screen = await render(Collapsible, { props: { open: true }, slots: { default: 'Body' } })
  expect(screen.container.querySelector('.ui-collapsible-trigger')).toBeNull()
  expect(screen.container.querySelector('.ui-collapsible-body')!.textContent).toBe('Body')
})

test('Sortable handle="item": the row is focusable and draggable, a click inside reaches its button, drag events fire', async () => {
  const items = ref([
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo' },
  ])
  const clicked = vi.fn()
  const started = vi.fn()
  const ended = vi.fn()
  const screen = await render(() =>
    h(
      Sortable as never,
      {
        items: items.value,
        'onUpdate:items': (next: typeof items.value) => (items.value = next),
        handle: 'item',
        variant: 'plain',
        onDragStart: started,
        onDragEnd: ended,
      },
      {
        item: ({ item }: { item: { label: string } }) =>
          h('button', { type: 'button', class: 'open', onClick: clicked }, item.label),
      },
    ),
  )
  const root = screen.container.querySelector('.ui-sortable')!
  expect(root).toHaveClass('ui-sortable--plain')
  expect(root.querySelector('.ui-sortable-handle')).toBeNull()
  const rows = root.querySelectorAll<HTMLElement>('.ui-sortable-item')
  expect(rows[0]!.tabIndex).toBe(0)
  expect(getComputedStyle(rows[0]!).borderTopWidth).toBe('0px')
  // A press that doesn't move is a click on the content.
  await userEvent.click(root.querySelector('.open')!)
  expect(clicked).toHaveBeenCalledTimes(1)
  // The keyboard moves the row itself.
  rows[0]!.focus()
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(started).toHaveBeenCalledWith('a'))
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(items.value.map((i) => i.value)).toEqual(['b', 'a']))
  expect(ended).toHaveBeenCalledWith('a')
})

test('Sortable axis x lines items up at the top', async () => {
  const screen = await render(() =>
    h(Sortable as never, { items: [{ value: 'a', label: 'A' }], axis: 'x' }),
  )
  expect(getComputedStyle(screen.container.querySelector('.ui-sortable')!).alignItems).toBe(
    'flex-start',
  )
})

test('Editable: opened from outside, its control takes focus; Escape cancels the edit, not the dialog around it', async () => {
  const editing = shallowRef(false)
  const open = shallowRef(true)
  await render(() =>
    h(
      Dialog as never,
      { open: open.value, 'onUpdate:open': (v: boolean) => (open.value = v), title: 'Task' },
      {
        default: () =>
          h(Editable as never, {
            modelValue: 'Name',
            editing: editing.value,
            'onUpdate:editing': (v: boolean) => (editing.value = v),
          }),
      },
    ),
  )
  await vi.waitFor(() => expect(document.querySelector('.ui-editable-preview')).not.toBeNull())
  editing.value = true
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(document.querySelector('.ui-editable input')),
  )
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(editing.value).toBe(false))
  expect(open.value).toBe(true)
})

test('OtpInput.focus() called while disabled lands once it is enabled again', async () => {
  const otp = ref<{ focus: () => void } | null>(null)
  const disabled = shallowRef(true)
  await render(() => h(OtpInput as never, { ref: otp, disabled: disabled.value, length: 4 }))
  otp.value!.focus()
  expect(document.activeElement).toBe(document.body)
  disabled.value = false
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(document.querySelector('.ui-otp-input')),
  )
})

test('messages: a {count} placeholder survives an i18n that interpolates named params; English is never "missing"', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  // vue-i18n blanks a named param it isn't given.
  const t = (key: string, named: Record<string, string>) =>
    key === 'uiKit.select.selectedCount' ? `${named.count ?? ''} selected` : key
  const resolved = resolveMessagesFromI18n({ t, locale: 'en' } as never)
  expect(resolved.select?.selectedCount).toBe('{count} selected')
  expect(warn).not.toHaveBeenCalled()
  resolveMessagesFromI18n({ t, locale: 'fr' } as never)
  expect(warn).toHaveBeenCalledTimes(1)
  warn.mockRestore()
})

test('v-scroll-mask.x reads as the axis', async () => {
  const screen = await render(() =>
    withDirectives(
      h('div', { style: 'inline-size: 100px; overflow: auto; white-space: nowrap' }, [
        h('span', { style: 'display: inline-block; inline-size: 400px' }),
      ]),
      [[vScrollMask, undefined, '', { x: true }]],
    ),
  )
  await vi.waitFor(() => expect(screen.container.firstElementChild).toHaveClass('scroll-fade-x'))
})

test('v-tooltip keys render as Kbd after the text', async () => {
  await render(() => [
    h(TooltipHost as never, { openDelay: 0 }),
    withDirectives(h('button', { class: 'target' }, 'Search'), [
      [vTooltip, { content: 'Search', keys: ['⌘', 'K'] }],
    ]),
  ])
  await userEvent.hover(document.querySelector('.target')!)
  await vi.waitFor(() => {
    const keys = document.querySelectorAll('.ui-tooltip-keys .ui-kbd')
    expect(Array.from(keys, (k) => k.textContent)).toEqual(['⌘', 'K'])
  })
})

test('Menu #label replaces the text and keeps the shortcut', async () => {
  const screen = await render(() =>
    h(
      Menu as never,
      { open: true, items: [{ label: 'Save', shortcut: '⌘S' }] },
      {
        trigger: () => h('button', 'Open'),
        label: ({ item }: { item: { label: string } }) => h('b', item.label.toUpperCase()),
      },
    ),
  )
  await vi.waitFor(() => expect(document.querySelector('[role="menuitem"]')).not.toBeNull())
  const row = document.querySelector('[role="menuitem"]')!
  expect(row.querySelector('.ui-menu-item-label b')!.textContent).toBe('SAVE')
  expect(row.querySelector('.ui-menu-item-shortcut')!.textContent!.trim()).toBe('⌘S')
  screen.unmount()
})

test('Calendar: a click on a control inside a day is its own; planner cells are boxes that share the width', async () => {
  const picked = vi.fn()
  const chip = vi.fn()
  const screen = await render(() =>
    h(
      Calendar as never,
      { modelValue: new Date(2024, 5, 15), firstDayOfWeek: 0, planner: true, onChange: picked },
      {
        day: ({ date }: { date: Date }) => [
          h('span', String(date.getDate())),
          h('button', { type: 'button', class: 'chip', onClick: chip }, 'Task'),
        ],
      },
    ),
  )
  const root = screen.container.querySelector<HTMLElement>('.ui-calendar-root')!
  expect(root).toHaveClass('ui-calendar-root--planner')
  const cell = document.querySelector<HTMLElement>('[data-date="2024-06-10"]')!
  expect(getComputedStyle(cell).aspectRatio).toBe('auto')
  await userEvent.click(cell.querySelector('.chip')!)
  expect(chip).toHaveBeenCalledTimes(1)
  expect(picked).not.toHaveBeenCalled()
  expect(cell.getAttribute('aria-selected')).toBeNull()
  // Arrow keys typed into the chip stay with it.
  cell.querySelector<HTMLElement>('.chip')!.focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(document.activeElement).toBe(cell.querySelector('.chip'))
})

test('Input loading shows a spinner and marks the field busy', async () => {
  const screen = await render(Input, { props: { loading: true } })
  expect(screen.container.querySelector('.ui-input-loader .ui-loader')).not.toBeNull()
  expect(screen.container.querySelector('input')!.getAttribute('aria-busy')).toBe('true')
})

test('a spring over a long distance ends within a pixel of its target instead of jumping', () => {
  const far = springEasing('snappy', 0, 0.5 / 1000)
  const points = far.easing.slice('linear('.length, -1).split(', ').map(Number)
  const last = points.at(-2)!
  expect(Math.abs(1 - last) * 1000).toBeLessThan(1)
  // The default stays as it was for ordinary moves.
  expect(springEasing('snappy').duration).toBeLessThan(far.duration)
})

test('`after` waits on a layoutId slide under the same name', async () => {
  const where = shallowRef<'a' | 'b'>('a')
  const screen = await render(() => [
    h('div', { style: 'display: flex; justify-content: space-between; inline-size: 600px' }, [
      where.value === 'a'
        ? withDirectives(
            h('div', { key: 'a', class: 'agent', style: 'inline-size: 40px; block-size: 40px' }),
            [[vAnimate, { layoutId: 'agent', duration: 300 }, 'agent']],
          )
        : h('span', { key: 'a-gap' }),
      where.value === 'b'
        ? withDirectives(
            h('div', { key: 'b', class: 'agent', style: 'inline-size: 40px; block-size: 40px' }),
            [[vAnimate, { layoutId: 'agent', duration: 300 }, 'agent']],
          )
        : h('span', { key: 'b-gap' }),
    ]),
    where.value === 'b'
      ? withDirectives(h('p', { class: 'note' }, 'Moved'), [
          [vAnimate, { initial: { opacity: 0 }, after: 'agent:60%', duration: 50 }],
        ])
      : null,
  ])
  await frame()
  where.value = 'b'
  await nextTick()
  const note = await vi.waitFor(() => screen.container.querySelector('.note')!)
  await sleep(60)
  // 60 ms in, well before 60% of a 300 ms slide: still unseen.
  expect(Number(getComputedStyle(note).opacity)).toBeLessThan(0.05)
  await vi.waitFor(() => expect(Number(getComputedStyle(note).opacity)).toBe(1), {
    timeout: 1500,
  })
})

test("layout: 'position' rows don't bounce when an ancestor's entrance transform ends", async () => {
  const tick = shallowRef(0)
  const screen = await render(() =>
    h('section', { class: 'view', style: 'position: relative; padding: 8px' }, [
      h(
        'ul',
        { style: 'margin: 0; padding: 0' },
        ['a', 'b', 'c'].map((id) =>
          withDirectives(h('li', { 'data-tick': tick.value, style: 'block-size: 24px' }, id), [
            [vAnimate, { layout: 'position', duration: 200 }],
          ]),
        ),
      ),
    ]),
  )
  const view = screen.container.querySelector<HTMLElement>('.view')!
  const rows = [...screen.container.querySelectorAll<HTMLElement>('li')]
  // The view comes in on a translate (its offsetParent flips while it does).
  const entrance = view.animate([{ translate: '0 40px' }, { translate: '0 0' }], {
    duration: 150,
    fill: 'both',
  })
  await frame()
  tick.value++
  await nextTick()
  await entrance.finished
  tick.value++
  await nextTick()
  await frame()
  for (const row of rows) expect(runsOn(row).filter((run) => run.id === LAYOUT_ID)).toHaveLength(0)
})

test("appear: 'once' plays a name's entrance once per page load, stagger included, and never again", async () => {
  const shown = shallowRef(false)
  const rows = shallowRef<string[]>([])
  const screen = await render(() =>
    shown.value
      ? h(
          'ul',
          rows.value.map((id) =>
            withDirectives(h('li', { class: 'row', key: id }, id), [
              [vAnimate, { initial: { opacity: 0 }, appear: 'once', duration: 120 }, 'rows:once'],
            ]),
          ),
        )
      : null,
  )
  shown.value = true
  await nextTick()
  // The rows arrive after the first render, as loaded data does: they still come in, together.
  rows.value = ['a', 'b']
  await nextTick()
  await frame()
  const first = [...screen.container.querySelectorAll<HTMLElement>('.row')]
  expect(first).toHaveLength(2)
  for (const row of first) expect(runsOn(row).length).toBeGreaterThan(0)
  await sleep(250)
  // Mounted again under the same name (the group collapsed and reopened): shown at once.
  shown.value = false
  await nextTick()
  shown.value = true
  await nextTick()
  await frame()
  for (const row of screen.container.querySelectorAll<HTMLElement>('.row')) {
    expect(runsOn(row)).toHaveLength(0)
    expect(getComputedStyle(row).opacity).toBe('1')
  }
})

test('Sortable: Escape while beforeDrop is deciding cancels the move, even when it then says yes', async () => {
  let approve!: (ok: boolean) => void
  const items = ref([
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Bravo' },
  ])
  const beforeDrop = vi.fn(() => new Promise<boolean>((resolve) => (approve = resolve)))
  const screen = await render(() =>
    h(Sortable as never, {
      items: items.value,
      'onUpdate:items': (next: typeof items.value) => (items.value = next),
      beforeDrop,
      motion: false,
    }),
  )
  const handle = screen.container.querySelector<HTMLElement>('.ui-sortable-handle')!
  handle.focus()
  await userEvent.keyboard(' ')
  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard(' ')
  await vi.waitFor(() => expect(beforeDrop).toHaveBeenCalledTimes(1))
  // A second drop key while it's pending doesn't ask again.
  await userEvent.keyboard('{Enter}')
  expect(beforeDrop).toHaveBeenCalledTimes(1)
  await userEvent.keyboard('{Escape}')
  approve(true)
  await sleep(50)
  expect(items.value.map((i) => i.value)).toEqual(['a', 'b'])
})

test('useSortable: lists outside a component (a directive) get distinct group ids', async () => {
  const { useSortable } = await import('../src/composables/useSortable')
  const { useSortableGroup } = await import('../src/composables/useSortableGroup')
  const { effectScope } = await import('vue')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const group = useSortableGroup({ onTransfer: () => {} })
  const register = vi.spyOn(group, '__register')
  const scope = effectScope()
  scope.run(() => {
    for (let i = 0; i < 2; i++)
      useSortable({ rows: [], getElement: () => null, onCommit: () => {}, group })
  })
  await nextTick()
  scope.stop()
  warn.mockRestore()
  const ids = register.mock.calls.map(([id]) => id)
  expect(ids).toHaveLength(2)
  expect(new Set(ids).size).toBe(2)
  expect(ids).not.toContain('')
})

test('theme contrast colours parse without the DOM, the same on server and client, oklch included', async () => {
  const { resolveRgb } = await import('../src/theme')
  expect(resolveRgb('#fc0')).toEqual([255, 204, 0])
  expect(resolveRgb('rgb(10 20 30)')).toEqual([10, 20, 30])
  expect(resolveRgb('hsl(0 100% 50%)').map(Math.round)).toEqual([255, 0, 0])
  // oklch(0.9 0.18 100) is a light yellow; read as rgb it would be near black.
  const [r, g, b] = resolveRgb('oklch(0.9 0.18 100)')
  expect(r).toBeGreaterThan(200)
  expect(g).toBeGreaterThan(200)
  expect(b).toBeLessThan(120)
  expect(resolveRgb('rebeccapurple')).toEqual([102, 51, 153])
})

test('useVirtualizer: with getKey, measured heights stay with their rows when rows are prepended', async () => {
  const { useVirtualizer } = await import('../src/composables/useVirtualizer')
  const { effectScope } = await import('vue')
  const container = shallowRef<HTMLElement | null>(document.createElement('div'))
  const keys = shallowRef(['a', 'b'])
  const scope = effectScope()
  const v = scope.run(() =>
    useVirtualizer({
      containerEl: container,
      count: () => keys.value.length,
      dynamic: true,
      estimateSize: 40,
      getKey: (i) => keys.value[i]!,
    }),
  )!
  const tall = document.createElement('div')
  tall.style.blockSize = '100px'
  document.body.append(tall)
  v.measureRow(0, tall)
  await vi.waitFor(() => expect(v.totalSize.value).toBe(140))
  // An older row arrives above: 'a' keeps its 100px, the newcomer takes the estimate.
  keys.value = ['z', 'a', 'b']
  await nextTick()
  expect(v.totalSize.value).toBe(180)
  scope.stop()
  tall.remove()
})

test('ColorPicker and Editable take a Field label, description and disabled', async () => {
  const Field = (await import('../src/components/Field/Field.vue')).default
  const ColorPicker = (await import('../src/components/ColorPicker/ColorPicker.vue')).default
  const screen = await render(() => [
    h(Field as never, { label: 'Colour', description: 'Brand', disabled: true }, () =>
      h(ColorPicker as never, {}),
    ),
    h(Field as never, { label: 'Name', disabled: true }, () =>
      h(Editable as never, { modelValue: 'Ana' }),
    ),
  ])
  const swatch = screen.container.querySelector<HTMLButtonElement>('.ui-color-picker-swatch')!
  expect(swatch.disabled).toBe(true)
  expect(swatch.getAttribute('aria-labelledby')).toBeTruthy()
  expect(swatch.getAttribute('aria-describedby')).toBeTruthy()
  const preview = screen.container.querySelector<HTMLButtonElement>('.ui-editable-preview')!
  expect(preview.disabled).toBe(true)
  expect(preview.getAttribute('aria-labelledby')).toBeTruthy()
})
