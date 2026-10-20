import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick } from 'vue'
import Tree from '../src/components/Tree/Tree.vue'

const items = [
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'components',
        children: [
          { label: 'Button.vue', value: 'button' },
          { label: 'Input.vue', value: 'input' },
        ],
      },
      { label: 'index.ts', value: 'index' },
    ],
  },
  { label: 'package.json', value: 'package' },
  { label: 'README.md', value: 'readme' },
]

// Centred, so opening a folder moves every row, the folder's own included: the layout where an
// opening block used to land on its folder and a closing one lost its first rows.
function renderCentred() {
  render(
    () =>
      h('div', { style: 'display:flex;align-items:center;block-size:24rem' }, [
        h(Tree as never, { items, filterable: false }),
      ]),
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
}

const row = (label: string) =>
  [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].find(
    (el) => el.querySelector('.ui-tree-label')?.textContent?.trim() === label,
  )!

interface Drawn {
  label: string
  top: number
  bottom: number
}
// What's painted: each row cut by any clip-path or clipped overflow on its blocks, and faded-out rows
// left out.
function drawnRows(): Drawn[] {
  const tree = document.querySelector<HTMLElement>('[role="tree"]')!
  const out: Drawn[] = []
  for (const el of tree.querySelectorAll<HTMLElement>('[role="treeitem"]')) {
    const rect = el.getBoundingClientRect()
    let { top, bottom } = rect
    let opacity = 1
    for (let n: HTMLElement | null = el; n && n !== tree; n = n.parentElement) {
      const style = getComputedStyle(n)
      opacity *= Number(style.opacity)
      if (n === el) continue
      const box = n.getBoundingClientRect()
      if (style.overflowY !== 'visible') {
        top = Math.max(top, box.top)
        bottom = Math.min(bottom, box.bottom)
      }
      const inset = style.clipPath.match(/^inset\(([^)]*)\)/)
      if (!inset) continue
      const [t, , b = t] = inset[1]!
        .split(/\s+/)
        .map((v) => (v.endsWith('%') ? (parseFloat(v) * box.height) / 100 : parseFloat(v)))
      top = Math.max(top, box.top + t!)
      bottom = Math.min(bottom, box.bottom - b!)
    }
    const label = el.querySelector('.ui-tree-label')?.textContent?.trim() ?? ''
    if (opacity > 0.02 && bottom - top > 1) out.push({ label, top, bottom })
  }
  return out
}

// The first frame is the one before the click, so a row that drops out right away still counts.
async function framesAfterClick(label: string): Promise<Drawn[][]> {
  const frames: Drawn[][] = [drawnRows()]
  const done = new Promise<void>((resolve) => {
    const t0 = performance.now()
    const sample = () => {
      frames.push(drawnRows())
      if (performance.now() - t0 < 450) requestAnimationFrame(sample)
      else resolve()
    }
    requestAnimationFrame(sample)
  })
  row(label).querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await done
  return frames
}

function overlaps(frames: Drawn[][]): string[] {
  const found: string[] = []
  frames.forEach((rows, i) => {
    for (let a = 0; a < rows.length; a++)
      for (let b = a + 1; b < rows.length; b++) {
        const shared =
          Math.min(rows[a]!.bottom, rows[b]!.bottom) - Math.max(rows[a]!.top, rows[b]!.top)
        if (shared > 1) found.push(`frame ${i}: ${rows[a]!.label} × ${rows[b]!.label}`)
      }
  })
  return found
}

// A row that's painted, then isn't, then is again mid-animation was pushed out of its block.
function flickers(frames: Drawn[][]): string[] {
  const labels = new Set(frames.flat().map((r) => r.label))
  const found: string[] = []
  for (const label of labels) {
    const seen = frames.map((rows) => rows.some((r) => r.label === label))
    const first = seen.indexOf(true)
    const last = seen.lastIndexOf(true)
    if (seen.slice(first, last + 1).includes(false)) found.push(label)
  }
  return found
}

// After the click has rendered, until no block is folding.
async function settle() {
  await nextTick()
  await vi.waitFor(() => expect(document.querySelector('[data-folding]')).toBeNull(), {
    timeout: 2000,
  })
}

test('opening and closing a folder never paints one row over another', async () => {
  renderCentred()
  await settle()
  expect(overlaps(await framesAfterClick('src'))).toEqual([])
  await settle()
  expect(overlaps(await framesAfterClick('components'))).toEqual([])
  await settle()
  expect(overlaps(await framesAfterClick('components'))).toEqual([])
  await settle()
  expect(overlaps(await framesAfterClick('src'))).toEqual([])
})

test('closing a folder with an open folder inside keeps every row in place until covered', async () => {
  renderCentred()
  await settle()
  await framesAfterClick('src')
  await settle()
  await framesAfterClick('components')
  await settle()
  const frames = await framesAfterClick('src')
  expect(overlaps(frames)).toEqual([])
  expect(flickers(frames)).toEqual([])
})

test('arrow keys open and close a folder at once', async () => {
  renderCentred()
  await settle()
  // Straight to the row: files run side by side, and another one can take the page's focus.
  const press = async (key: string) => {
    row('src').focus()
    row('src').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    await nextTick()
  }
  await press('ArrowRight')
  expect(row('components')).toBeDefined()
  const still = () => ({
    sliding: [...document.querySelectorAll<HTMLElement>('[role="treeitem"]')].filter(
      (el) => el.style.transform,
    ).length,
    fading: [...document.querySelectorAll<HTMLElement>('.ui-tree-rows')].filter(
      (el) => el.getClientRects().length > 0 && Number(getComputedStyle(el).opacity) < 1,
    ).length,
  })
  expect(still()).toEqual({ sliding: 0, fading: 0 })
  await press('ArrowLeft')
  expect(still()).toEqual({ sliding: 0, fading: 0 })
  expect(drawnRows().map((r) => r.label)).toEqual(['src', 'package.json', 'README.md'])
})

test('a second click mid-way carries the fold on from where it is, with no jump', async () => {
  renderCentred()
  await settle()
  const block = () => row('src').nextElementSibling as HTMLElement | null
  const pkgTop = () => row('package.json').getBoundingClientRect().top
  // One plain open: its biggest single-frame move is the yardstick.
  const plain: number[] = [pkgTop()]
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  for (let i = 0; i < 24; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    plain.push(pkgTop())
  }
  const biggest = Math.max(...plain.slice(1).map((top, i) => Math.abs(top - plain[i]!)))
  await settle()
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()

  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await new Promise((resolve) => setTimeout(resolve, 70))
  expect(Number(getComputedStyle(block()!).opacity)).toBeLessThan(1)
  const tops = [pkgTop()]
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  for (let i = 0; i < 40; i++) {
    await new Promise((resolve) => requestAnimationFrame(resolve))
    tops.push(pkgTop())
  }
  // It keeps its speed through the turn (so it may travel a little further first), never jumps,
  // and ends shut with the block gone.
  const steps = tops.slice(1).map((top, i) => Math.abs(top - tops[i]!))
  expect(Math.max(...steps), `steps ${steps.map(Math.round).join(',')}`).toBeLessThanOrEqual(
    biggest + 2,
  )
  expect(tops.at(-1)).toBeCloseTo(plain[0]!, 0)
  expect(block()?.classList.contains('ui-tree-rows') ?? false).toBe(false)
})

// gps-cmms-app's sidebar: a tall day with an hour open inside, in a scroll box. 0.4.8 slid the rows
// below with transform while clipping the folder, and the two drifted apart on a folder this tall.
test('a tall folder with a subfolder open: the row below rides its edge every frame, then settles', async () => {
  const hours = ['7 AM', '6 AM', '5 AM', '4 AM', '3 AM'].map((label, i) => ({
    label,
    value: `h${i}`,
    children: [
      { label: `Thread ${i}a`, value: `t${i}a` },
      { label: `Thread ${i}b`, value: `t${i}b` },
    ],
  }))
  const days = [
    { label: 'Wed, Sep 30', value: 'sep30', children: hours },
    { label: 'Mon, Sep 28', value: 'sep28', children: [{ label: '1 PM', value: 'pm1' }] },
  ]
  render(
    () =>
      h('div', { style: 'max-block-size:18rem;overflow-y:auto' }, [
        h(Tree as never, { items: days, filterable: false }),
      ]),
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  await settle()
  row('Wed, Sep 30').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()
  row('6 AM').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()
  row('Wed, Sep 30').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()

  for (const phase of ['open', 'close']) {
    row('Wed, Sep 30').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
    const tops: number[] = []
    const gaps: number[] = []
    for (let i = 0; i < 24; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const below = row('Mon, Sep 28').getBoundingClientRect().top
      tops.push(below)
      const block = row('Wed, Sep 30').nextElementSibling as HTMLElement | null
      if (block?.classList.contains('ui-tree-rows')) {
        gaps.push(Math.round(below - block.getBoundingClientRect().bottom))
      }
    }
    // The next row sits right under the block's drawn edge on every frame, never ahead or behind.
    for (const gap of gaps) expect(Math.abs(gap - 1), `${phase}: gap ${gap}`).toBeLessThanOrEqual(1)
    // One run in one direction, and it ends where it settles: no jump on the last frames.
    const steps = tops.slice(1).map((top, i) => top - tops[i]!)
    const sign = phase === 'open' ? 1 : -1
    for (const step of steps)
      expect(step * sign, `${phase}: ${steps.join(',')}`).toBeGreaterThanOrEqual(-1)
    const lastMove = steps.findLastIndex((step) => Math.abs(step) > 1)
    expect(Math.abs(steps[lastMove] ?? 0), `${phase}: ${steps.join(',')}`).toBeLessThan(
      Math.abs(Math.max(...steps.map(Math.abs))),
    )
    await settle()
  }
})

// Spam-clicking a folder: every click reverses from where it is, so nothing snaps open or shut.
test('clicking a tall folder over and over never makes the rows jump', async () => {
  const hours = ['7 AM', '6 AM', '5 AM', '4 AM', '3 AM'].map((label, i) => ({
    label,
    value: `h${i}`,
    children: [
      { label: `Thread ${i}a`, value: `t${i}a` },
      { label: `Thread ${i}b`, value: `t${i}b` },
    ],
  }))
  const days = [
    { label: 'Wed, Sep 30', value: 'sep30', children: hours },
    { label: 'Mon, Sep 28', value: 'sep28', children: [{ label: '1 PM', value: 'pm1' }] },
  ]
  render(
    () =>
      h('div', { style: 'max-block-size:18rem;overflow-y:auto' }, [
        h(Tree as never, { items: days, filterable: false }),
      ]),
    { global: { stubs: { transition: false, 'transition-group': false } } },
  )
  const chevron = () => row('Wed, Sep 30').querySelector<HTMLElement>('.ui-tree-chevron')!
  const below = () => row('Mon, Sep 28').getBoundingClientRect().top
  await settle()
  chevron().click()
  await settle()
  row('6 AM').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()
  chevron().click()
  await settle()

  // The biggest single-frame move in one plain open is the yardstick.
  async function trace(clickEvery: number, clicks: number): Promise<number[]> {
    const tops = [below()]
    let clicked = 0
    let last = -Infinity
    const t0 = performance.now()
    while (performance.now() - t0 < clickEvery * clicks + 400) {
      if (clicked < clicks && performance.now() - last >= clickEvery) {
        chevron().click()
        clicked++
        last = performance.now()
      }
      await new Promise((resolve) => requestAnimationFrame(resolve))
      tops.push(below())
    }
    return tops.slice(1).map((top, i) => Math.abs(top - tops[i]!))
  }
  const plain = Math.max(...(await trace(1000, 1)))
  await settle()
  chevron().click()
  await settle()
  const spam = await trace(60, 6)
  expect(Math.max(...spam), `steps ${spam.map(Math.round).join(',')}`).toBeLessThanOrEqual(
    plain + 2,
  )
})

test('a folder lets go of its pinned height where it already is, so the rows below never hop at the end', async () => {
  renderCentred()
  await settle()
  const heights: number[] = []
  const watchPin = new MutationObserver((records) => {
    for (const record of records) {
      const el = record.target as HTMLElement
      if (el.classList.contains('ui-tree-rows') && el.style.blockSize) {
        heights.push(Number.parseFloat(el.style.blockSize))
      }
    }
  })
  watchPin.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] })
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await settle()
  watchPin.disconnect()
  // The block that just opened: the one holding src's first child.
  const block = row('components').closest<HTMLElement>('.ui-tree-rows')!
  const released = block.getBoundingClientRect().height
  expect(heights.length).toBeGreaterThan(3)
  // At half a pixel short, letting go was a visible hop.
  expect(Math.abs(released - heights.at(-1)!)).toBeLessThan(0.1)
})
