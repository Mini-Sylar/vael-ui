import '../src/style.css'
import { page } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, ref } from 'vue'
import { toast, useToastQueue } from '../src/composables/useToast'
import ToasterFixture from './fixtures/ToasterFixture.vue'
import ToasterCustomCardFixture from './fixtures/ToasterCustomCardFixture.vue'
import Toaster from '../src/components/Toaster/Toaster.vue'

const { dismiss, toasts } = useToastQueue()

// The toast queue is module-level (by design — toast() must be callable from
// anywhere, not scoped to a component instance), so it persists across tests
// in this file regardless of component mount/unmount. Force a clean slate
// before every test rather than only relying on each test's own cleanup.
beforeEach(async () => {
  toast.dismiss()
  document.querySelectorAll('.ui-toaster').forEach((el) => el.remove())
  // Playwright drives a real OS-level cursor, and .click() in an earlier
  // test leaves it sitting wherever it last clicked — e.g. the Dismiss
  // button, which is inside the toaster's default bottom-right corner. Since
  // every test in this file mounts a fresh <Toaster> in that same screen
  // position, a leftover cursor there fires a genuine native pointerenter on
  // mount, independent of anything the test itself dispatches. Move the real
  // cursor to a neutral corner before every test so mount never starts
  // "already hovered".
  await page.elementLocator(document.body).hover({ position: { x: 5, y: 5 } })
})

test('ui prop overrides root/toast/title classes, same convention as every other component', async () => {
  const screen = await render(Toaster, {
    props: {
      ui: {
        root: 'custom-root',
        toast: 'custom-toast',
        title: 'custom-title',
      },
    },
  })
  toast('Hello')
  await expect.element(page.getByText('Hello')).toBeVisible()

  const toaster = document.querySelector('.ui-toaster')!
  expect(toaster.classList.contains('custom-root')).toBe(true)
  const card = document.querySelector('.ui-toast')!
  expect(card.classList.contains('custom-toast')).toBe(true)
  const title = document.querySelector('.ui-toast-title')!
  expect(title.classList.contains('custom-title')).toBe(true)

  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('renders a live region and one card per toast, dismiss button removes it', async () => {
  const screen = await render(ToasterFixture)
  toast('Hello', { description: 'World' })

  const region = page.getByRole('region', { name: 'Notifications' })
  await expect.element(region).toHaveAttribute('aria-live', 'polite')
  await expect.element(page.getByText('Hello')).toBeVisible()
  await expect.element(page.getByText('World')).toBeVisible()

  await page.getByRole('button', { name: 'Dismiss' }).click()
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull())
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('hovering the stack pauses auto-dismiss; leaving resumes with remaining time', async () => {
  const screen = await render(ToasterFixture)
  const id = toast('Pausable', { duration: 150 })

  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  const toaster = document.querySelector('.ui-toaster')!
  toaster.dispatchEvent(new PointerEvent('pointerenter'))

  // Past the 150ms duration — still queued because paused (a fired timer dequeues at once).
  await new Promise((r) => setTimeout(r, 200))
  expect(toasts.some((t) => t.id === id)).toBe(true)

  toaster.dispatchEvent(new PointerEvent('pointerleave'))
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  dismiss(id)
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('hovering the stack expands it: cards go full-opacity with real gapped offsets', async () => {
  const screen = await render(ToasterFixture)
  toast('First', { duration: 10000 })
  toast('Second', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))

  const allToasters = document.querySelectorAll('.ui-toaster')
  if (allToasters.length !== 1) {
    throw new Error(`expected exactly 1 .ui-toaster, found ${allToasters.length}`)
  }
  const toaster = allToasters[0]
  expect(toaster.getAttribute('data-expanded')).toBe('false')

  toaster.dispatchEvent(new PointerEvent('pointerenter'))
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('true'))
  await vi.waitFor(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.ui-toast')]
    return expect(cards.every((el) => Number(getComputedStyle(el).opacity) === 1)).toBe(true)
  })

  toaster.dispatchEvent(new PointerEvent('pointerleave'))
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('false'))
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('backgrounding the tab pauses every toast; foregrounding resumes them', async () => {
  const screen = await render(ToasterFixture)
  toast('Backgrounded', { duration: 150 })

  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))

  await new Promise((r) => setTimeout(r, 200))
  expect(toasts).toHaveLength(1)

  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))

  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

/** Dispatches a drag with REALISTIC timing — a synchronous down/move/up burst
 *  has ~0ms elapsed, which makes velocity artificially huge regardless of
 *  distance and always trips the velocity-based commit threshold. */
async function drag(el: Element, dx: number, dy: number, ms = 100) {
  const pointerId = 1
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: 0, clientY: 0, pointerId, bubbles: true }),
  )
  await new Promise((r) => setTimeout(r, ms))
  el.dispatchEvent(
    new PointerEvent('pointermove', { clientX: dx, clientY: dy, pointerId, bubbles: true }),
  )
  el.dispatchEvent(
    new PointerEvent('pointerup', { clientX: dx, clientY: dy, pointerId, bubbles: true }),
  )
}

test('swiping past the threshold commits and dismisses the toast', async () => {
  const screen = await render(ToasterFixture) // default position: bottom-right -> allowed directions include right/left/down
  toast('Swipe me', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())

  const card = document.querySelector<HTMLElement>('.ui-toast')!
  await drag(card, 80, 0) // 80px right over 100ms — past SWIPE_THRESHOLD (45px), realistic velocity

  await vi.waitFor(() => expect(card.getAttribute('data-swipe-out')).toBe('true'))
  expect(card.getAttribute('data-swipe-direction')).toBe('right')
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('a small, slow swipe below both the distance and velocity threshold snaps back', async () => {
  const screen = await render(ToasterFixture)
  toast('Stay put', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())

  const card = document.querySelector<HTMLElement>('.ui-toast')!
  // 10px over 300ms: distance well under 45px, velocity (~0.033px/ms) well under 0.11
  await drag(card, 10, 0, 300)

  expect(card.getAttribute('data-swipe-out')).toBe('false')
  expect(document.querySelector('.ui-toast')).not.toBeNull()
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('stacked (non-front) cards get reduced opacity and a real pixel offset behind the front one', async () => {
  const screen = await render(ToasterFixture)
  toast('First', { duration: 10000 })
  toast('Second', { duration: 10000 })

  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  // Height measurement runs via ResizeObserver, which delivers its first
  // callback asynchronously; wait for the real offset (not the
  // pre-measurement fallback) to apply.
  await vi.waitFor(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.ui-toast')]
    const opacities = cards.map((el) => Number(getComputedStyle(el).opacity))
    expect(opacities.some((o) => o < 1)).toBe(true)
  })

  const cards = [...document.querySelectorAll<HTMLElement>('.ui-toast')]
  // The stack offset is the `translate` longhand (not `transform` — see
  // cardStyle()'s comment for why they're deliberately different
  // properties), set inline per card. Each card gets its own value; the
  // front and back cards must differ.
  const translates = cards.map((el) => getComputedStyle(el).translate)
  expect(new Set(translates).size).toBe(2)
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('a card that grows after mount (e.g. text rewrapping on resize, or a late webfont) re-measures via ResizeObserver, not just once', async () => {
  const screen = await render(ToasterFixture)
  toast('First', { duration: 10000 })
  toast('Second', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))

  const toaster = document.querySelector('.ui-toaster')!
  toaster.dispatchEvent(new PointerEvent('pointerenter')) // expand: offsets become real-height-driven, not a flat depth*gap peek
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('true'))

  const cardsBefore = [...document.querySelectorAll<HTMLElement>('.ui-toast')]
  const frontBefore = cardsBefore.find((el) => el.getAttribute('data-front') === 'true')!
  const backBefore = cardsBefore.find((el) => el.getAttribute('data-front') === 'false')!
  const backOffsetBefore = backBefore.style.translate

  // Grow the front card's real layout box without going through the toast()
  // API at all — the API has no way to mutate an existing entry's content,
  // so this stands in for the two realistic causes: a viewport resize that
  // rewraps the title/description onto more lines, or a webfont finishing
  // its async load after first paint and changing line-height. Either way,
  // nothing here dispatches a resize event; ResizeObserver must pick up the
  // real layout change on its own.
  const grower = document.createElement('div')
  grower.style.blockSize = '100px'
  frontBefore.appendChild(grower)

  // The back card is stacked behind the front one — if height tracking
  // re-measures, its offset must grow to match the front card's new height.
  await vi.waitFor(() => {
    expect(backBefore.style.translate).not.toBe(backOffsetBefore)
  })

  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('the default slot fully replaces built-in card markup — the library still owns the <li> itself', async () => {
  const screen = await render(ToasterCustomCardFixture)
  toast('Custom card')
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())

  // Consumer markup rendered instead of the built-in icon/content/close chrome.
  expect(document.querySelector('[data-testid="custom-title"]')?.textContent).toBe('Custom card')
  expect(document.querySelector('.ui-toast-icon')).toBeNull()
  expect(document.querySelector('.ui-toast-close')).toBeNull()
  // The library still owns the <li> — position/stacking data attributes are
  // still present even though the card's INNER markup is 100% consumer-owned.
  const card = document.querySelector('.ui-toast')!
  expect(card.hasAttribute('data-front')).toBe(true)
  expect(card.getAttribute('style')).toContain('translate')

  await page.getByTestId('custom-dismiss').click()
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull())
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test("card-enter/card-leave forward TransitionGroup's own (el, done) hooks when motionCss is false — the GSAP/motion-v escape hatch", async () => {
  const enterCalls: Element[] = []
  const leaveCalls: Element[] = []
  const screen = await render(Toaster, {
    props: { motionCss: false },
    attrs: {
      onCardEnter: (el: Element, done: () => void) => {
        enterCalls.push(el)
        done()
      },
      onCardLeave: (el: Element, done: () => void) => {
        leaveCalls.push(el)
        done()
      },
    },
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  const id = toast('Imperative motion', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  await vi.waitFor(() => expect(enterCalls.length).toBe(1))
  expect(enterCalls[0]).toBeInstanceOf(HTMLElement)

  dismiss(id)
  await vi.waitFor(() => expect(leaveCalls.length).toBe(1))
  // done() was called synchronously above, so Vue actually removes the node.
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull())
  await screen.unmount()
})

test('the exposed toasterEl is the real <ol> element, usable for direct DOM/animation-lib access', async () => {
  const captured = ref<InstanceType<typeof Toaster> | null>(null)
  const Wrapper = { render: () => h(Toaster, { ref: captured }) }
  const screen = await render(Wrapper, {
    global: { stubs: { transition: false, 'transition-group': false } },
  })
  await vi.waitFor(() => expect(captured.value?.toasterEl).not.toBeNull())
  expect(captured.value!.toasterEl).toBeInstanceOf(HTMLElement)
  expect((captured.value!.toasterEl as HTMLElement).classList.contains('ui-toaster')).toBe(true)
  await screen.unmount()
})

test('maxVisible caps rendered cards even when more are queued', async () => {
  const screen = await render(ToasterFixture, { props: { maxVisible: 2 } })
  toast('One', { duration: 10000 })
  toast('Two', { duration: 10000 })
  toast('Three', { duration: 10000 })

  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  // The newest two win the visible slots.
  await expect.element(page.getByText('Two')).toBeVisible()
  await expect.element(page.getByText('Three')).toBeVisible()
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('collapsed stack: back cards take the front card height so each peeks above a taller front toast', async () => {
  const screen = await render(ToasterFixture)
  toast('One', { duration: 10000 })
  toast('Two', { duration: 10000 })
  toast('Three', { description: 'A longer description line', duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(3))

  const cards = () => [...document.querySelectorAll<HTMLElement>('.ui-toast')]
  await vi.waitFor(
    () => {
      const [back2, back1, front] = cards().map((el) => el.getBoundingClientRect())
      expect(parseFloat(cards()[1].style.blockSize)).toBeCloseTo(cards()[2].offsetHeight, 0)
      // Each deeper card's top edge sits visibly above the one in front of it.
      expect(front.top - back1.top).toBeGreaterThan(4)
      expect(front.top - back1.top).toBeLessThan(12)
      expect(back1.top - back2.top).toBeGreaterThan(4)
    },
    { timeout: 2000 },
  )
  // Back-card content is hidden so it can't bleed into the peek strip.
  expect(getComputedStyle(cards()[1].querySelector('.ui-toast-content')!).opacity).toBe('0')

  const toaster = document.querySelector('.ui-toaster')!
  toaster.dispatchEvent(new PointerEvent('pointerenter'))
  await vi.waitFor(() => {
    expect(cards()[1].style.blockSize).toBe('')
    expect(cards()[1].offsetHeight).toBeLessThan(cards()[2].offsetHeight)
  })
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('focusing a toast button expands the stack so its hidden content is revealed', async () => {
  const screen = await render(ToasterFixture)
  toast('One', { duration: 10000 })
  toast('Two', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  const toaster = document.querySelector('.ui-toaster')!
  document.querySelector<HTMLElement>('.ui-toast .ui-toast-close')!.focus()
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('true'))
  ;(document.activeElement as HTMLElement).blur()
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('false'))
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('expand keeps the stack open as a full list without hover', async () => {
  const screen = await render(ToasterFixture, { props: { expand: true } })
  toast('Saved', { duration: 10000 })
  toast.error('Upload failed', { duration: 10000 })
  toast('Synced', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(3))

  const toaster = document.querySelector('.ui-toaster')!
  expect(toaster.getAttribute('data-expanded')).toBe('true')
  await expect.element(page.getByText('Upload failed')).toBeVisible()
  await vi.waitFor(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('.ui-toast')]
    expect(cards.every((el) => Number(getComputedStyle(el).opacity) === 1)).toBe(true)
    // No two cards overlap: each sits fully above the next.
    const rects = cards.map((el) => el.getBoundingClientRect()).sort((a, b) => a.top - b.top)
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].top).toBeGreaterThanOrEqual(rects[i - 1].bottom)
    }
  })

  // Leaving after a hover must not collapse a stack the prop holds open.
  toaster.dispatchEvent(new PointerEvent('pointerenter'))
  toaster.dispatchEvent(new PointerEvent('pointerleave'))
  await new Promise((r) => setTimeout(r, 50))
  expect(toaster.getAttribute('data-expanded')).toBe('true')

  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('expand does not pause timers on its own; toasts still auto-dismiss', async () => {
  const screen = await render(ToasterFixture, { props: { expand: true } })
  toast('Short-lived', { duration: 150 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('toasts queued past maxVisible keep their full time until they show', async () => {
  const screen = await render(ToasterFixture, { props: { maxVisible: 1 } })
  const queued = toast('Queued', { duration: 150 })
  const front = toast('Front', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(1))

  // Past the queued toast's duration: it never showed, so it must still be there.
  await new Promise((r) => setTimeout(r, 200))
  expect(toasts.some((t) => t.id === queued)).toBe(true)

  dismiss(front)
  await expect.element(page.getByText('Queued')).toBeVisible()
  await vi.waitFor(() => expect(toasts.some((t) => t.id === queued)).toBe(false), {
    timeout: 2000,
  })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('the tab coming back while the stack is hovered keeps timers paused', async () => {
  const screen = await render(ToasterFixture)
  toast('Hovered', { duration: 150 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  const toaster = document.querySelector('.ui-toaster')!
  toaster.dispatchEvent(new PointerEvent('pointerenter'))

  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))

  await new Promise((r) => setTimeout(r, 200))
  expect(toasts).toHaveLength(1)

  toaster.dispatchEvent(new PointerEvent('pointerleave'))
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

function cardFor(text: string) {
  return [...document.querySelectorAll<HTMLElement>('.ui-toast')].find((el) =>
    el.textContent?.includes(text),
  )!
}

function overlaps(a: DOMRect, b: DOMRect) {
  return a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5
}

test('a pinned toast sits in its own section that newer toasts never cover', async () => {
  const screen = await render(ToasterFixture)
  toast.warning('Verify your email', { pinned: true, duration: Infinity })
  toast('One', { duration: 10000 })
  toast('Two', { duration: 10000 })
  toast('Three', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(4))

  const pinnedCard = cardFor('Verify your email')
  expect(pinnedCard.dataset.pinned).toBe('true')
  expect(pinnedCard.dataset.front).toBe('true')
  const check = () => {
    const p = pinnedCard.getBoundingClientRect()
    expect(Number(getComputedStyle(pinnedCard).opacity)).toBe(1)
    for (const el of document.querySelectorAll<HTMLElement>(
      '.ui-toast:not([data-pinned="true"])',
    )) {
      const r = el.getBoundingClientRect()
      expect(overlaps(p, r)).toBe(false)
      // Bottom position: the pinned section sits above the stack, away from the edge.
      expect(p.bottom).toBeLessThanOrEqual(r.top + 0.5)
    }
  }
  await vi.waitFor(check)

  // Expanding the stack pushes the pinned section along instead of sliding under it.
  const toaster = document.querySelector('.ui-toaster')!
  toaster.dispatchEvent(new PointerEvent('pointerenter'))
  await vi.waitFor(() => expect(toaster.getAttribute('data-expanded')).toBe('true'))
  // Check once the expand transition has come to rest, not on a passing frame.
  await vi.waitFor(async () => {
    const top = pinnedCard.getBoundingClientRect().top
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame)
    expect(pinnedCard.getBoundingClientRect().top).toBe(top)
  })
  check()

  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('top positions put the pinned section below the stack', async () => {
  const screen = await render(ToasterFixture, { props: { position: 'top-right' } })
  toast('Pinned', { pinned: true, duration: Infinity })
  toast('Regular', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  await vi.waitFor(() => {
    const p = cardFor('Pinned').getBoundingClientRect()
    const r = cardFor('Regular').getBoundingClientRect()
    expect(p.top).toBeGreaterThanOrEqual(r.bottom - 0.5)
  })
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('pinned toasts are outside maxVisible: they never queue and never push others out', async () => {
  const screen = await render(ToasterFixture, { props: { maxVisible: 1 } })
  const pinnedId = toast('Pinned', { pinned: true, duration: 150 })
  toast('Regular', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))
  await expect.element(page.getByText('Pinned')).toBeVisible()
  await expect.element(page.getByText('Regular')).toBeVisible()

  // Its timer runs: it was on screen the whole time.
  await vi.waitFor(() => expect(toasts.some((t) => t.id === pinnedId)).toBe(false), {
    timeout: 2000,
  })
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('a pinned toast alone sits at the edge like any single toast', async () => {
  const screen = await render(ToasterFixture)
  toast('Only pinned', { pinned: true, duration: Infinity })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  const toaster = document.querySelector<HTMLElement>('.ui-toaster')!
  await vi.waitFor(() => {
    const card = cardFor('Only pinned').getBoundingClientRect()
    const box = toaster.getBoundingClientRect()
    expect(Math.abs(card.bottom - box.bottom)).toBeLessThan(1)
    expect(Math.abs(box.height - card.height)).toBeLessThan(1)
  })
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('a pinned toast swipes away like any other, and the stack keeps its place', async () => {
  const screen = await render(ToasterFixture)
  toast('Pinned swipe', { pinned: true, duration: Infinity })
  toast('Stays', { duration: 10000 })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(2))

  const card = cardFor('Pinned swipe')
  await drag(card, 80, 0)
  await vi.waitFor(() => expect(card.getAttribute('data-swipe-out')).toBe('true'))
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toast').length).toBe(1), {
    timeout: 2000,
  })
  await expect.element(page.getByText('Stays')).toBeVisible()
  dismiss()
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('updating a toast by id re-renders the same card, not a second one', async () => {
  const screen = await render(ToasterFixture)
  toast('Uploading', { id: 'upload', duration: Infinity })
  await expect.element(page.getByText('Uploading')).toBeVisible()
  const card = document.querySelector('.ui-toast')!

  toast.success('Uploaded', { id: 'upload' })
  await expect.element(page.getByText('Uploaded')).toBeVisible()
  expect(document.querySelectorAll('.ui-toast').length).toBe(1)
  expect(document.querySelector('.ui-toast')).toBe(card)
  expect(card.classList.contains('ui-toast--success')).toBe(true)

  toast.dismiss('upload')
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull())
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

test('a toast with a custom id swipes away', async () => {
  const screen = await render(ToasterFixture)
  toast('Custom swipe', { id: 'swipe-me', duration: 10000 })
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).not.toBeNull())
  const card = document.querySelector<HTMLElement>('.ui-toast')!
  await drag(card, 80, 0)
  await vi.waitFor(() => expect(card.getAttribute('data-swipe-out')).toBe('true'))
  await vi.waitFor(() => expect(document.querySelector('.ui-toast')).toBeNull(), { timeout: 2000 })
  await screen.unmount()
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(0))
})

// Two Toasters on one page: the unnamed one and one named "side".
async function renderPair(props: { plain?: object; side?: object } = {}) {
  const screen = await render({
    render: () => [
      h(Toaster, { position: 'bottom-right', ...props.plain }),
      h(Toaster, { name: 'side', position: 'top-left', ...props.side }),
    ],
  })
  await vi.waitFor(() => expect(document.querySelectorAll('.ui-toaster').length).toBe(2))
  const plain = document.querySelector<HTMLElement>('.ui-toaster--bottom-right')!
  const side = document.querySelector<HTMLElement>('.ui-toaster--top-left')!
  const titles = (el: Element) =>
    [...el.querySelectorAll('.ui-toast-title')].map((t) => t.textContent).sort()
  return { screen, plain, side, titles }
}

test('a named Toaster shows only toasts sent to it; the unnamed one shows only the rest', async () => {
  const { screen, plain, side, titles } = await renderPair()
  toast('Plain', { duration: 10000 })
  toast('Side', { toaster: 'side', duration: 10000 })

  await vi.waitFor(() => expect(titles(plain)).toEqual(['Plain']))
  await vi.waitFor(() => expect(titles(side)).toEqual(['Side']))
  toast.dismiss()
  await screen.unmount()
})

test('maxVisible and queued timers count per Toaster', async () => {
  const { screen, plain, side, titles } = await renderPair({
    plain: { maxVisible: 1 },
    side: { maxVisible: 2 },
  })
  toast('Plain', { duration: 200 })
  toast('Side 1', { toaster: 'side', duration: 10000 })
  toast('Side 2', { toaster: 'side', duration: 10000 })

  await vi.waitFor(() => expect(titles(side)).toEqual(['Side 1', 'Side 2']))
  expect(titles(plain)).toEqual(['Plain'])
  // The side toasts don't push 'Plain' past its Toaster's maxVisible, so its timer runs.
  await vi.waitFor(() => expect(titles(plain)).toEqual([]), { timeout: 2000 })
  expect(titles(side)).toEqual(['Side 1', 'Side 2'])
  toast.dismiss()
  await screen.unmount()
})

test('hovering one Toaster pauses only its own toasts', async () => {
  const { screen, plain, side, titles } = await renderPair()
  toast('Plain', { duration: 200 })
  toast('Side', { toaster: 'side', duration: 200 })
  await vi.waitFor(() => expect(titles(side)).toEqual(['Side']))

  side.dispatchEvent(new PointerEvent('pointerenter'))
  // Plain's identical timer has fired by now, so a running Side timer would have dequeued it.
  await vi.waitFor(() => expect(titles(plain)).toEqual([]), { timeout: 2000 })
  expect(useToastQueue('side').toasts).toHaveLength(1)
  expect(titles(side)).toEqual(['Side'])

  side.dispatchEvent(new PointerEvent('pointerleave'))
  await vi.waitFor(() => expect(titles(side)).toEqual([]), { timeout: 2000 })
  await screen.unmount()
})

test("dismissing a toast removes it from its own Toaster and leaves the other's alone", async () => {
  const { screen, plain, side, titles } = await renderPair()
  toast('Plain', { duration: 10000 })
  const id = toast('Side', { toaster: 'side', duration: 10000 })
  await vi.waitFor(() => expect(titles(side)).toEqual(['Side']))

  toast.dismiss(id)
  await vi.waitFor(() => expect(titles(side)).toEqual([]))
  expect(titles(plain)).toEqual(['Plain'])

  toast('Side', { toaster: 'side', duration: 10000 })
  await vi.waitFor(() => expect(titles(side)).toEqual(['Side']))
  side.querySelector<HTMLElement>('.ui-toast-close')!.click()
  await vi.waitFor(() => expect(titles(side)).toEqual([]))
  expect(titles(plain)).toEqual(['Plain'])
  toast.dismiss()
  await screen.unmount()
})

test('an app with one unnamed Toaster never shows toasts sent to a named one', async () => {
  const screen = await render(ToasterFixture)
  toast('Elsewhere', { toaster: 'side', duration: 10000 })
  toast('Here', { duration: 10000 })
  await expect.element(page.getByText('Here')).toBeVisible()
  expect(document.querySelectorAll('.ui-toast').length).toBe(1)
  toast.dismiss()
  await screen.unmount()
})
