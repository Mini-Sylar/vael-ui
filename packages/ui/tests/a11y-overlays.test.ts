import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { beforeEach, expect, onTestFinished, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, shallowRef, useTemplateRef } from 'vue'
import Dialog from '../src/components/Dialog/Dialog.vue'
import Popover from '../src/components/Popover/Popover.vue'
import Menu from '../src/components/Menu/Menu.vue'
import Tooltip from '../src/components/Tooltip/Tooltip.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'
import BottomSheet from '../src/components/BottomSheet/BottomSheet.vue'
import CommandPalette from '../src/components/CommandPalette/CommandPalette.vue'
import ContextMenu from '../src/components/ContextMenu/ContextMenu.vue'
import Tour from '../src/components/Tour/Tour.vue'
import Stepper from '../src/components/Stepper/Stepper.vue'
import Breadcrumb from '../src/components/Breadcrumb/Breadcrumb.vue'
import { toast } from '../src/composables/useToast'

const inert = (el: Element | null | undefined) => el?.closest('[inert]') != null
const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
// Real transitions: a stub would leave a wrapper element on the page for each closed overlay.
const real = { global: { stubs: { transition: false, 'transition-group': false } } }

beforeEach(() => {
  toast.dismiss()
  document.querySelectorAll('.ui-toaster').forEach((el) => el.remove())
})

// A page trigger, a modal dialog, and whatever the test puts inside it.
function dialogPage(inner: () => unknown, extra: () => unknown = () => null) {
  const open = shallowRef(false)
  const Page = defineComponent({
    setup: () => () => [
      h('button', { 'data-testid': 'page-button', onClick: () => (open.value = true) }, 'Open'),
      h(
        Dialog as never,
        {
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
          'aria-label': 'Main',
        },
        () => [h('button', { 'data-testid': 'in-dialog' }, 'Inside'), inner()],
      ),
      extra(),
    ],
  })
  return { open, Page }
}

test('modal dialog: the page behind is inert while open, and everything comes back on close', async () => {
  const { open, Page } = dialogPage(() => null)
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()

  expect(inert(byTestId('page-button'))).toBe(true)
  expect(inert(byTestId('in-dialog'))).toBe(false)

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(open.value).toBe(false))
  expect(document.querySelector('[inert]')).toBeNull()
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('page-button')))
})

test('modal dialog: a toast is still announced and its buttons still work', async () => {
  const { Page } = dialogPage(
    () => null,
    () => h(Toaster as never),
  )
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()

  toast('Saved')
  const live = () =>
    [...document.querySelectorAll('[aria-live]')].find((el) => el.textContent?.includes('Saved'))
  await vi.waitFor(() => expect(live()).toBeTruthy())
  expect(inert(live())).toBe(false)

  const dismiss = page.getByRole('button', { name: 'Dismiss' })
  expect(inert(dismiss.element())).toBe(false)
  await dismiss.click()
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull())
})

test('modal dialog: a popover, a menu and a tooltip opened from inside still work', async () => {
  const popoverOpen = shallowRef(false)
  const picked = shallowRef('')
  const Inner = defineComponent({
    setup() {
      const tipTrigger = useTemplateRef<HTMLElement>('tip')
      return () => [
        h(
          Popover as never,
          {
            open: popoverOpen.value,
            'onUpdate:open': (v: boolean) => (popoverOpen.value = v),
            forceMount: true,
            'aria-label': 'Pop',
          },
          {
            trigger: ({ setTriggerEl }: { setTriggerEl: (el: unknown) => void }) =>
              h(
                'button',
                {
                  ref: setTriggerEl,
                  'data-testid': 'pop-trigger',
                  onClick: () => (popoverOpen.value = true),
                },
                'Pop',
              ),
            default: () =>
              h(
                'button',
                { 'data-testid': 'pop-action', onClick: () => (picked.value = 'pop') },
                'Act',
              ),
          },
        ),
        h(
          Menu as never,
          {
            items: [{ label: 'Rename', value: 'rename' }],
            onSelect: (item: { value: string }) => (picked.value = item.value),
          },
          { trigger: () => h('button', { 'data-testid': 'menu-trigger' }, 'More') },
        ),
        h('button', { ref: 'tip', 'data-testid': 'tip-trigger' }, 'Tip'),
        h(Tooltip as never, { triggerEl: tipTrigger.value, openDelay: 0 }, () =>
          h('span', { 'data-testid': 'tip' }, 'Helps'),
        ),
      ]
    },
  })
  const { Page } = dialogPage(() => h(Inner))
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()

  // Force-mounted, so its panel was already on the page when the dialog went modal.
  await userEvent.click(byTestId('pop-trigger')!)
  await vi.waitFor(() => expect(byTestId('pop-action')?.checkVisibility()).toBe(true))
  expect(inert(byTestId('pop-action'))).toBe(false)
  await userEvent.click(byTestId('pop-action')!)
  expect(picked.value).toBe('pop')
  popoverOpen.value = false

  await userEvent.click(byTestId('menu-trigger')!)
  const item = page.getByRole('menuitem', { name: 'Rename' })
  await expect.element(item).toBeVisible()
  expect(inert(item.element())).toBe(false)
  await item.click()
  expect(picked.value).toBe('rename')

  await userEvent.hover(byTestId('tip-trigger')!)
  await vi.waitFor(() => expect(byTestId('tip')).not.toBeNull())
  expect(inert(byTestId('tip'))).toBe(false)
})

test('modal dialog: a submenu opened inside it leaves its parent menu usable', async () => {
  const picked = shallowRef('')
  const { Page } = dialogPage(() =>
    h(
      Menu as never,
      {
        items: [
          { label: 'Cut', value: 'cut' },
          { label: 'Share', items: [{ label: 'Email', value: 'email' }] },
        ],
        onSelect: (item: { value: string }) => (picked.value = item.value),
      },
      { trigger: () => h('button', { 'data-testid': 'menu-trigger' }, 'More') },
    ),
  )
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()
  await userEvent.click(byTestId('menu-trigger')!)
  await page.getByRole('menuitem', { name: 'Share' }).click()
  await expect.element(page.getByRole('menuitem', { name: 'Email' })).toBeVisible()

  expect(inert(page.getByRole('menuitem', { name: 'Email' }).element())).toBe(false)
  expect(inert(page.getByRole('menuitem', { name: 'Cut' }).element())).toBe(false)
})

test('modal dialog: a dialog opened from inside works, and closing it restores the first', async () => {
  const innerOpen = shallowRef(false)
  const { open, Page } = dialogPage(() => [
    h('button', { 'data-testid': 'open-inner', onClick: () => (innerOpen.value = true) }, 'Next'),
    h(
      Dialog as never,
      {
        open: innerOpen.value,
        'onUpdate:open': (v: boolean) => (innerOpen.value = v),
        'aria-label': 'Inner',
      },
      () => h('button', { 'data-testid': 'inner-action' }, 'Inner action'),
    ),
  ])
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()
  await userEvent.click(byTestId('open-inner')!)
  await expect.element(page.getByRole('dialog', { name: 'Inner' })).toBeVisible()

  expect(inert(byTestId('inner-action'))).toBe(false)
  expect(inert(byTestId('open-inner'))).toBe(true)
  expect(inert(byTestId('page-button'))).toBe(true)

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(innerOpen.value).toBe(false))
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('open-inner')))
  expect(inert(byTestId('open-inner'))).toBe(false)
  expect(inert(byTestId('page-button'))).toBe(true)
  await userEvent.click(byTestId('in-dialog')!)

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(open.value).toBe(false))
  await vi.waitFor(() => expect(document.querySelector('[inert]')).toBeNull())
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('page-button')))
})

test('contained modal dialog: aria-modal is set', async () => {
  const Page = defineComponent({
    setup() {
      const box = useTemplateRef<HTMLElement>('box')
      return () =>
        h('div', { ref: 'box', style: 'height: 300px' }, [
          box.value &&
            h(Dialog as never, { open: true, container: box.value, 'aria-label': 'Scoped' }, () =>
              h('p', 'Scoped'),
            ),
        ])
    },
  })
  await render(Page, real)
  await expect
    .element(page.getByRole('dialog', { name: 'Scoped' }))
    .toHaveAttribute('aria-modal', 'true')
})

test('BottomSheet: named by its title; the handle is a button whose arrows move between snap points', async () => {
  let api: { activeSnap: string | null } | null = null
  const open = shallowRef(false)
  await render(() =>
    h(
      BottomSheet as never,
      { ref: (el: unknown) => (api = el as typeof api), open: open.value, title: 'Filters' },
      () => h('button', 'Apply'),
    ),
  )
  open.value = true
  const snap = () => api?.activeSnap
  const sheet = page.getByRole('dialog', { name: 'Filters' })
  await expect.element(sheet).toBeVisible()
  const handle = page.getByRole('button', { name: 'Resize sheet' })
  await expect.element(handle).toBeVisible()
  // Opening doesn't put focus on the grip.
  await vi.waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Close'))

  handle.element().focus()
  expect(snap()).toBe('small')
  await userEvent.keyboard('{ArrowUp}')
  expect(snap()).toBe('large')
  await userEvent.keyboard('{ArrowUp}')
  expect(snap()).toBe('large')
  await userEvent.keyboard('{ArrowDown}')
  expect(snap()).toBe('small')
  await userEvent.keyboard('{ArrowDown}')
  expect(snap()).toBe('small')
  expect(sheet.element().isConnected).toBe(true)
})

test('CommandPalette: named input, aria-disabled items, a polite result count, and named groups', async () => {
  await render(CommandPalette, {
    props: {
      open: true,
      items: [
        { id: 'new', label: 'New file', group: 'Files' },
        { id: 'open', label: 'Open file', group: 'Files', disabled: true },
        { id: 'zoom', label: 'Zoom in', group: 'View' },
      ],
    },
  })
  const input = page.getByRole('combobox', { name: 'Command palette' })
  await expect.element(input).toBeVisible()
  await expect
    .element(page.getByRole('option', { name: 'Open file' }))
    .toHaveAttribute('aria-disabled', 'true')
  expect(
    page.getByRole('option', { name: 'New file' }).element().hasAttribute('aria-disabled'),
  ).toBe(false)

  const files = page.getByRole('group', { name: 'Files' })
  await expect.element(files).toBeInTheDocument()
  const owned = files.element().getAttribute('aria-owns')!.split(' ')
  expect(owned.map((id) => document.getElementById(id)?.textContent?.trim())).toEqual([
    'New file',
    'Open file',
  ])
  await expect.element(page.getByRole('group', { name: 'View' })).toBeInTheDocument()

  const status = page.getByRole('status')
  await userEvent.type(input, 'file')
  await expect.element(status).toHaveTextContent('2 results')
  await userEvent.type(input, 'zzz')
  await expect.element(status).toHaveTextContent('No results')
})

test('Menu: the menu is named by its trigger, and a submenu by its row', async () => {
  await render(
    () =>
      h(
        Menu as never,
        {
          items: [
            { label: 'Cut', value: 'cut' },
            { label: 'Share', items: [{ label: 'Email', value: 'email' }] },
          ],
        },
        { trigger: () => h('button', 'More actions') },
      ),
    real,
  )
  await page.getByRole('button', { name: 'More actions' }).click()
  await expect.element(page.getByRole('menu', { name: 'More actions' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Share' }).click()
  await expect.element(page.getByRole('menu', { name: 'Share' })).toBeVisible()
})

test('ContextMenu: closing returns focus to what had it, or to what was right-clicked', async () => {
  await render(
    () =>
      h(ContextMenu as never, { items: [{ label: 'Rename', value: 'rename' }] }, () => [
        h('div', { 'data-testid': 'card', style: 'block-size: 80px' }, 'Card'),
        h('button', { 'data-testid': 'row-button' }, 'Row'),
      ]),
    real,
  )
  const menu = page.getByRole('menu')

  // From the keyboard: the browser fires contextmenu on the focused element.
  byTestId('row-button')!.focus()
  byTestId('row-button')!.dispatchEvent(
    new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
  )
  await expect.element(menu).toBeVisible()
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Rename'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('row-button')))

  // A right-click on something that can't take focus: it takes focus for the return, not <body>.
  await userEvent.click(byTestId('card')!, { button: 'right' })
  await expect.element(menu).toBeVisible()
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Rename'))
  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull())
  expect(document.activeElement).toBe(byTestId('card'))
})

test('Tour (modal): aria-modal, Tab stays in the callout, and closing returns focus to its button', async () => {
  const open = shallowRef(false)
  await render(
    () => [
      // Like Safari, a click doesn't focus it.
      h(
        'button',
        {
          'data-testid': 'start',
          onMousedown: (e: Event) => e.preventDefault(),
          onClick: () => (open.value = true),
        },
        'Start tour',
      ),
      h('button', { id: 'tour-target' }, 'Target'),
      h(Tour as never, {
        open: open.value,
        'onUpdate:open': (v: boolean) => (open.value = v),
        steps: [
          { target: '#tour-target', title: 'First' },
          { target: '#tour-target', title: 'Second' },
        ],
      }),
    ],
    real,
  )
  await userEvent.click(byTestId('start')!)
  const callout = page.getByRole('dialog', { name: 'First' })
  await expect.element(callout).toBeVisible()
  await expect.element(callout).toHaveAttribute('aria-modal', 'true')
  await vi.waitFor(() => expect(callout.element().contains(document.activeElement)).toBe(true))

  for (let i = 0; i < 6; i++) {
    await userEvent.keyboard('{Tab}')
    expect(callout.element().contains(document.activeElement)).toBe(true)
  }
  for (let i = 0; i < 6; i++) {
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(callout.element().contains(document.activeElement)).toBe(true)
  }

  await userEvent.keyboard('{Escape}')
  await vi.waitFor(() => expect(open.value).toBe(false))
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('start')))

  // Through to the end with the buttons: Done also hands focus back.
  await userEvent.keyboard('{Enter}')
  await expect.element(page.getByRole('dialog', { name: 'First' })).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect.element(page.getByRole('dialog', { name: 'Second' })).toBeVisible()
  await page.getByRole('button', { name: 'Done' }).click()
  await vi.waitFor(() => expect(open.value).toBe(false))
  await vi.waitFor(() => expect(document.activeElement).toBe(byTestId('start')))
})

test('Stepper: a completed step says so', async () => {
  await render(Stepper, {
    props: { modelValue: 1, items: [{ label: 'Account' }, { label: 'Profile' }] },
  })
  await expect.element(page.getByRole('button', { name: 'Account Completed' })).toBeVisible()
  const current = document.querySelector('[aria-current="step"]')!
  expect(current.textContent).toContain('Profile')
  expect(current.textContent).not.toContain('Completed')
})

test('Breadcrumb: the separator chevron points left right to left', async () => {
  await render(() =>
    h('div', { dir: 'rtl' }, [
      h(Breadcrumb as never, { items: [{ label: 'Home' }, { label: 'Docs' }] }),
    ]),
  )
  const icon = document.querySelector<SVGElement>('.ui-breadcrumb-separator svg')!
  expect(getComputedStyle(icon).scale).toBe('-1 1')
})

test('BottomSheet mounted open: it rests on its first snap point, so the handle arrows work', async () => {
  let api = null as { activeSnap: string | null } | null
  await render(() =>
    h(
      BottomSheet as never,
      { ref: (el: unknown) => (api = el as typeof api), open: true, title: 'Filters' },
      () => h('button', 'Apply'),
    ),
  )
  await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  await vi.waitFor(() => expect(api?.activeSnap).toBe('small'))
  page.getByRole('button', { name: 'Resize sheet' }).element().focus()
  await userEvent.keyboard('{ArrowUp}')
  expect(api?.activeSnap).toBe('large')
})

test('modal dialog: a tooltip teleported into a container that was already there still describes', async () => {
  const host = document.createElement('div')
  host.className = 'my-tooltips'
  document.body.appendChild(host)
  onTestFinished(() => host.remove())
  const Inner = defineComponent({
    setup() {
      const tipTrigger = useTemplateRef<HTMLElement>('tip')
      return () => [
        h('button', { ref: 'tip', 'data-testid': 'tip-trigger' }, 'Tip'),
        h(Tooltip as never, { triggerEl: tipTrigger.value, openDelay: 0, teleportTo: host }, () =>
          h('span', { 'data-testid': 'tip' }, 'Helps'),
        ),
      ]
    },
  })
  const { Page } = dialogPage(() => h(Inner))
  await render(Page, real)
  await userEvent.click(byTestId('page-button')!)
  await expect.element(page.getByRole('dialog', { name: 'Main' })).toBeVisible()
  await vi.waitFor(() => expect(inert(host)).toBe(true))
  await userEvent.hover(byTestId('tip-trigger')!)
  await vi.waitFor(() => expect(byTestId('tip')).not.toBeNull())
  await vi.waitFor(() => expect(inert(byTestId('tip'))).toBe(false))
})
