import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import type { RenderResult } from 'vitest-browser-vue'
import TreeReorderFixture from './fixtures/TreeReorderFixture.vue'
import type { SortableDropDetails } from '../src/composables/useSortable'

function rowFor(screen: RenderResult<unknown>, value: string): HTMLElement {
  return screen.container.querySelector<HTMLElement>(`[data-tree-value="${value}"]`)!
}
function shape(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="shape"]')!.textContent!
}
function live(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[aria-live="assertive"]')?.textContent?.trim() ?? ''
}

test('a reorderable tree marks its rows as draggable for assistive tech', async () => {
  const screen = render(TreeReorderFixture)
  expect(rowFor(screen, 'a').getAttribute('aria-roledescription')).toBe('draggable tree item')
  expect(screen.container.querySelector('[aria-live="assertive"]')).not.toBeNull()
})

test('keyboard: Space grabs a row and arrows move it among its siblings', async () => {
  const screen = render(TreeReorderFixture)
  expect(shape(screen)).toBe('a,folder(f1,f2),z')

  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' ')
  expect(live(screen)).toContain('Grabbed a')

  await userEvent.keyboard('{ArrowDown} ')
  await vi.waitFor(() => expect(shape(screen)).toBe('folder(f1,f2),a,z'))
})

test('keyboard: Escape cancels without touching the tree', async () => {
  const screen = render(TreeReorderFixture)
  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' {ArrowDown}{Escape}')
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
  expect(live(screen)).toContain('cancelled')
})

test('keyboard: ArrowRight nests a row under the sibling above it', async () => {
  const screen = render(TreeReorderFixture)
  rowFor(screen, 'z').focus()
  await userEvent.keyboard(' {ArrowRight} ')
  // z moves inside folder rather than staying at the root.
  await vi.waitFor(() => expect(shape(screen)).toContain('folder('))
  expect(shape(screen)).not.toBe('a,folder(f1,f2),z')
})

test('a nested child can be pulled back out to the root', async () => {
  const screen = render(TreeReorderFixture)
  // ArrowRight on an unheld row still expands, as it always did — reorder only
  // claims the arrows once something is actually grabbed.
  rowFor(screen, 'folder').focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(rowFor(screen, 'f1')).not.toBeNull())
  rowFor(screen, 'f1').focus()
  await userEvent.keyboard(' {ArrowUp}{ArrowUp} ')
  await vi.waitFor(() => expect(shape(screen)).not.toBe('a,folder(f1,f2),z'))
  // f1 left the folder.
  expect(shape(screen)).not.toContain('folder(f1,f2)')
})

test('canDrop=false blocks the move and flags the tree invalid', async () => {
  const screen = render(TreeReorderFixture, { props: { canDrop: () => false } })
  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' {ArrowDown}')
  expect(screen.container.querySelector('[data-invalid-drop]')).not.toBeNull()
  await userEvent.keyboard(' ')
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
})

test('an async beforeDrop gates the tree move exactly as it gates a list', async () => {
  let decide!: (value: boolean) => void
  const gate = new Promise<boolean>((resolve) => {
    decide = resolve
  })
  const screen = render(TreeReorderFixture, { props: { beforeDrop: () => gate } })
  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-drop-pending]')).not.toBeNull(),
  )
  expect(shape(screen)).toBe('a,folder(f1,f2),z')

  decide(true)
  await vi.waitFor(() => expect(shape(screen)).toBe('folder(f1,f2),a,z'))
})

test('a rejecting beforeDrop reverts and reports instead of throwing', async () => {
  const screen = render(TreeReorderFixture, {
    props: { beforeDrop: () => Promise.reject(new Error('server said no')) },
  })
  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-testid="drop-errors"]')!.textContent).toContain(
      'server said no',
    ),
  )
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
})

test('dropping a folder into its own descendant is refused', async () => {
  const seen: SortableDropDetails[] = []
  const screen = render(TreeReorderFixture, {
    props: {
      canDrop: (d: SortableDropDetails) => {
        seen.push(d)
        return true
      },
    },
  })
  // Grab the folder and try to walk it down into its own children.
  rowFor(screen, 'folder').focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown} ')
  await vi.waitFor(() => expect(shape(screen)).not.toBe(''))
  // Whatever the engine resolved, the folder must still contain its children
  // and must not have been nested inside them.
  expect(shape(screen)).toContain('f1')
  expect(shape(screen)).toContain('f2')
  expect(shape(screen)).not.toContain('f1(folder')
  expect(shape(screen)).not.toContain('f2(folder')
})

test('sticky pinning is suspended while a drag is in flight', async () => {
  const screen = render(TreeReorderFixture)
  rowFor(screen, 'a').focus()
  await userEvent.keyboard(' ')
  expect(screen.container.querySelector('[data-reordering]')).not.toBeNull()
  await userEvent.keyboard('{Escape}')
  expect(screen.container.querySelector('[data-reordering]')).toBeNull()
})

test('a pointer drag lifts the row out into a floating preview, leaving a hole', async () => {
  const screen = render(TreeReorderFixture)
  const row = rowFor(screen, 'a')
  const box = row.getBoundingClientRect()

  row.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 1,
      button: 0,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 1,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2 + 40,
    }),
  )

  const preview = document.querySelector<HTMLElement>('[data-sortable-preview]')
  expect(preview).not.toBeNull()
  // Carried, not slid: fixed, inert to the pointer, and out of the tree.
  expect(getComputedStyle(preview!).position).toBe('fixed')
  expect(getComputedStyle(preview!).pointerEvents).toBe('none')
  expect(preview!.parentElement).toBe(document.body)
  // The row it left behind is a hole, not a second visible copy.
  expect(getComputedStyle(row).opacity).toBe('0')

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
})

test('previewMode "element" moves the real row itself instead of a floating clone', async () => {
  const screen = render(TreeReorderFixture, { props: { previewMode: 'element' } })
  const row = rowFor(screen, 'a')
  const box = row.getBoundingClientRect()

  row.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 4,
      button: 0,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 4,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2 + 40,
    }),
  )

  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  expect(getComputedStyle(row).position).toBe('fixed')

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 4 }))
  await vi.waitFor(() => expect(getComputedStyle(row).position).not.toBe('fixed'))
})

test('Escape aborts a pointer drag, not just a keyboard one', async () => {
  const screen = render(TreeReorderFixture)
  const row = rowFor(screen, 'a')
  const box = row.getBoundingClientRect()
  row.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 3,
      button: 0,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 3,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2 + 50,
    }),
  )
  expect(document.querySelector('[data-sortable-preview]')).not.toBeNull()

  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
})

test('reorderSiblings=false: hovering a non-nestable row shows no indicator and blocks the drop', async () => {
  const screen = render(TreeReorderFixture, { props: { reorderSiblings: false } })
  const aRow = rowFor(screen, 'a')
  const zRow = rowFor(screen, 'z')
  const aBox = aRow.getBoundingClientRect()
  const zBox = zRow.getBoundingClientRect()

  aRow.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 6,
      button: 0,
      clientX: aBox.left + 10,
      clientY: aBox.top + aBox.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 6,
      clientX: zBox.left + 10,
      clientY: zBox.top + zBox.height / 2,
    }),
  )
  await vi.waitFor(() =>
    expect(screen.container.querySelector('[data-invalid-drop]')).not.toBeNull(),
  )
  expect(zRow.hasAttribute('data-drop-into')).toBe(false)
  expect(zRow.hasAttribute('data-drop-edge')).toBe(false)

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 6 }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
})

test('reorderSiblings=false: dragging past the last row does not reorder', async () => {
  const screen = render(TreeReorderFixture, { props: { reorderSiblings: false } })
  const aRow = rowFor(screen, 'a')
  const zRow = rowFor(screen, 'z')
  const aBox = aRow.getBoundingClientRect()
  const zBox = zRow.getBoundingClientRect()

  aRow.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 9,
      button: 0,
      clientX: aBox.left + 10,
      clientY: aBox.top + aBox.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 9,
      clientX: zBox.left + 10,
      clientY: zBox.bottom + 40,
    }),
  )
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).not.toBeNull())
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 9 }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(shape(screen)).toBe('a,folder(f1,f2),z')
})

test('reorderSiblings=false: hovering a folder always resolves inside', async () => {
  const screen = render(TreeReorderFixture, { props: { reorderSiblings: false } })
  const aRow = rowFor(screen, 'a')
  const folderRow = rowFor(screen, 'folder')
  const aBox = aRow.getBoundingClientRect()
  const folderBox = folderRow.getBoundingClientRect()

  aRow.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 7,
      button: 0,
      clientX: aBox.left + 10,
      clientY: aBox.top + aBox.height / 2,
    }),
  )
  // Right at the top edge, which would normally resolve to 'before' — with
  // sibling reorder off there's no edge mode left to detect.
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 7,
      clientX: folderBox.left + 10,
      clientY: folderBox.top + 2,
    }),
  )
  await vi.waitFor(() => expect(folderRow.hasAttribute('data-drop-into')).toBe(true))
  expect(folderRow.hasAttribute('data-drop-edge')).toBe(false)

  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 7,
      clientX: folderBox.left + 10,
      clientY: folderBox.top + folderBox.height / 2,
    }),
  )
  await vi.waitFor(() => expect(folderRow.hasAttribute('data-drop-into')).toBe(true))

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 }))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
})

test('reorderSiblings=false: keyboard Up/Down no-ops at the same depth, Left/Right still reparents', async () => {
  const screen = render(TreeReorderFixture, { props: { reorderSiblings: false } })
  rowFor(screen, 'z').focus()
  await userEvent.keyboard(' {ArrowUp}')
  expect(shape(screen)).toBe('a,folder(f1,f2),z')

  await userEvent.keyboard('{ArrowRight} ')
  await vi.waitFor(() => expect(shape(screen)).not.toBe('a,folder(f1,f2),z'))
  expect(shape(screen)).toContain('folder(')
})

test('dragging a folder hides its whole subtree, not just its own row', async () => {
  const screen = render(TreeReorderFixture)
  // Expand so the children are rendered.
  rowFor(screen, 'folder').focus()
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(rowFor(screen, 'f1')).not.toBeNull())

  const box = rowFor(screen, 'folder').getBoundingClientRect()
  rowFor(screen, 'folder').dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId: 4,
      button: 0,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: 4,
      clientX: box.left + 10,
      clientY: box.top + box.height / 2 + 40,
    }),
  )
  // Children travel with the folder — left visible they'd sit in the same
  // space the shifting rows pass through and read as overlapping text.
  await vi.waitFor(() => {
    for (const value of ['folder', 'f1', 'f2']) {
      expect(rowFor(screen, value).hasAttribute('data-dragging')).toBe(true)
    }
  })
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
})
