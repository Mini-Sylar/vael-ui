// useScrollProgress: rows added to a box that keeps its size move its end.
import { expect, test, vi } from 'vitest'
import { effectScope, nextTick, shallowRef } from 'vue'
import { useScrollProgress } from '../src/motion/useScrollProgress'

test('rows appended to a fixed-size container update the progress', async () => {
  const box = document.createElement('div')
  box.style.cssText = 'height: 100px; width: 100px; overflow: auto'
  const row = () => Object.assign(document.createElement('div'), { style: 'height: 50px' })
  box.append(row(), row(), row())
  document.body.append(box)
  box.scrollTop = 50
  const scope = effectScope()
  const progress = scope.run(() => useScrollProgress(undefined, { container: shallowRef(box) }))!
  await nextTick()
  expect(progress.value).toBe(1)
  await new Promise((resolve) => setTimeout(resolve, 100))
  box.append(row(), row())
  await vi.waitFor(() => expect(progress.value).toBeCloseTo(1 / 3, 3))
  scope.stop()
  box.remove()
})
