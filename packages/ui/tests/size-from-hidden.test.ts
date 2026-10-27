// A size follower started while its element had no box (display: none, as a panel's is before it
// first opens) knew no size, and read that as 0: the first time it showed, its width grew from a
// sliver (a BottomSheet's first open). The first size it shows is where it starts.
import '../src/style.css'
import { expect, test } from 'vitest'
import { followSize } from '../src/motion/size'

function sizeWidths(el: HTMLElement): string[] {
  const widths: string[] = []
  for (const run of el.getAnimations())
    if (run.id === 'ui-size')
      for (const key of (run.effect as KeyframeEffect).getKeyframes())
        if (key.width !== undefined) widths.push(String(key.width))
  return widths
}

test('shown the first time, it starts at its size instead of growing from nothing', async () => {
  const host = document.createElement('div')
  host.style.display = 'none'
  const el = document.createElement('div')
  el.style.width = '300px'
  el.innerHTML = '<p>Pick one</p>'
  host.append(el)
  document.body.append(host)
  const follow = followSize(el, () => ({ duration: 300 }))
  host.style.display = 'block'
  el.append(Object.assign(document.createElement('p'), { textContent: 'Another' }))
  const seen: string[] = []
  for (let frame = 0; frame < 10; frame++) {
    await new Promise(requestAnimationFrame)
    seen.push(...sizeWidths(el))
  }
  follow.stop()
  host.remove()
  expect(seen).toEqual([])
})

test('an empty box that is there still grows as content arrives', async () => {
  const el = document.createElement('div')
  document.body.append(el)
  const follow = followSize(el, () => ({ duration: 300 }))
  el.append(Object.assign(document.createElement('p'), { textContent: 'First row' }))
  let grew = false
  for (let frame = 0; frame < 10 && !grew; frame++) {
    await new Promise(requestAnimationFrame)
    grew = el.getAnimations().some((run) => run.id === 'ui-size')
  }
  follow.stop()
  el.remove()
  expect(grew).toBe(true)
})
