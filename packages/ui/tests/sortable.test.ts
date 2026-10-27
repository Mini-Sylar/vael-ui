import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { ref } from 'vue'
import type { RenderResult } from 'vitest-browser-vue'
import SortableFixture from './fixtures/SortableFixture.vue'
import Sortable from '../src/components/Sortable/Sortable.vue'
import type { SortableDropDetails } from '../src/composables/useSortable'

function handles(screen: RenderResult<unknown>): HTMLButtonElement[] {
  return Array.from(screen.container.querySelectorAll<HTMLButtonElement>('.ui-sortable-handle'))
}
function order(screen: RenderResult<unknown>): string {
  return screen.container.querySelector('[data-testid="order"]')!.textContent!
}
function liveRegion(screen: RenderResult<unknown>): HTMLElement {
  return screen.container.querySelector<HTMLElement>('[aria-live="assertive"]')!
}

test('renders one row per item, each with a real button handle in the tab order', async () => {
  const screen = await render(SortableFixture)
  const grips = handles(screen)
  expect(grips.length).toBe(3)
  // A real <button> is focusable without an explicit tabindex.
  expect(grips[0]!.tagName).toBe('BUTTON')
  expect(grips[0]!.getAttribute('aria-roledescription')).toBe('sortable item')
})

test('the live region and instructions are mounted up front, not created on demand', async () => {
  const screen = await render(SortableFixture)
  const live = liveRegion(screen)
  expect(live).not.toBeNull()
  expect(live.textContent).toBe('')
  const describedBy = handles(screen)[0]!.getAttribute('aria-describedby')!
  const instructions = screen.container.querySelector(`#${CSS.escape(describedBy)}`)!
  expect(instructions.textContent).toContain('Space')
})

test('keyboard: Space grabs, ArrowDown moves, Space drops — and the array reorders', async () => {
  const screen = await render(SortableFixture)
  expect(order(screen)).toBe('a,b,c')

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(liveRegion(screen).textContent).toContain('Grabbed Alpha')

  await userEvent.keyboard('{ArrowDown}')
  await userEvent.keyboard(' ')
  expect(order(screen)).toBe('b,a,c')
})

test('keyboard: two ArrowDowns move an item two slots', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('b,c,a')
})

test('keyboard: ArrowUp moves an item toward the top', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[2]!.focus()
  await userEvent.keyboard(' {ArrowUp} ')
  expect(order(screen)).toBe('a,c,b')
})

test('keyboard: Escape cancels and leaves the original order untouched', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  await userEvent.keyboard('{Escape}')
  expect(order(screen)).toBe('a,b,c')
  expect(liveRegion(screen).textContent).toContain('cancelled')
})

test('keyboard: moving cannot walk past either end of the list', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowUp}{ArrowUp}{ArrowUp} ')
  expect(order(screen)).toBe('a,b,c')

  handles(screen)[2]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('the grabbed row is marked for styling, and unmarked once dropped', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(screen.container.querySelector('[data-grabbed]')).not.toBeNull()
  await userEvent.keyboard(' ')
  expect(screen.container.querySelector('[data-grabbed]')).toBeNull()
})

test('announcements report the new position rather than repeating the grab', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  const text = liveRegion(screen).textContent!
  expect(text).toContain('Alpha')
  expect(text).toContain('2')
})

test('disabled ignores keyboard grabs entirely', async () => {
  const screen = await render(SortableFixture, { props: { disabled: true } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('keyboard: the grabbed row itself visibly moves, not just the rows around it', async () => {
  // Regression: the engine used to shift only the OTHER rows on a keyboard
  // move, so the item you grabbed was the one thing on screen that never
  // appeared to move — the list read as reshuffling underneath it.
  const screen = await render(SortableFixture)
  const rowFor = (value: string) =>
    screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' ')
  expect(rowFor('a').style.translate).toBe('')

  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() => {
    // Grabbed row travels down; the row it displaces travels up.
    expect(rowFor('a').style.translate).not.toBe('')
    expect(rowFor('b').style.translate).not.toBe('')
  })
  // `translate` is "<x> <y>" — take the y component, not a digit-strip of
  // the whole string, which silently fuses "0 -40px" into "0-40".
  const yOf = (el: HTMLElement) => Number.parseFloat(el.style.translate.split(' ')[1] ?? '0')
  const grabbed = yOf(rowFor('a'))
  const displaced = yOf(rowFor('b'))
  expect(grabbed).toBeGreaterThan(0)
  expect(displaced).toBeLessThan(0)
})

test('keyboard: dropping clears every inline transform it applied', async () => {
  const screen = await render(SortableFixture)
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => {
    const leftover = Array.from(
      screen.container.querySelectorAll<HTMLElement>('[data-sortable-item]'),
    ).filter((el) => el.style.translate !== '')
    expect(leftover).toHaveLength(0)
  })
})

test('axis="x": ArrowRight/ArrowLeft reorder along the horizontal axis', async () => {
  const screen = await render(SortableFixture, { props: { axis: 'x' } })
  expect(order(screen)).toBe('a,b,c')
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight} ')
  expect(order(screen)).toBe('b,a,c')

  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight} ')
  expect(order(screen)).toBe('a,b,c')
})

test('axis="x": the vertical arrows do nothing, so page scroll keys stay free', async () => {
  const screen = await render(SortableFixture, { props: { axis: 'x' } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}{ArrowDown} ')
  expect(order(screen)).toBe('a,b,c')
})

test('axis="x": the grabbed item translates horizontally, not vertically', async () => {
  const screen = await render(SortableFixture, { props: { axis: 'x' } })
  const rowFor = (value: string) =>
    screen.container.querySelector<HTMLElement>(`[data-sortable-item][data-value="${value}"]`)!
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowRight}')
  await vi.waitFor(() => expect(rowFor('a').style.translate).not.toBe(''))
  const [x, y] = rowFor('a').style.translate.split(' ')
  expect(Number.parseFloat(x!)).toBeGreaterThan(0)
  expect(y === undefined || Number.parseFloat(y) === 0).toBe(true)
})

// ---------------------------------------------------------------------------
// canDrop / beforeDrop — structural veto and async gate
// ---------------------------------------------------------------------------

test('canDrop=false blocks the reorder and marks the target rejected', async () => {
  const screen = await render(SortableFixture, { props: { canDrop: () => false } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown}')
  expect(screen.container.querySelector('[data-invalid-drop]')).not.toBeNull()
  await userEvent.keyboard(' ')
  expect(order(screen)).toBe('a,b,c')
})

test('canDrop receives the real from/to positions', async () => {
  const seen: SortableDropDetails[] = []
  const screen = await render(SortableFixture, {
    props: {
      canDrop: (d: SortableDropDetails) => {
        seen.push(d)
        return true
      },
    },
  })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  expect(order(screen)).toBe('b,a,c')
  const last = seen.at(-1)!
  expect(last.value).toBe('a')
  expect(last.from.index).toBe(0)
  expect(last.to.index).toBe(1)
})

test('canDrop can allow some targets and refuse others', async () => {
  // Only ever allow landing in slot 1.
  const screen = await render(SortableFixture, {
    props: { canDrop: (d: SortableDropDetails) => d.to.index === 1 },
  })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  expect(order(screen)).toBe('b,a,c')
})

test.each([
  [false, 'a,b,c'],
  [true, 'b,a,c'],
])('beforeDrop returning %s gives order %s', async (result, expected) => {
  const screen = await render(SortableFixture, { props: { beforeDrop: () => result } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => expect(order(screen)).toBe(expected))
})

test.each([
  [true, 'b,a,c'],
  [false, 'a,b,c'],
])(
  'an async beforeDrop holds the drop pending, then resolving %s gives order %s',
  async (decision, expected) => {
    let decide!: (value: boolean) => void
    const gate = new Promise<boolean>((resolve) => {
      decide = resolve
    })
    const screen = await render(SortableFixture, { props: { beforeDrop: () => gate } })
    handles(screen)[0]!.focus()
    await userEvent.keyboard(' {ArrowDown} ')

    // Still awaiting the consumer's dialog: nothing has moved yet.
    await vi.waitFor(() => expect(screen.container.querySelector('[data-pending]')).not.toBeNull())
    expect(order(screen)).toBe('a,b,c')

    decide(decision)
    await vi.waitFor(() => expect(screen.container.querySelector('[data-pending]')).toBeNull())
    expect(order(screen)).toBe(expected)
  },
)

test('a cancelled drop clears every inline transform it applied', async () => {
  const screen = await render(SortableFixture, { props: { beforeDrop: () => false } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')
  await vi.waitFor(() => {
    const leftover = Array.from(
      screen.container.querySelectorAll<HTMLElement>('[data-sortable-item]'),
    ).filter((el) => el.style.translate !== '')
    expect(leftover).toHaveLength(0)
  })
})

test.each([
  [
    'rejecting (a failed API call)',
    () => Promise.reject(new Error('network down')),
    'network down',
  ],
  [
    'synchronously throwing',
    () => {
      throw new Error('validation blew up')
    },
    'validation blew up',
  ],
])('a %s beforeDrop reverts and reports, never throws', async (_, beforeDrop, message) => {
  const screen = await render(SortableFixture, { props: { beforeDrop } })
  handles(screen)[0]!.focus()
  await userEvent.keyboard(' {ArrowDown} ')

  await vi.waitFor(() => {
    expect(screen.container.querySelector('[data-testid="drop-errors"]')!.textContent).toContain(
      message,
    )
  })
  // Reverted, not half-applied, and not left stuck pending.
  expect(order(screen)).toBe('a,b,c')
  expect(screen.container.querySelector('[data-pending]')).toBeNull()
})

test('the list holds only list items; the live region and instructions sit beside it', async () => {
  const screen = await render(SortableFixture)
  const list = screen.container.querySelector('.ui-sortable-list')!
  expect([...list.children].every((child) => child.tagName === 'LI')).toBe(true)
  expect(list.contains(liveRegion(screen))).toBe(false)
  expect(screen.container.querySelector('.ui-sortable')!.contains(liveRegion(screen))).toBe(true)
})

test('a pointer drag released over its own slot springs home instead of snapping', async () => {
  const screen = await render(SortableFixture)
  const handle = handles(screen)[0]!
  const item = handle.closest<HTMLElement>('.ui-sortable-item')!
  const box = handle.getBoundingClientRect()
  const pointerId = 41
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 8,
      clientY: box.top + 8,
    }),
  )
  for (const dy of [6, 12, 18, 22]) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 8,
        clientY: box.top + 8 + dy,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  expect(item.style.translate).toBe('0px 22px')
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  // Still on its way: a snap would have cleared it on release.
  const mid = parseFloat(item.style.translate.split(' ')[1] ?? '0')
  expect(mid).toBeGreaterThan(0)
  expect(mid).toBeLessThan(22)
  await vi.waitFor(() => expect(item.style.translate).toBe(''))
  expect(order(screen)).toBe('a,b,c')
})

test('the root is one styled box: your class lands on it and the rows lay out as its children', async () => {
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items: [{ value: 'a', label: 'Alpha' }] }),
    template: `<Sortable v-model:items="items" class="mine" />`,
  })
  const root = screen.container.querySelector<HTMLElement>('.ui-sortable')!
  expect(root.classList.contains('mine')).toBe(true)
  expect(getComputedStyle(root).display).toBe('flex')
  expect(getComputedStyle(root.querySelector('.ui-sortable-list')!).display).toBe('contents')
  expect(root.querySelector('.ui-sortable-list > .ui-sortable-item')).not.toBeNull()
})

test('a row grabbed near its top opens the next slot once its own centre passes the next row, before the pointer does', async () => {
  const screen = await render(SortableFixture)
  const handle = handles(screen)[0]!
  const row = handle.closest<HTMLElement>('.ui-sortable-item')!
  const next = handles(screen)[1]!.closest<HTMLElement>('.ui-sortable-item')!
  const rowBox = row.getBoundingClientRect()
  const handleBox = handle.getBoundingClientRect()
  const nextBox = next.getBoundingClientRect()
  const grabY = handleBox.top + 1
  // The pointer stops short of the next row's midpoint; the row's centre is past it.
  const centreLead = rowBox.height / 2 - (grabY - rowBox.top)
  expect(centreLead).toBeGreaterThan(4)
  const pointerId = 51
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: handleBox.left + 4,
      clientY: grabY,
    }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId,
      clientX: handleBox.left + 4,
      clientY: nextBox.top + nextBox.height / 2 - centreLead / 2,
    }),
  )
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await vi.waitFor(() => expect(order(screen)).toBe('b,a,c'))
})

test('a list that re-sorts right after a drop glides its rows to the new order instead of jumping', async () => {
  const screen = await render({
    components: { Sortable },
    setup() {
      const items = ref([
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Bravo' },
        { value: 'c', label: 'Charlie' },
      ])
      // Like a store that orders a column its own way: whatever was dropped, Alpha leads again.
      const resort = () => {
        items.value = [...items.value].sort((x, y) => x.value.localeCompare(y.value))
      }
      return { items, resort }
    },
    template: `<Sortable v-model:items="items" @reorder="resort" />`,
  })
  const handle = handles(screen)[0]!
  const alpha = handle.closest<HTMLElement>('.ui-sortable-item')!
  const bravo = handles(screen)[1]!.closest<HTMLElement>('.ui-sortable-item')!
  const box = handle.getBoundingClientRect()
  const bravoBox = bravo.getBoundingClientRect()
  const restTop = alpha.getBoundingClientRect().top
  const pointerId = 61
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  const travel = bravoBox.bottom + 4 - (box.top + 4)
  for (let step = 1; step <= 6; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4,
        clientY: box.top + 4 + (travel * step) / 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  const droppedTop = alpha.getBoundingClientRect().top
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  // The resort runs on the reorder event, so Alpha is laid out first again at once. On screen it
  // must travel there from where it was dropped: no frame may jump it more than a fraction of
  // the way, and Bravo, pushed back down, moves the same way.
  const domOrder = () =>
    [...screen.container.querySelectorAll<HTMLElement>('.ui-sortable-item')]
      .map((el) => el.dataset.value)
      .join(',')
  let last = droppedTop
  let biggestStep = 0
  let frames = 0
  await vi.waitFor(() => expect(domOrder()).toBe('a,b,c'))
  while (frames++ < 90) {
    await new Promise((r) => requestAnimationFrame(r))
    const top = alpha.getBoundingClientRect().top
    biggestStep = Math.max(biggestStep, Math.abs(top - last))
    last = top
    if (alpha.style.translate === '' && bravo.style.translate === '') break
  }
  expect(biggestStep).toBeLessThan((droppedTop - restTop) / 2)
  expect(Math.round(alpha.getBoundingClientRect().top)).toBe(Math.round(restTop))
  expect(Math.round(bravo.getBoundingClientRect().top)).toBe(Math.round(bravoBox.top))
})

test('isSettling and data-settling hold from the drop until every row has glided into place', async () => {
  const screen = await render(SortableFixture)
  const root = screen.container.querySelector<HTMLElement>('.ui-sortable')!
  const handle = handles(screen)[0]!
  const box = handle.getBoundingClientRect()
  const pointerId = 81
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 4,
      clientY: box.top + 4,
    }),
  )
  for (let step = 1; step <= 5; step++) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 4,
        clientY: box.top + 4 + step * 6,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  expect(root.hasAttribute('data-settling')).toBe(false)
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  expect(root.hasAttribute('data-settling')).toBe(true)
  await vi.waitFor(() => expect(root.hasAttribute('data-settling')).toBe(false))
  expect(handle.closest<HTMLElement>('.ui-sortable-item')!.style.translate).toBe('')
})

test('the dragged row stays on top of the rows moving out of its way, during the drag and the landing', async () => {
  const screen = await render(SortableFixture)
  const handle = handles(screen)[0]!
  const items = [...screen.container.querySelectorAll<HTMLElement>('.ui-sortable-item')]
  const [dragged, next] = items as [HTMLElement, HTMLElement]
  const box = handle.getBoundingClientRect()
  const step = next.getBoundingClientRect().top - dragged.getBoundingClientRect().top
  const pointerId = 42
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: box.left + 8,
      clientY: box.top + 8,
    }),
  )
  // Far enough that the next row starts sliding up under the dragged one.
  for (const fraction of [0.2, 0.4, 0.6, 0.7]) {
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerId,
        clientX: box.left + 8,
        clientY: box.top + 8 + step * fraction,
      }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  // Mid-glide, where the two overlap.
  const topmostAtOverlap = () => {
    const a = dragged.getBoundingClientRect()
    const b = next.getBoundingClientRect()
    const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
    return document.elementFromPoint(a.left + a.width / 2, y)?.closest('.ui-sortable-item')
  }
  expect(next.style.zIndex).toBe('')
  expect(topmostAtOverlap()).toBe(dragged)

  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  const landing = [...screen.container.querySelectorAll<HTMLElement>('.ui-sortable-item')]
  const landed = landing.find((el) => el.textContent?.includes(dragged.textContent ?? '~'))!
  const others = landing.filter((el) => el !== landed)
  // The landing row is raised; the rows settling around it are not.
  expect(landed.style.zIndex).toBe('1')
  expect(others.every((el) => el.style.zIndex === '')).toBe(true)
})

// Drags the first row's handle down by `dy` in small steps, leaving the pointer held.
async function dragFirstRow(container: HTMLElement, dy: number, pointerId: number) {
  const handle = container.querySelector<HTMLElement>('.ui-sortable-handle')!
  const box = handle.getBoundingClientRect()
  const x = box.left + 8
  const y = box.top + 8
  handle.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      pointerId,
      button: 0,
      clientX: x,
      clientY: y,
    }),
  )
  for (let moved = 6; moved <= dy; moved += 6) {
    window.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId, clientX: x, clientY: y + moved }),
    )
    await new Promise((r) => requestAnimationFrame(r))
  }
  return () => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId }))
}

const sixRows = () =>
  ['a', 'b', 'c', 'd', 'e', 'f'].map((value) => ({ value, label: value.toUpperCase() }))

test('preview-mode="clone" floats a copy from the start of the drag, and the order still lands', async () => {
  const items = ref(sixRows())
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items }),
    template: `<Sortable v-model:items="items" preview-mode="clone" />`,
  })
  const source = screen.container.querySelector<HTMLElement>('.ui-sortable-item')!
  const release = await dragFirstRow(screen.container, 72, 61)
  const copy = document.querySelector<HTMLElement>('body > [data-sortable-preview]')
  expect(copy).not.toBeNull()
  expect(copy!.textContent).toContain('A')
  expect(getComputedStyle(copy!).position).toBe('fixed')
  expect(getComputedStyle(source).visibility).toBe('hidden')
  release()
  await vi.waitFor(() => expect(items.value.map((i) => i.value).join('')).not.toBe('abcdef'))
  expect(items.value[0]!.value).toBe('b')
  // The copy flies into the new slot, above everything, while the real row waits hidden there.
  await new Promise((r) => requestAnimationFrame(r))
  expect(document.querySelector('body > [data-sortable-preview]')).not.toBeNull()
  expect(getComputedStyle(source).visibility).toBe('hidden')
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(getComputedStyle(source).visibility).toBe('visible')
  expect(source.hasAttribute('data-sortable-source')).toBe(false)
  // It landed exactly on the row's slot, so showing the row moves nothing.
  expect(source.style.translate).toBe('')
})

test('a list that scrolls moves the real row too, with no copy unless preview-mode asks for one', async () => {
  const items = ref(sixRows())
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items }),
    template: `<Sortable v-model:items="items" style="max-block-size: 7rem; overflow-y: auto" />`,
  })
  const source = screen.container.querySelector<HTMLElement>('.ui-sortable-item')!
  const release = await dragFirstRow(screen.container, 30, 62)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  expect(source.style.translate).not.toBe('')
  release()
  await vi.waitFor(() => expect(source.style.translate).toBe(''))
})

test("a row held at the end of a scrolling list: autoscroll stops at the last row, and the drop doesn't jump", async () => {
  const items = ref(sixRows())
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items }),
    template: `<Sortable v-model:items="items" style="max-block-size: 7rem; overflow-y: auto" />`,
  })
  const list = screen.container.querySelector<HTMLElement>('.ui-sortable')!
  // A drop moves rows in the DOM; scroll anchoring would answer by scrolling the list away.
  expect(getComputedStyle(list).overflowAnchor).toBe('none')
  const end = list.scrollHeight - list.clientHeight
  const handle = list.querySelector<HTMLElement>('.ui-sortable-handle')!
  const release = await dragFirstRow(
    screen.container,
    list.getBoundingClientRect().bottom - 4 - (handle.getBoundingClientRect().top + 8),
    65,
  )
  // Parked on the bottom edge. The row still follows the pointer, which makes the list taller
  // than its rows, but autoscroll stops at the last row.
  let furthest = 0
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => requestAnimationFrame(r))
    furthest = Math.max(furthest, list.scrollTop)
  }
  expect(furthest).toBeLessThanOrEqual(end + 0.5)
  expect(list.scrollTop).toBeCloseTo(end, 0)
  release()
  for (let i = 0; i < 3; i++) await new Promise((r) => requestAnimationFrame(r))
  expect(list.scrollTop).toBeCloseTo(end, 0)
})

for (const restrict of [true, false]) {
  test(`a floating row ${restrict ? 'stays inside' : 'can leave'} its list past the end with restrict-to-list ${restrict}`, async () => {
    const items = ref(sixRows())
    const screen = await render({
      components: { Sortable },
      setup: () => ({ items, restrict }),
      template: `<Sortable v-model:items="items" preview-mode="clone" :restrict-to-list="restrict" />`,
    })
    const list = screen.container.querySelector<HTMLElement>('.ui-sortable')!
    const handle = list.querySelector<HTMLElement>('.ui-sortable-handle')!
    const below =
      list.getBoundingClientRect().bottom + 60 - (handle.getBoundingClientRect().top + 8)
    const release = await dragFirstRow(screen.container, below, restrict ? 66 : 67)
    const copy = document.querySelector<HTMLElement>('body > [data-sortable-preview]')!
    const bottom = list.getBoundingClientRect().bottom
    if (restrict) expect(copy.getBoundingClientRect().bottom).toBeLessThanOrEqual(bottom + 0.5)
    else expect(copy.getBoundingClientRect().bottom).toBeGreaterThan(bottom + 20)
    release()
    await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  })
}

test('a list that does not scroll still moves the real row, with no copy', async () => {
  const screen = await render(SortableFixture)
  const source = screen.container.querySelector<HTMLElement>('.ui-sortable-item')!
  const release = await dragFirstRow(screen.container, 18, 63)
  expect(document.querySelector('[data-sortable-preview]')).toBeNull()
  expect(source.style.translate).not.toBe('')
  release()
  await vi.waitFor(() => expect(source.style.translate).toBe(''))
})

test('a landing copy follows its row when the list re-sorts mid-landing, and never shows twice', async () => {
  const items = ref(sixRows())
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items }),
    template: `<Sortable v-model:items="items" preview-mode="clone" />`,
  })
  const release = await dragFirstRow(screen.container, 72, 64)
  release()
  await vi.waitFor(() => expect(items.value[0]!.value).toBe('b'))
  await new Promise((r) => requestAnimationFrame(r))
  // A refetch that orders the column its own way: 'a' moves to the end while it's landing.
  items.value = [
    ...items.value.filter((i) => i.value !== 'a'),
    items.value.find((i) => i.value === 'a')!,
  ]
  const rowA = () => screen.container.querySelector<HTMLElement>('[data-value="a"]')!
  let shownWhileLanding = 0
  let copyOffSlot = 0
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => requestAnimationFrame(r))
    const copy = document.querySelector<HTMLElement>('body > [data-sortable-preview]')
    if (!copy) break
    if (getComputedStyle(rowA()).visibility !== 'hidden') shownWhileLanding++
    const c = copy.getBoundingClientRect()
    const r = rowA().getBoundingClientRect()
    if (Math.abs(c.top - r.top) > 1 || Math.abs(c.left - r.left) > 1) copyOffSlot++
  }
  expect(shownWhileLanding).toBe(0)
  expect(copyOffSlot).toBe(0)
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  expect(getComputedStyle(rowA()).visibility).toBe('visible')
  await vi.waitFor(() => expect(rowA().style.translate).toBe(''))
})

test('with a copy, the original is the placeholder: it moves to the drop slot, and fades out under the landing copy', async () => {
  const items = ref(sixRows())
  const screen = await render({
    components: { Sortable },
    setup: () => ({ items }),
    template: `<Sortable v-model:items="items" preview-mode="clone" />`,
  })
  const rows = () => [...screen.container.querySelectorAll<HTMLElement>('.ui-sortable-item')]
  const source = rows()[0]!
  const release = await dragFirstRow(screen.container, 72, 65)
  // Let the springs settle where the drop would land.
  await new Promise((r) => setTimeout(r, 450))
  expect(source.hasAttribute('data-sortable-source')).toBe(true)
  const placeholder = source.getBoundingClientRect()
  // It left its own slot, and no other row sits on top of it.
  expect(source.style.translate).not.toBe('')
  for (const row of rows().slice(1)) {
    const r = row.getBoundingClientRect()
    const overlap = Math.min(r.bottom, placeholder.bottom) - Math.max(r.top, placeholder.top)
    expect(overlap).toBeLessThan(1)
  }
  release()
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => requestAnimationFrame(r))
  // Landing: the placeholder fades out under the copy instead of vanishing.
  expect(source.hasAttribute('data-sortable-source')).toBe(true)
  expect(source.hasAttribute('data-sortable-landing')).toBe(true)
  const fading = Number(getComputedStyle(source).opacity)
  expect(fading).toBeGreaterThan(0)
  expect(fading).toBeLessThan(1)
  await vi.waitFor(() => expect(Number(getComputedStyle(source).opacity)).toBe(0))
  await vi.waitFor(() => expect(document.querySelector('[data-sortable-preview]')).toBeNull())
  // Down: the real row, plain.
  expect(source.hasAttribute('data-sortable-landing')).toBe(false)
  expect(source.hasAttribute('data-sortable-source')).toBe(false)
  expect(getComputedStyle(source).opacity).toBe('1')
  // It landed where the placeholder showed it would.
  expect(Math.abs(source.getBoundingClientRect().top - placeholder.top)).toBeLessThan(1)
})
