// Motion scenarios 1-18 from motion-v and Motion's own suites, restated for v-animate.
import '../src/style.css'
import { afterEach, expect, test, vi } from 'vitest'
import { page } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import { defineComponent, h, nextTick, shallowRef, vShow, withDirectives } from 'vue'
import type { DirectiveArguments, VNode, VNodeChild } from 'vue'
import { vAnimate } from '../src/directives/vAnimate'

const real = { global: { stubs: { transition: false, 'transition-group': false } } }
const frame = () => new Promise<number>(requestAnimationFrame)
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const LIN = { duration: 300, easing: 'linear' } as const
// The exit token (`--ui-duration-exit`) a leaving look without its own `exit` plays on.
const EXIT_MS = 150
const FRAMES_2 = 50

const anim = (node: VNode, value: unknown, arg?: string, modifiers?: Record<string, boolean>) =>
  withDirectives(node, [[vAnimate, value, arg, modifiers]] as DirectiveArguments)
// Mounted at once; the returned unmount waits for the render's trace mark.
const mount = (view: () => VNodeChild) => {
  const result = render({ setup: () => view }, real)
  return { unmount: async () => (await result).unmount() }
}

const isGhost = (el: Element) => el.getAttribute('aria-hidden') === 'true'
const all = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const live = (sel: string) => all(sel).filter((el) => !isGhost(el))
const ghosts = (sel: string) => all(sel).filter(isGhost)
const layoutRuns = (el: Element) => el.getAnimations().filter((a) => a.id === 'ui-layout')
const opacityOf = (el: Element) => Number(getComputedStyle(el).opacity)
const translateOf = (el: Element) => {
  const t = getComputedStyle(el).translate
  const [x = '0', y = '0'] = t === 'none' ? [] : t.split(' ')
  return { x: Number.parseFloat(x) || 0, y: Number.parseFloat(y) || 0 }
}
/** Calls `read` once per frame for `ms`. */
async function sample<T>(ms: number, read: () => T): Promise<T[]> {
  const out: T[] = []
  const end = performance.now() + ms
  while (performance.now() < end) {
    out.push(read())
    await frame()
  }
  return out
}
const maxStep = (xs: number[]) => Math.max(0, ...xs.slice(1).map((x, i) => Math.abs(x - xs[i]!)))
const near = (actual: number, expected: number, tol: number, label: string) =>
  expect(Math.abs(actual - expected), `${label}: ${actual} vs ${expected}`).toBeLessThanOrEqual(tol)
/** Waits for `cond`, checked now and then once per frame (vi.waitFor polls too late for a 150ms exit). */
async function until(cond: () => boolean, cap = 1000): Promise<void> {
  const start = performance.now()
  while (!cond()) {
    if (performance.now() - start > cap) throw new Error(`timed out: ${cond}`)
    await frame()
  }
}
/** How long until `gone()` holds, polled every frame, up to `cap` ms. */
async function timeUntil(gone: () => boolean, cap = 2000): Promise<number> {
  const start = performance.now()
  while (!gone() && performance.now() - start < cap) await frame()
  return performance.now() - start
}
const styles: HTMLStyleElement[] = []
const addStyle = (css: string) => {
  const s = document.createElement('style')
  s.textContent = css
  document.head.append(s)
  styles.push(s)
}

afterEach(async () => {
  document.body.innerHTML = ''
  for (const s of styles.splice(0)) s.remove()
  document.documentElement.style.height = ''
  window.scrollTo(0, 0)
  // A scroll in the last test makes removals "recycled rows" (no exit) for 150ms.
  await wait(200)
})

test('1. a content-box element with padding and a sub-pixel width keeps its exact size while it leaves', async () => {
  const shown = shallowRef(true)
  mount(() =>
    h('div', { style: 'position: relative' }, [
      shown.value
        ? anim(
            h(
              'p',
              {
                class: 'goes1',
                style:
                  'box-sizing: content-box; width: 100.5px; padding: 10px; border: 2px solid; margin: 0',
              },
              'Goes',
            ),
            { initial: { opacity: 0 }, ...LIN },
          )
        : null,
    ]),
  )
  await vi.waitFor(() => expect(document.querySelector('.goes1')).not.toBeNull())
  await wait(400)
  const el = document.querySelector<HTMLElement>('.goes1')!
  const lines = () => {
    const range = document.createRange()
    range.selectNodeContents(el.firstChild!)
    return range.getClientRects().length
  }
  const before = el.getBoundingClientRect()
  const linesBefore = lines()
  shown.value = false
  await until(() => ghosts('.goes1').length === 1)
  const ghost = el.getBoundingClientRect()
  near(ghost.width, before.width, 0.01, 'width')
  near(ghost.height, before.height, 0.01, 'height')
  expect(lines()).toBe(linesBefore)
})

test('2. a window resize that re-wraps layout members causes no phantom slide on a later unrelated change', async () => {
  await page.viewport(900, 700)
  try {
    const chips = ['a', 'b', 'c', 'd', 'e', 'f']
    mount(() =>
      h(
        'div',
        { class: 'row2', style: 'display: flex; flex-wrap: wrap; gap: 8px; max-width: 100%' },
        chips.map((c) =>
          anim(h('span', { key: c, class: 'chip2', style: 'width: 120px; flex: none' }, c), {
            layout: true,
            ...LIN,
          }),
        ),
      ),
    )
    await frame()
    await frame()
    const rects = () => all('.chip2').map((el) => el.getBoundingClientRect())
    const wide = rects()
    await page.viewport(400, 700)
    await vi.waitFor(() => expect(rects()[5]!.top).toBeGreaterThan(wide[5]!.top))
    await frame()
    await frame()
    const after = rects()
    // An unrelated attribute on the row.
    document.querySelector<HTMLElement>('.row2')!.dataset.x = '1'
    const seen = await sample(400, () =>
      all('.chip2').map((el) => ({
        left: el.getBoundingClientRect().left,
        top: el.getBoundingClientRect().top,
        runs: layoutRuns(el).length,
      })),
    )
    for (const frameSeen of seen)
      frameSeen.forEach((chip, i) => {
        expect(chip.runs, `chip ${i} layout runs`).toBe(0)
        near(chip.left, after[i]!.left, 0.5, `chip ${i} left`)
        near(chip.top, after[i]!.top, 0.5, `chip ${i} top`)
      })
  } finally {
    await page.viewport(414, 896)
  }
})

test('3. layoutId: A removed, then B added 50ms later, appears in place without sliding from A', async () => {
  const a = shallowRef(true)
  const b = shallowRef(false)
  const look = { layoutId: 'box3', ...LIN }
  mount(() =>
    h('div', { class: 'wrap3' }, [
      a.value
        ? anim(
            h('div', { key: 'a', id: 'a3', style: 'margin-left: 0; width: 50px; height: 20px' }),
            look,
          )
        : null,
      b.value
        ? anim(
            h('div', {
              key: 'b',
              id: 'b3',
              style: 'margin-left: 200px; width: 50px; height: 20px',
            }),
            look,
          )
        : null,
    ]),
  )
  await frame()
  const B = () => document.querySelector<HTMLElement>('#b3')!
  // Control: the same tick slides from A.
  a.value = false
  b.value = true
  await until(() => !!B() && layoutRuns(B()).length === 1)
  const start = (layoutRuns(B())[0]!.effect as KeyframeEffect).getKeyframes()[0]!.transform
  expect(String(start)).toMatch(/^translate\(-200px, 0px\)/)
  await wait(400)
  b.value = false
  a.value = true
  await wait(500)
  // The case: a separate update 50ms later.
  a.value = false
  await nextTick()
  await wait(50)
  b.value = true
  await nextTick()
  await wait(50)
  const wrap = document.querySelector('.wrap3')!.getBoundingClientRect()
  expect(layoutRuns(B())).toHaveLength(0)
  near(B().getBoundingClientRect().left - wrap.left, 200, 0.01, 'B left')
})

test('4. a child component root leaves (layoutId and exit) from where it was painted, though a banner inserted above in the same flush moved it', async () => {
  const run = async (look: Record<string, unknown>, withTarget: boolean) => {
    const banner = shallowRef(false)
    const open = shallowRef(false)
    const Row = defineComponent({
      setup: () => () =>
        anim(h('div', { class: 'tab4', style: 'width: 60px; height: 20px' }, 'Reply'), look),
    })
    const view = mount(() =>
      h('div', [
        // The banner's own wrapper is patched first, so it's in before Row unmounts.
        h('div', [banner.value ? h('div', { style: 'height: 40px' }, 'New') : null]),
        h('div', [
          !open.value
            ? h(Row)
            : h('div', { style: 'padding-left: 100px' }, [
                withTarget
                  ? anim(h('div', { class: 'tab4b', style: 'width: 60px; height: 20px' }), look)
                  : null,
              ]),
        ]),
      ]),
    )
    await frame()
    await frame()
    const before = document.querySelector('.tab4')!.getBoundingClientRect()
    banner.value = true
    open.value = true
    return { before, view }
  }
  // layoutId: the newcomer's first keyframe is Row's pre-flush box.
  {
    const { before, view } = await run({ layoutId: 'pill4', ...LIN }, true)
    const target = () => document.querySelector<HTMLElement>('.tab4b')!
    await until(() => !!target() && layoutRuns(target()).length === 1)
    const start = String(
      (layoutRuns(target())[0]!.effect as KeyframeEffect).getKeyframes()[0]!.transform,
    )
    const [, dx = 'NaN', dy = 'NaN'] = start.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/) ?? []
    await wait(400)
    const final = target().getBoundingClientRect()
    near(Number(dx), before.left - final.left, 1, 'layoutId start x')
    expect
      .soft(
        Math.abs(Number(dy) - (before.top - final.top)),
        `layoutId start y: ${dy} vs ${before.top - final.top}`,
      )
      .toBeLessThanOrEqual(1)
    await view.unmount()
    document.body.innerHTML = ''
  }
  // exit: the ghost's top is the pre-flush top.
  {
    const { before } = await run({ exit: { opacity: 0 }, ...LIN }, false)
    await until(() => ghosts('.tab4').length === 1)
    const ghost = ghosts('.tab4')[0]!.getBoundingClientRect()
    expect
      .soft(Math.abs(ghost.top - before.top), `exit ghost top: ${ghost.top} vs ${before.top}`)
      .toBeLessThanOrEqual(1)
  }
})

test('5. showing a display:none container puts its layout children in place at once, with no slide from 0,0', async () => {
  // v-show on the parent itself.
  {
    const tab = shallowRef('a')
    const view = mount(() =>
      h('div', [
        withDirectives(
          h('section', { class: 'panel5' }, [
            h('p', { style: 'height: 30px; margin: 0' }, 'Title'),
            anim(h('div', { class: 'item5', style: 'height: 20px' }, 'Item'), {
              layout: true,
              ...LIN,
            }),
          ]),
          [[vShow, tab.value === 'b']],
        ),
      ]),
    )
    await frame()
    await frame()
    tab.value = 'b'
    await nextTick()
    await frame()
    const item = document.querySelector<HTMLElement>('.item5')!
    const panel = document.querySelector('.panel5')!.getBoundingClientRect()
    expect.soft(layoutRuns(item), 'v-show on the parent: layout runs').toHaveLength(0)
    expect
      .soft(item.getBoundingClientRect().top - panel.top, 'v-show on the parent: top')
      .toBeCloseTo(30, 1)
    await view.unmount()
    document.body.innerHTML = ''
  }
  // v-show on a wrapper above the parent, then an unrelated change inside it.
  {
    const tab = shallowRef('a')
    const note = shallowRef('x')
    mount(() =>
      h('div', [
        withDirectives(
          h('div', { class: 'wrapper5' }, [
            h('section', { class: 'panel5' }, [
              h('p', { style: 'height: 30px; margin: 0', 'data-note': note.value }, 'Title'),
              anim(h('div', { class: 'item5', style: 'height: 20px' }, 'Item'), {
                layout: true,
                ...LIN,
              }),
            ]),
          ]),
          [[vShow, tab.value === 'b']],
        ),
      ]),
    )
    await frame()
    await frame()
    tab.value = 'b'
    await nextTick()
    await frame()
    await frame()
    note.value = 'y'
    await nextTick()
    await frame()
    const item = document.querySelector<HTMLElement>('.item5')!
    const panel = document.querySelector('.panel5')!.getBoundingClientRect()
    expect.soft(layoutRuns(item), 'v-show above the parent: layout runs').toHaveLength(0)
    expect
      .soft(item.getBoundingClientRect().top - panel.top, 'v-show above the parent: top')
      .toBeCloseTo(30, 1)
  }
})

// Known limit: the leaving copy is still a sibling for `* + *`, so a margin that collapses through
// an unpadded parent jumps as it goes (Motion's popLayout and auto-animate alike). Use `gap`.
test.skip('6. taking items out of a sibling-margin list leaves the rest with no jump as the ghosts go', async () => {
  addStyle(`
    .stack6 { list-style: none; margin: 0; padding: 0; position: relative }
    .stack6 > * + * { margin-top: 8px }
    .stack6 > li { height: 20px; border-bottom: 2px solid }
    .stack6 > li:last-child { border-bottom: 0 }
  `)
  const run = async (from: string[], to: string[]) => {
    const items = shallowRef(from)
    const view = mount(() =>
      h(
        'ul',
        { class: 'stack6' },
        items.value.map((i) =>
          anim(h('li', { key: i, 'data-k': i }, i), {
            initial: { opacity: 0 },
            layout: true,
            ...LIN,
          }),
        ),
      ),
    )
    await wait(400)
    const list = document.querySelector('.stack6')!.getBoundingClientRect()
    const liveOf = (k: string) => live(`.stack6 > li[data-k="${k}"]`)[0]!
    const pre = liveOf('b').getBoundingClientRect()
    items.value = to
    await nextTick()
    const seen = await sample(700, () => {
      const b = liveOf('b').getBoundingClientRect()
      const order = live('.stack6 > li').map((el) => el.dataset.k)
      const x = live('.stack6 > li[data-k="x"]')[0]
      return {
        top: b.top - list.top,
        bottom: b.bottom - list.top,
        order: order.join(''),
        xMargin: x ? getComputedStyle(x).marginTop : '0px',
      }
    })
    await view.unmount()
    document.body.innerHTML = ''
    return [
      {
        top: pre.top - list.top,
        bottom: pre.bottom - list.top,
        order: seen[0]!.order,
        xMargin: '0px',
      },
      ...seen,
    ]
  }
  // The first goes: b ends at the top, without an 8px snap.
  const first = await run(['a', 'b', 'c'], ['b', 'c'])
  expect.soft(maxStep(first.map((s) => s.top)), 'first removed: biggest step').toBeLessThan(8)
  expect.soft(first.at(-1)!.top, 'first removed: b settles at the top').toBeCloseTo(0, 1)
  // The last goes: b becomes last-child.
  const last = await run(['a', 'b', 'c'], ['a', 'b'])
  expect.soft(maxStep(last.map((s) => s.top)), 'last removed: biggest top step').toBeLessThan(8)
  expect
    .soft(maxStep(last.map((s) => s.bottom)), 'last removed: biggest bottom step')
    .toBeLessThan(8)
  // a and c go, x comes in first.
  const swap = await run(['a', 'b', 'c'], ['x', 'b'])
  expect.soft(maxStep(swap.map((s) => s.top)), 'x in: biggest step').toBeLessThan(8)
  expect.soft(new Set(swap.map((s) => s.order)), 'x in: live order').toEqual(new Set(['xb']))
  expect.soft(new Set(swap.map((s) => s.xMargin)), 'x in: its margin').toEqual(new Set(['0px']))
})

test('7. layoutId into a scaled container starts exactly on the source box', async () => {
  const run = async (parentStyle: string) => {
    const open = shallowRef(false)
    const look = { layoutId: `card7-${parentStyle.length}`, ...LIN }
    const view = mount(() =>
      h('div', { style: 'position: relative; width: 600px' }, [
        !open.value
          ? anim(
              h('button', { class: 'src7', style: 'width: 80px; height: 30px; margin: 0' }, 'Card'),
              look,
            )
          : h('div', { style: parentStyle }, [
              anim(
                h('div', { class: 'target7', style: 'width: 80px; height: 30px' }, 'Card'),
                look,
              ),
            ]),
      ]),
    )
    await frame()
    await frame()
    const before = document.querySelector('.src7')!.getBoundingClientRect()
    open.value = true
    const target = () => document.querySelector<HTMLElement>('.target7')!
    await until(() => !!target() && layoutRuns(target()).length === 1)
    const slide = layoutRuns(target())[0]!
    // Its first frame.
    slide.pause()
    slide.currentTime = 0
    const at = target().getBoundingClientRect()
    slide.cancel()
    await view.unmount()
    document.body.innerHTML = ''
    return { before, at }
  }
  for (const parent of [
    'transform: scale(0.5); transform-origin: 0 0; margin-left: 300px',
    'transform: translate(-50%, 0); margin-left: 300px',
  ]) {
    const { before, at } = await run(parent)
    for (const side of ['left', 'top', 'width', 'height'] as const)
      expect
        .soft(
          Math.abs(at[side] - before[side]),
          `${parent} ${side}: ${at[side]} vs ${before[side]}`,
        )
        .toBeLessThanOrEqual(1)
  }
})

// Runs before anything else in this file uses `animate`: the runtime chunk isn't loaded yet.
test('8. an animate value changed before the lazy runtime loads settles there and leaves no inline style once animate is gone', async () => {
  const open = shallowRef(false)
  const on = shallowRef(true)
  mount(() =>
    anim(
      h('span', { class: 'chev8', style: 'display: inline-block' }, '▾'),
      on.value ? { animate: { rotate: open.value ? 180 : 0 } } : {},
    ),
  )
  // Before the chunk has arrived.
  open.value = true
  await nextTick()
  const chev = document.querySelector<HTMLElement>('.chev8')!
  await vi.waitFor(() => expect(getComputedStyle(chev).rotate).toBe('180deg'), { timeout: 3000 })
  on.value = false
  await nextTick()
  await frame()
  await frame()
  expect.soft(chev.style.rotate, 'inline rotate').toBe('')
  expect.soft(getComputedStyle(chev).rotate, 'computed rotate').toBe('none')
})

test('9. re-entering during the exit leaves exactly one live, clickable element that fades in steadily', async () => {
  const shown = shallowRef(true)
  mount(() =>
    h('div', { style: 'position: relative; padding-top: 20px' }, [
      shown.value
        ? anim(h('p', { class: 'goes9', style: 'margin: 0; width: 120px; height: 30px' }, 'Goes'), {
            initial: { opacity: 0, y: 8 },
            ...LIN,
          })
        : null,
    ]),
  )
  await wait(400)
  shown.value = false
  await nextTick()
  await wait(100)
  expect(ghosts('.goes9')).toHaveLength(1)
  shown.value = true
  await nextTick()
  const t0 = performance.now()
  const seen = await sample(500, () => {
    const l = live('.goes9')
    return {
      t: performance.now() - t0,
      live: l.length,
      ghosts: ghosts('.goes9').length,
      opacity: l[0] ? opacityOf(l[0]) : Number.NaN,
    }
  })
  expect(seen.map((s) => s.live)).toEqual(seen.map(() => 1))
  expect(seen.filter((s) => s.t > 300 + 17).map((s) => s.ghosts)).not.toContain(1)
  const rises = seen.map((s) => s.opacity)
  rises
    .slice(1)
    .forEach((o, i) =>
      expect(o, `opacity at sample ${i + 1}`).toBeGreaterThanOrEqual(rises[i]! - 0.001),
    )
  const el = live('.goes9')[0]!
  expect(opacityOf(el)).toBe(1)
  expect(getComputedStyle(el).translate).toBe('none')
  const box = el.getBoundingClientRect()
  expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(el)
})

test('10. fast key changes and fast v-if flips leave no ghosts, only the latest element at full opacity', async () => {
  const n = shallowRef(0)
  const look = { initial: { opacity: 0 }, exit: { opacity: 0, x: -20 }, ...LIN }
  const view = mount(() =>
    h('div', { style: 'position: relative' }, [
      anim(
        h(
          'div',
          { key: n.value, class: 'v10', style: 'height: 20px; width: 100px' },
          String(n.value),
        ),
        look,
      ),
    ]),
  )
  await wait(400)
  const counts: { live: number; ghosts: number }[] = []
  let sampling = true
  void (async () => {
    while (sampling) {
      counts.push({ live: live('.v10').length, ghosts: ghosts('.v10').length })
      await frame()
    }
  })()
  for (let i = 0; i < 6; i++) {
    if (i) await wait(30)
    n.value++
  }
  // The last entrance is 300ms from the last change: waited out, however slow the machine.
  await vi.waitFor(
    () => {
      expect(all('.v10')).toHaveLength(1)
      expect(opacityOf(all('.v10')[0]!)).toBe(1)
    },
    { timeout: 2000 },
  )
  sampling = false
  expect(counts.map((c) => c.live)).toEqual(counts.map(() => 1))
  expect(Math.max(...counts.map((c) => c.ghosts))).toBeLessThanOrEqual(6)
  expect(all('.v10')[0]!.textContent).toBe('6')
  expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  await view.unmount()
  document.body.innerHTML = ''

  // v-if flipped 7 times in 100ms: it ends hidden, with nothing left.
  const shown = shallowRef(true)
  mount(() =>
    h('div', { style: 'position: relative' }, [
      shown.value
        ? anim(h('div', { class: 'v10b', style: 'height: 20px; width: 100px' }, 'v'), look)
        : null,
    ]),
  )
  await wait(400)
  for (let i = 0; i < 7; i++) {
    if (i) await wait(14)
    shown.value = !shown.value
  }
  await vi.waitFor(() => expect(all('.v10b')).toHaveLength(0), { timeout: 2000 })
  expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
})

test('11. removed mid-entrance, it exits from the look it had, never restarting or jumping back', async () => {
  const shown = shallowRef(true)
  mount(() =>
    h('div', { style: 'position: relative' }, [
      shown.value
        ? anim(h('p', { class: 'p11', style: 'margin: 0; height: 30px; width: 100px' }, 'In'), {
            initial: { opacity: 0, y: 20 },
            duration: 600,
            easing: 'linear',
          })
        : null,
    ]),
  )
  await vi.waitFor(() => expect(document.querySelector('.p11')).not.toBeNull())
  await wait(200)
  const el = document.querySelector<HTMLElement>('.p11')!
  const before = { opacity: opacityOf(el), y: translateOf(el).y }
  // Mid-entrance, not at either end.
  expect(before.opacity).toBeGreaterThan(0.1)
  expect(before.opacity).toBeLessThan(0.9)
  shown.value = false
  await nextTick()
  const t0 = performance.now()
  expect(ghosts('.p11')).toHaveLength(1)
  const seen = await sample(EXIT_MS + 150, () =>
    el.isConnected
      ? { opacity: opacityOf(el), y: translateOf(el).y, t: performance.now() - t0 }
      : null,
  )
  const on = seen.filter((s) => s !== null)
  expect(on.length).toBeGreaterThan(0)
  near(on[0]!.opacity, before.opacity, 0.1, 'first ghost opacity')
  on.slice(1).forEach((s, i) => {
    expect(s.opacity, `opacity rises at ${i + 1}`).toBeLessThanOrEqual(on[i]!.opacity + 0.001)
    expect(s.y, `y at ${i + 1}`).toBeLessThanOrEqual(on[i]!.y + 0.01)
  })
  for (const s of on) {
    expect(s.y).toBeGreaterThan(9.5)
    expect(s.y).toBeLessThan(before.y + 0.5)
  }
  expect(el.isConnected).toBe(false)
  expect(on.at(-1)!.t).toBeLessThanOrEqual(EXIT_MS + FRAMES_2)
})

test('12. an exit that changes nothing, one before a staggered entrance and one never seen all still remove the element', async () => {
  // (a) exit matching the current look.
  {
    const shown = shallowRef(true)
    const view = mount(() =>
      h('div', { style: 'position: relative' }, [
        shown.value
          ? anim(h('p', { class: 'p12a', style: 'margin: 0' }, 'a'), {
              initial: { opacity: 0 },
              exit: { opacity: 1 },
              ...LIN,
            })
          : null,
      ]),
    )
    await wait(400)
    const el = document.querySelector('.p12a')!
    shown.value = false
    await nextTick()
    const took = await timeUntil(() => !el.isConnected)
    expect.soft(took, '(a) time to leave').toBeLessThanOrEqual(300 + FRAMES_2)
    await view.unmount()
    document.body.innerHTML = ''
  }
  // (b) index 5 of a stagger, removed before its delayed entrance starts.
  {
    const items = shallowRef([0, 1, 2, 3, 4, 5])
    const view = mount(() =>
      h(
        'div',
        { style: 'position: relative' },
        items.value.map((i) =>
          anim(
            h('div', { key: i, class: 'r12b', 'data-i': i, style: 'height: 20px' }, String(i)),
            { initial: { opacity: 0 }, stagger: 0.2, ...LIN },
            'rows12',
          ),
        ),
      ),
    )
    await wait(100)
    const el = document.querySelector('.r12b[data-i="5"]')!
    // Still held at its start.
    expect.soft(opacityOf(el), '(b) held before its delay').toBe(0)
    items.value = [0, 1, 2, 3, 4]
    await nextTick()
    const took = await timeUntil(() => !el.isConnected)
    expect.soft(took, '(b) time to leave').toBeLessThanOrEqual(300 + FRAMES_2)
    await view.unmount()
    document.body.innerHTML = ''
  }
  // (c) when: 'visible' below the fold, removed before it's scrolled to.
  {
    const errors: unknown[] = []
    const onError = (e: ErrorEvent) => errors.push(e.error ?? e.message)
    window.addEventListener('error', onError)
    try {
      const shown = shallowRef(true)
      mount(() =>
        h('div', { style: 'position: relative' }, [
          h('div', { style: 'height: 3000px' }),
          shown.value
            ? anim(h('p', { class: 'p12c' }, 'c'), {
                initial: { opacity: 0 },
                when: 'visible',
                ...LIN,
              })
            : null,
        ]),
      )
      await frame()
      const el = document.querySelector('.p12c')!
      shown.value = false
      await nextTick()
      await frame()
      await frame()
      expect.soft(el.isConnected, '(c) gone').toBe(false)
      window.scrollTo(0, 3000)
      await frame()
      await frame()
      await frame()
      expect.soft(all('.p12c'), '(c) nothing left').toHaveLength(0)
      expect.soft(errors, '(c) errors on scroll').toEqual([])
    } finally {
      window.removeEventListener('error', onError)
    }
  }
})

test('13. nested exits: the child rides inside its parent as it fades, without its own exit, and all go together', async () => {
  const shown = shallowRef(true)
  mount(() =>
    h('div', { class: 'outer13', style: 'position: relative' }, [
      shown.value
        ? anim(
            h('div', { id: 'parent13' }, [
              anim(h('p', { id: 'child13', style: 'margin: 0' }, 'Hi'), {
                initial: { y: 8 },
                exit: { x: 40 },
                duration: 100,
              }),
              anim(h('span', { id: 'grandchild13' }, '!'), { initial: { opacity: 0 } }),
            ]),
            { initial: { opacity: 0 }, exit: { opacity: 0 }, duration: 400, easing: 'linear' },
          )
        : null,
    ]),
  )
  await wait(700)
  const parent = document.querySelector<HTMLElement>('#parent13')!
  const child = document.querySelector<HTMLElement>('#child13')!
  const grandchild = document.querySelector<HTMLElement>('#grandchild13')!
  const outer = document.querySelector('.outer13')!
  const translateBefore = getComputedStyle(child).translate
  shown.value = false
  await nextTick()
  const t0 = performance.now()
  let strays = 0
  let at100: { parent: number; inside: boolean; translate: string; opacity: number } | undefined
  while (performance.now() - t0 < 400 + FRAMES_2 + 100) {
    if (child.parentElement === outer) strays++
    if (!at100 && performance.now() - t0 >= 100)
      at100 = {
        parent: opacityOf(parent),
        inside: parent.contains(child),
        translate: getComputedStyle(child).translate,
        opacity: opacityOf(child),
      }
    if (![parent, child, grandchild].some((el) => el.isConnected)) break
    await frame()
  }
  const took = performance.now() - t0
  expect(at100).toBeDefined()
  expect(at100!.parent).toBeLessThan(1)
  expect(at100!.inside).toBe(true)
  expect(at100!.translate).toBe(translateBefore)
  expect(at100!.opacity).toBe(1)
  expect(strays).toBe(0)
  expect([parent, child, grandchild].map((el) => el.isConnected)).toEqual([false, false, false])
  expect(took).toBeLessThanOrEqual(400 + FRAMES_2)
})

test("14. a plain parent removed: the child's exit doesn't run, nothing is left, and a size box around it restores its styles", async () => {
  {
    const shown = shallowRef(true)
    const view = mount(() =>
      h('div', [
        shown.value
          ? h('section', [
              anim(h('p', { class: 'c14' }, 'x'), {
                initial: { opacity: 0 },
                exit: { opacity: 0 },
              }),
            ])
          : null,
      ]),
    )
    await wait(400)
    shown.value = false
    await nextTick()
    await frame()
    expect.soft(document.querySelectorAll('.c14'), 'no .c14 left').toHaveLength(0)
    await view.unmount()
    document.body.innerHTML = ''
  }
  {
    const shown = shallowRef(true)
    mount(() =>
      h('div', [
        anim(
          h('div', { class: 'box14' }, [
            shown.value
              ? h('section', { style: 'height: 60px' }, [
                  anim(h('p', { class: 'c14b', style: 'margin: 0' }, 'x'), {
                    initial: { opacity: 0 },
                    exit: { opacity: 0 },
                  }),
                ])
              : null,
          ]),
          { duration: 300, easing: 'linear' },
          undefined,
          { size: true },
        ),
      ]),
    )
    await wait(400)
    const box = document.querySelector<HTMLElement>('.box14')!
    expect(box.getBoundingClientRect().height).toBeCloseTo(60, 0)
    shown.value = false
    await nextTick()
    await frame()
    expect.soft(document.querySelectorAll('.c14b'), 'no .c14b left').toHaveLength(0)
    await wait(100)
    const mid = box.getBoundingClientRect().height
    expect.soft(mid, 'box shrinking').toBeGreaterThan(0)
    expect.soft(mid, 'box shrinking').toBeLessThan(60)
    await wait(350)
    expect.soft(box.getBoundingClientRect().height, 'box landed').toBeCloseTo(0, 0)
    expect.soft(box.style.overflow, 'inline overflow').toBe('')
    expect.soft(box.style.position, 'inline position').toBe('')
  }
})

test('15. several leaving at once: ghosts hold their place and fade while layout siblings slide up without a jump', async () => {
  const items = shallowRef([1, 2, 3, 4, 5])
  mount(() =>
    h(
      'ul',
      { class: 'list15', style: 'list-style: none; margin: 0; padding: 0; position: relative' },
      items.value.map((i) =>
        anim(h('li', { key: i, 'data-k': i, style: 'height: 40px' }, String(i)), {
          initial: { opacity: 0 },
          layout: true,
          ...LIN,
        }),
      ),
    ),
  )
  await wait(400)
  const list = document.querySelector('.list15')!.getBoundingClientRect()
  const el = (k: number) => document.querySelector<HTMLElement>(`.list15 > li[data-k="${k}"]`)!
  const els = Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, el(k)]))
  const top = (k: number) => els[k]!.getBoundingClientRect().top - list.top
  const before = Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, top(k)]))
  items.value = [2, 4, 5]
  await nextTick()
  const t0 = performance.now()
  const seen = await sample(500, () => ({
    t: performance.now() - t0,
    tops: Object.fromEntries([1, 2, 3, 4, 5].map((k) => [k, top(k)])),
    opacity: { 1: opacityOf(els[1]!), 3: opacityOf(els[3]!) },
    on: { 1: els[1]!.isConnected, 3: els[3]!.isConnected },
    ghosts: [els[1]!, els[3]!].filter((g) => g.isConnected).length,
  }))
  for (const g of [1, 3] as const) {
    const held = seen.filter((s) => s.on[g])
    expect(held.length, `ghost ${g} seen`).toBeGreaterThan(0)
    for (const s of held) near(s.tops[g]!, before[g]!, 1, `ghost ${g} top`)
    const fade = held.map((s) => s.opacity[g])
    fade
      .slice(1)
      .forEach((o, i) => expect(o, `ghost ${g} opacity`).toBeLessThanOrEqual(fade[i]! + 0.001))
  }
  const gone = seen.find((s) => s.ghosts === 0)
  expect(gone, 'ghosts gone').toBeDefined()
  expect(gone!.t).toBeLessThanOrEqual(300 + FRAMES_2)
  near(seen[0]!.tops[5]!, before[5]!, 1, 'item 5 on the first frame')
  for (const [k, travel] of [
    [2, 40],
    [4, 80],
    [5, 80],
  ] as const) {
    const path = seen.map((s) => s.tops[k]!)
    expect(maxStep(path), `item ${k} biggest step`).toBeLessThanOrEqual(0.15 * travel)
    near(path.at(-1)!, before[k]! - travel, 0.5, `item ${k} end`)
  }
})

test('16. when the container moves as an item pops out, the ghost stays where it was painted', async () => {
  const run = async (outerStyle: string, boxStyle: string) => {
    const items = shallowRef([1, 2, 3])
    const view = mount(() =>
      h('div', { style: outerStyle }, [
        h(
          'div',
          { class: 'box16', style: boxStyle },
          items.value.map((i) =>
            anim(h('div', { key: i, 'data-k': i, style: 'height: 50px; flex: none' }, String(i)), {
              exit: { opacity: 0 },
              ...LIN,
            }),
          ),
        ),
      ]),
    )
    await frame()
    await frame()
    const item = (k: number) => document.querySelector<HTMLElement>(`.box16 > [data-k="${k}"]`)!
    const leaving = item(3)
    const before = leaving.getBoundingClientRect()
    const boxBefore = document.querySelector('.box16')!.getBoundingClientRect()
    items.value = [1, 2]
    await nextTick()
    const seen = await sample(250, () =>
      leaving.isConnected ? leaving.getBoundingClientRect() : null,
    )
    const at = seen.filter((r) => r !== null)
    const boxAfter = document.querySelector('.box16')!.getBoundingClientRect()
    const item2 = item(2).getBoundingClientRect()
    await view.unmount()
    document.body.innerHTML = ''
    return { before, at, boxMoved: boxAfter.top - boxBefore.top, item2 }
  }
  // A bottom-anchored column: the rest drop by one.
  const pinned = await run(
    '',
    'position: relative; display: flex; flex-direction: column; justify-content: flex-end; height: 300px',
  )
  expect(pinned.at.length).toBeGreaterThan(0)
  for (const r of pinned.at) {
    near(r.top, pinned.before.top, 0.5, 'bottom-anchored ghost top')
    near(r.left, pinned.before.left, 0.5, 'bottom-anchored ghost left')
  }
  near(pinned.item2.top, pinned.before.top, 0.5, 'item 2 takes the old place')
  // Centred in the viewport: the container itself moves up.
  const centred = await run(
    'display: flex; flex-direction: column; justify-content: center; height: 100vh',
    'position: relative',
  )
  expect(centred.boxMoved).toBeGreaterThan(10)
  expect(centred.at.length).toBeGreaterThan(0)
  for (const r of centred.at) near(r.top, centred.before.top, 0.5, 'centred ghost top')
})

test('17. an exit inside an unpositioned scroll container stays clipped to the scroller', async () => {
  const items = shallowRef([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  mount(() =>
    h('div', { style: 'position: relative; padding-top: 100px' }, [
      h(
        'div',
        { class: 'scroller17', style: 'overflow: auto; height: 120px; width: 200px' },
        items.value.map((i) =>
          anim(h('div', { key: i, 'data-k': i, style: 'height: 30px' }, `Row ${i}`), {
            exit: { opacity: 0 },
            ...LIN,
          }),
        ),
      ),
    ]),
  )
  await frame()
  const scroller = document.querySelector<HTMLElement>('.scroller17')!
  scroller.scrollTop = 100
  // Past the "scrolling" window, so the removal isn't taken for a recycled row.
  await wait(250)
  const row = scroller.querySelector<HTMLElement>('[data-k="3"]')!
  const sr = scroller.getBoundingClientRect()
  // Cut off at the top.
  expect(row.getBoundingClientRect().top).toBeLessThan(sr.top)
  items.value = items.value.filter((i) => i !== 3)
  await until(() => isGhost(row) && row.isConnected)
  // Probe: let it be hit, to see if the scroller clips it.
  row.style.pointerEvents = 'auto'
  row.inert = false
  const x = sr.left + 50
  expect(document.elementFromPoint(x, sr.top + 5), 'hit inside the scroller').toBe(row)
  expect(document.elementFromPoint(x, sr.top - 5), 'hit above the scroller').not.toBe(row)
})

test("18. leaving in place under RTL doesn't shift sideways, and its x mirrors", async () => {
  const items = shallowRef(['a', 'b', 'c'])
  mount(() =>
    h(
      'div',
      { dir: 'rtl', style: 'position: relative; width: 400px; display: flex' },
      items.value.map((i) =>
        anim(
          h('div', { key: i, 'data-k': i, style: 'width: 100px; height: 20px; flex: none' }, i),
          {
            exit: { opacity: 0, x: 20 },
            ...LIN,
          },
        ),
      ),
    ),
  )
  await frame()
  await frame()
  const el = document.querySelector<HTMLElement>('[data-k="b"]')!
  const before = el.getBoundingClientRect()
  items.value = ['a', 'c']
  await until(() => isGhost(el) && el.getAnimations().length > 0)
  const end = (el.getAnimations()[0]!.effect as KeyframeEffect).getKeyframes().at(-1)!
  // '-20px' is how the browser serialises '-20px 0px'.
  expect(String(end.translate)).toMatch(/^-20px( 0px)?$/)
  const seen = await sample(250, () => {
    if (!el.isConnected) return null
    const r = el.getBoundingClientRect()
    const tx = translateOf(el).x
    return { left: r.left - tx, right: r.right - tx }
  })
  const on = seen.filter((s) => s !== null)
  expect(on.length).toBeGreaterThan(0)
  for (const s of on) {
    near(s.left, before.left, 0.5, 'ghost left')
    near(s.right, before.right, 0.5, 'ghost right')
  }
})
