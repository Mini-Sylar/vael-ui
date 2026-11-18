// A shared element that would be clipped on its way (a card with overflow) flies as a copy in the
// top layer, homes in on the real one, and hands over to it when it lands.
import { afterEach, expect, test } from 'vitest'
import { arriveLayout, rememberLayout } from '../src/motion/layout'

afterEach(() => document.body.replaceChildren())

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function scene(clip: string) {
  const holder = document.createElement('div')
  holder.style.cssText = `position: absolute; left: 400px; top: 300px; width: 200px; height: 120px; ${clip}`
  const big = document.createElement('div')
  big.style.cssText = 'position: fixed; left: 20px; top: 20px; width: 360px; height: 240px'
  const thumb = document.createElement('div')
  thumb.id = 'thumb'
  thumb.style.cssText = 'width: 80px; height: 50px; background: tomato; border: 2px solid navy'
  holder.append(thumb)
  document.body.append(big, holder)
  return { big, thumb }
}

test('inside a clipping card it flies in the top layer, and lands on the real element', async () => {
  const { big, thumb } = scene('overflow: hidden')
  rememberLayout(big, 'photo')
  arriveLayout(thumb, 'photo', { duration: 600, easing: 'linear' }, () => {})
  await wait(30)
  const copy = document.querySelector<HTMLElement>('[popover]')!
  expect(copy).toBeTruthy()
  expect(copy.matches(':popover-open')).toBe(true)
  // Hidden from assistive tech and the pointer, and the real one waits unseen.
  expect(copy.getAttribute('aria-hidden')).toBe('true')
  expect(copy.hasAttribute('id')).toBe(false)
  expect(thumb.style.visibility).toBe('hidden')
  // It is bigger than the card holding the thumb: nothing clips it.
  expect(copy.getBoundingClientRect().width).toBeGreaterThan(200)
  await wait(700)
  expect(document.querySelector('[popover]')).toBeNull()
  expect(thumb.style.visibility).toBe('')
})

test('with nothing to clip it flies in place, with no copy', async () => {
  const { big, thumb } = scene('overflow: visible')
  rememberLayout(big, 'free')
  arriveLayout(thumb, 'free', { duration: 600 }, () => {})
  await wait(120)
  expect(document.querySelector('[popover]')).toBeNull()
  expect(thumb.getAnimations().length).toBeGreaterThan(0)
  thumb.getAnimations().forEach((run) => run.cancel())
})

test('it lands on a target that is still moving', async () => {
  const { big, thumb } = scene('overflow: hidden')
  rememberLayout(big, 'moving')
  arriveLayout(thumb, 'moving', { duration: 400 }, () => {})
  // The holder slides sideways while the copy flies.
  const holder = thumb.parentElement!
  holder.animate([{ translate: '0 0' }, { translate: '300px 0' }], {
    duration: 400,
    fill: 'forwards',
  })
  await wait(120)
  const copy = document.querySelector<HTMLElement>('[popover]')!
  const real = thumb.getBoundingClientRect()
  await wait(500)
  // Where it landed is where the real one ended up, not where it was when the flight began.
  expect(thumb.getBoundingClientRect().left).toBeGreaterThan(real.left + 100)
  expect(document.querySelector('[popover]')).toBeNull()
  expect(copy.isConnected).toBe(false)
})

test('a turned card flies at its own size and turns as it goes', async () => {
  const { big, thumb } = scene('overflow: visible')
  big.style.rotate = '20deg'
  rememberLayout(big, 'turned')
  arriveLayout(thumb, 'turned', { duration: 600, easing: 'linear' }, () => {})
  await wait(60)
  const copy = document.querySelector<HTMLElement>('[popover]')!
  // Not clipped by anything, but turned: a copy flies, so its box isn't the stretched bounds.
  expect(copy).toBeTruthy()
  const angle = Number.parseFloat(copy.style.rotate)
  expect(angle).toBeGreaterThan(10)
  expect(angle).toBeLessThan(20)
  // Its own size (360 by 240) on the way out, not the bounds of the turned box.
  expect(Number.parseFloat(copy.style.width)).toBeLessThan(361)
  await wait(700)
  expect(document.querySelector('[popover]')).toBeNull()
})

test('a target behind a modal (inert page) lands out of sight, with no copy over the modal', async () => {
  const { big, thumb } = scene('overflow: hidden')
  thumb.parentElement!.inert = true
  rememberLayout(big, 'behind')
  arriveLayout(thumb, 'behind', { duration: 600 }, () => {})
  await wait(60)
  expect(document.querySelector('[popover]')).toBeNull()
  thumb.getAnimations().forEach((run) => run.cancel())
})
