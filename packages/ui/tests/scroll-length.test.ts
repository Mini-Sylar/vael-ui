// useScrollLength: how far a container (or the page) can scroll, in px, kept current.
import { expect, test, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
import { useScrollLength } from '../src/motion/useScrollProgress'

test('a container: its content past the box, and it follows the content growing', async () => {
  const box = document.createElement('div')
  box.style.cssText = 'height: 100px; width: 100px; overflow: auto'
  const content = document.createElement('div')
  content.style.cssText = 'height: 300px; width: 250px'
  box.append(content)
  document.body.append(box)
  const target = shallowRef<HTMLElement | null>(box)
  const scope = effectScope()
  const [y, x] = scope.run(() => [useScrollLength(target), useScrollLength(target, { axis: 'x' })])!
  await nextTick()
  expect(y.value).toBe(200)
  expect(x.value).toBe(150)
  content.style.height = '500px'
  await vi.waitFor(() => expect(y.value).toBe(400))
  scope.stop()
  box.remove()
})

test('rows added to a box that keeps its size are counted', async () => {
  const box = document.createElement('div')
  box.style.cssText = 'height: 100px; width: 100px; overflow: auto'
  const row = () => Object.assign(document.createElement('div'), { style: 'height: 50px' })
  box.append(row(), row(), row())
  document.body.append(box)
  const scope = effectScope()
  const length = scope.run(() => useScrollLength(shallowRef(box)))!
  await nextTick()
  expect(length.value).toBe(50)
  await new Promise((resolve) => setTimeout(resolve, 100)) // let the observers settle first
  box.append(row(), row())
  await vi.waitFor(() => expect(length.value).toBe(150))
  scope.stop()
  box.remove()
})
