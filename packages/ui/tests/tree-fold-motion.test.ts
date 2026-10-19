import '../src/style.css'
import { expect, test } from 'vitest'
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
// What's painted: each row cut by any clip-path on its blocks, and faded-out rows left out.
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
      const inset = style.clipPath.match(/^inset\(([^)]*)\)/)
      if (!inset || n === el) continue
      const box = n.getBoundingClientRect()
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 350))

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

test('a second click mid-way reverses from where the folder is, without a jump', async () => {
  renderCentred()
  await settle()
  const block = () => row('src').nextElementSibling as HTMLElement | null
  const pkgTop = () => row('package.json').getBoundingClientRect().top
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await new Promise((resolve) => setTimeout(resolve, 90))
  const pkgAtClick = pkgTop()
  const opacityAtClick = Number(getComputedStyle(block()!).opacity)
  expect(opacityAtClick).toBeLessThan(1)
  const samples: { pkg: number; opacity: number }[] = []
  const done = new Promise<void>((resolve) => {
    const t0 = performance.now()
    const sample = () => {
      const el = block()
      samples.push({ pkg: pkgTop(), opacity: el ? Number(getComputedStyle(el).opacity) : 0 })
      if (performance.now() - t0 < 400) requestAnimationFrame(sample)
      else resolve()
    }
    requestAnimationFrame(sample)
  })
  row('src').querySelector<HTMLElement>('.ui-tree-chevron')!.click()
  await done
  // Closing from part-way open: the row below only heads back up, and the rows only fade out.
  expect(Math.max(...samples.map((s) => s.pkg))).toBeLessThanOrEqual(pkgAtClick + 1)
  expect(Math.max(...samples.map((s) => s.opacity))).toBeLessThanOrEqual(opacityAtClick + 0.02)
})
