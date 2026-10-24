import '../src/style.css'
import { expect, test } from 'vitest'

const sheets = import.meta.glob('../src/components/**/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Rules that make a region scroll vertically.
function scrollRegions(css: string): { selector: string; body: string }[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /\boverflow(?:-y)?\s*:\s*(?:auto|scroll)\b/.test(body!))
    .map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }))
}

const slim = (body: string) => /scrollbar-width\s*:\s*(?:thin|none)/.test(body)

test('every region vael-ui scrolls gets the slim scrollbar', () => {
  const regions = Object.values(sheets).flatMap(scrollRegions)
  const all = Object.values(sheets).join('\n')
  const missing = regions
    .filter(({ body }) => !slim(body))
    // A modifier (`.x--vertical`) is covered when its element's own rule (`.x`) sets it.
    .filter(({ selector }) => {
      const base = selector.match(/(\.[\w-]+?)--[\w-]+$/)?.[1]
      return !base || !new RegExp(`\\${base}\\s*\\{[^}]*scrollbar-width\\s*:\\s*thin`).test(all)
    })
    .map(({ selector }) => selector)
  expect(missing).toEqual([])
})

test('the thumb follows the theme and --ui-scroll-thumb recolors it', () => {
  const el = document.createElement('div')
  el.className = 'ui-dialog-body'
  document.body.append(el)
  try {
    const thumb = () => getComputedStyle(el).scrollbarColor.split(' rgba(0, 0, 0, 0)')[0]
    const themed = thumb()
    expect(getComputedStyle(el).scrollbarWidth).toBe('thin')
    el.style.setProperty('--ui-scroll-thumb', 'rgb(255, 0, 0)')
    expect(thumb()).toBe('rgb(255, 0, 0)')
    expect(themed).not.toBe('rgb(255, 0, 0)')
  } finally {
    el.remove()
  }
})
