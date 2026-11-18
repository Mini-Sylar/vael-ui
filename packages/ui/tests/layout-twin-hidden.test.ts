// A shared element's old node that is still in the page (a closing dialog's panel keeps it) is
// hidden the moment its twin arrives, so the flight is the only copy on screen.
import { afterEach, expect, test } from 'vitest'
import { arriveLayout, rememberLayout } from '../src/motion/layout'

afterEach(() => document.body.replaceChildren())

const box = (w: number, h: number) => {
  const el = document.createElement('div')
  el.style.cssText = `width: ${w}px; height: ${h}px`
  document.body.append(el)
  return el
}

test('the old node that is still in the page is hidden while its twin flies in', async () => {
  const old = box(300, 200)
  rememberLayout(old, 'photo')
  // It left, but the page still holds the node.
  expect(old.isConnected).toBe(true)
  const twin = box(60, 40)
  arriveLayout(twin, 'photo', { duration: 300 }, () => {})
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(old.style.visibility).toBe('hidden')
  expect(twin.style.visibility).toBe('')
  twin.getAnimations().forEach((a) => a.cancel())
})

test('with nothing arriving it is left alone', async () => {
  const old = box(300, 200)
  rememberLayout(old, 'lonely')
  await new Promise((resolve) => setTimeout(resolve, 50))
  expect(old.style.visibility).toBe('')
})
