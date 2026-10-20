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
