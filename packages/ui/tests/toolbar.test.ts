import '../src/style.css'
import { page, userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import ToolbarFixture from './fixtures/ToolbarFixture.vue'
import ToolbarGroupsFixture from './fixtures/ToolbarGroupsFixture.vue'
import ToolbarOverflowFixture from './fixtures/ToolbarOverflowFixture.vue'

// Every test scopes its queries to ITS OWN render's container and unmounts
// on the way out — `document.querySelector` here would happily match a
// stale element left over from an earlier test that never called
// unmount(), which is exactly what made this file flaky in the full suite
// (query hits a DIFFERENT test's leftover DOM) while every test still
// passed cleanly in isolation.
function toolbarItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="toolbar"] [data-testid]'))
}

test('toolbar has an accessible name and role', async () => {
  const screen = render(ToolbarFixture)
  try {
    await expect.element(page.getByRole('toolbar', { name: 'Text formatting' })).toBeVisible()
  } finally {
    screen.unmount()
  }
})

test('exactly one item is tabindex="0" at any time, starting on the first enabled item', async () => {
  const screen = render(ToolbarFixture)
  try {
    const items = toolbarItems(screen.container)
    const zeroed = items.filter((el) => el.tabIndex === 0)
    expect(zeroed.length).toBe(1)
    expect(zeroed[0].dataset.testid).toBe('bold')
  } finally {
    screen.unmount()
  }
})

test('ArrowRight/ArrowLeft move focus and wrap at both ends', async () => {
  const screen = render(ToolbarFixture)
  try {
    const bold = screen.container.querySelector<HTMLElement>('[data-testid="bold"]')!
    bold.focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="italic"]'))

    // ArrowLeft from the first item wraps to the last enabled item, skipping
    // the disabled "Strikethrough" button.
    await userEvent.keyboard('{ArrowLeft}')
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(
      screen.container.querySelector('[data-testid="menu-trigger"]'),
    )
  } finally {
    screen.unmount()
  }
})

test('ArrowUp/ArrowDown are inert on a horizontal toolbar; the vertical orientation swaps the axis', async () => {
  const screen = render(ToolbarFixture)
  const vertical = render(ToolbarFixture, { props: { orientation: 'vertical' } })
  try {
    const bold = screen.container.querySelector<HTMLElement>('[data-testid="bold"]')!
    bold.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(bold)

    const verticalBold = vertical.container.querySelector<HTMLElement>('[data-testid="bold"]')!
    verticalBold.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(verticalBold)
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(vertical.container.querySelector('[data-testid="italic"]'))
  } finally {
    screen.unmount()
    vertical.unmount()
  }
})

test('Home/End jump to the first/last enabled item', async () => {
  const screen = render(ToolbarFixture)
  try {
    const italic = screen.container.querySelector<HTMLElement>('[data-testid="italic"]')!
    italic.focus()

    await userEvent.keyboard('{End}')
    expect(document.activeElement).toBe(
      screen.container.querySelector('[data-testid="menu-trigger"]'),
    )

    await userEvent.keyboard('{Home}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="bold"]'))
  } finally {
    screen.unmount()
  }
})

test('a disabled child is skipped by arrow navigation and never becomes the roving tabstop', async () => {
  const screen = render(ToolbarFixture)
  try {
    const disabled = screen.container.querySelector<HTMLElement>('[data-testid="disabled"]')!
    expect(disabled.tabIndex).toBe(-1)

    const menuTrigger = screen.container.querySelector<HTMLElement>('[data-testid="menu-trigger"]')!
    menuTrigger.focus()
    await userEvent.keyboard('{ArrowRight}')
    // Wraps past the disabled item straight back to the first enabled one.
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="bold"]'))
  } finally {
    screen.unmount()
  }
})

test('tabindex roves to the last-focused item — Tab out and Shift+Tab back lands there, not on the first item', async () => {
  const screen = render(ToolbarFixture)
  try {
    const italic = screen.container.querySelector<HTMLElement>('[data-testid="italic"]')!
    italic.focus()
    await userEvent.keyboard('{ArrowRight}') // moves to the toggle button

    const items = toolbarItems(screen.container)
    expect(items.filter((el) => el.tabIndex === 0)).toEqual([
      screen.container.querySelector('[data-testid="pressed"]'),
    ])

    screen.container.querySelector<HTMLElement>('[data-testid="after"]')!.focus()
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="pressed"]'))
  } finally {
    screen.unmount()
  }
})

test('the start/center/end slots render as three groups, in order, with the default slot landing in the start group', async () => {
  const screen = render(ToolbarGroupsFixture)
  try {
    const ids = toolbarItems(screen.container).map((el) => el.dataset.testid)
    expect(ids).toEqual(['s1', 'd1', 'c1', 'e1'])
  } finally {
    screen.unmount()
  }
})

test('arrow navigation roves continuously across group boundaries', async () => {
  const screen = render(ToolbarGroupsFixture)
  try {
    const s1 = screen.container.querySelector<HTMLElement>('[data-testid="s1"]')!
    s1.focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="d1"]'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="c1"]'))
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(screen.container.querySelector('[data-testid="e1"]'))
    // Wraps from the last group's item back to the first.
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(s1)
  } finally {
    screen.unmount()
  }
})

test('overflow: opt-in end-group items collapse into an ellipsis menu once the toolbar is too narrow, mirroring disabled state', async () => {
  const screen = render(ToolbarOverflowFixture, { props: { width: '100px' } })
  try {
    await vi.waitFor(
      () => {
        expect(
          screen.container
            .querySelector('[data-testid="share"]')
            ?.hasAttribute('data-toolbar-collapsed'),
        ).toBe(true)
      },
      { timeout: 2000 },
    )
    expect(
      screen.container
        .querySelector('[data-testid="comment"]')
        ?.hasAttribute('data-toolbar-collapsed'),
    ).toBe(true)
    expect(
      screen.container
        .querySelector('[data-testid="export"]')
        ?.hasAttribute('data-toolbar-collapsed'),
    ).toBe(true)
    // Non-opt-in items are never collapsed, even under extreme narrowing.
    expect(
      screen.container
        .querySelector('[data-testid="save"]')
        ?.hasAttribute('data-toolbar-collapsed'),
    ).toBeFalsy()

    const trigger = screen.container.querySelector<HTMLElement>('[data-toolbar-ellipsis]')!
    expect(trigger).not.toBeNull()

    trigger.click()
    await expect.element(screen.getByRole('menu')).toBeInTheDocument()
    const shareRow = screen.getByRole('menuitem', { name: 'Share' })
    const commentRow = screen.getByRole('menuitem', { name: 'Comment' })
    const exportRow = screen.getByRole('menuitem', { name: 'Export' })
    await expect.element(shareRow).toBeInTheDocument()
    await expect.element(commentRow).toBeInTheDocument()
    await expect.element(exportRow).toBeDisabled()

    await commentRow.click()
    await expect.element(screen.getByTestId('comment-clicked')).toHaveTextContent('1')
    // The ellipsis menu is Teleported to <body>, outside screen.container —
    // the one query in this file that legitimately has to stay unscoped.
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull(), {
      timeout: 2000,
    })
  } finally {
    screen.unmount()
  }
})

test("overflow: widening the toolbar past the collapsed items' remembered width removes the ellipsis", async () => {
  const screen = render(ToolbarOverflowFixture, { props: { width: '100px' } })
  try {
    await vi.waitFor(
      () => {
        expect(screen.container.querySelector('[data-toolbar-ellipsis]')).not.toBeNull()
      },
      { timeout: 2000 },
    )

    await screen.rerender({ width: '900px' })
    await vi.waitFor(
      () => {
        expect(screen.container.querySelector('[data-toolbar-ellipsis]')).toBeNull()
      },
      { timeout: 2000 },
    )
    expect(
      screen.container
        .querySelector('[data-testid="share"]')
        ?.hasAttribute('data-toolbar-collapsed'),
    ).toBeFalsy()
    expect(
      screen.container
        .querySelector('[data-testid="export"]')
        ?.hasAttribute('data-toolbar-collapsed'),
    ).toBeFalsy()
  } finally {
    screen.unmount()
  }
})

test('a child Menu still opens on click and its own arrow navigation is not hijacked by the toolbar', async () => {
  const screen = render(ToolbarFixture)
  try {
    // A real (Playwright-backed) click, not a raw DOM .click() — it waits
    // for the trigger to actually be actionable first, same as menu.test.ts's
    // equivalent open test. A raw .click() fires immediately regardless of
    // whether the toolbar's own mount/layout pass (MutationObserver +
    // ResizeObserver-driven sync() in useToolbar) has settled yet, which is
    // what made this specific test flaky under a full parallel suite run
    // while passing reliably alone.
    const trigger = screen.getByTestId('menu-trigger')
    await trigger.click()

    // The Menu panel is Teleported to <body> — legitimately unscoped, same
    // as the overflow ellipsis test above. Generous timeout: under a full
    // parallel suite run, floating-ui positioning + the open transition can
    // take noticeably longer than the 1000ms vi.waitFor default.
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).not.toBeNull(), {
      timeout: 3000,
    })
    await vi.waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('menuitem'), {
      timeout: 3000,
    })
    const firstItem = document.activeElement as HTMLElement

    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).not.toBe(firstItem)
    expect(document.activeElement?.getAttribute('role')).toBe('menuitem')

    await userEvent.keyboard('{Enter}')
    await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull(), {
      timeout: 2000,
    })
  } finally {
    screen.unmount()
  }
})
