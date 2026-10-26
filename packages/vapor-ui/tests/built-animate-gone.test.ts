// Vapor: removing an element mustn't evaluate its v-animate value again, where it may no longer hold.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import AnimateGoneVaporRoot from './fixtures/AnimateGoneVaporRoot.vue'

test('Vapor: clearing what a v-if guards removes the element without re-reading its v-animate value, or warnings', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const errors: unknown[] = []
  const app = createVaporApp(AnimateGoneVaporRoot)
  app.config.errorHandler = (error) => void errors.push(error)
  app.config.warnHandler = (message) => void errors.push(message)
  // Reactivity warns straight to the console, past warnHandler.
  const warn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => void errors.push(args.join(' ')))
  const root = app.mount(host) as unknown as { selected: { id: number; name: string } | null }
  try {
    // Shown after mount, as a picked card's detail is.
    root.selected = { id: 1, name: 'Harbor' }
    await nextTick()
    await new Promise(requestAnimationFrame)
    expect(host.querySelector('.detail')).not.toBeNull()
    root.selected = null
    await nextTick()
    await new Promise(requestAnimationFrame)
    expect(errors).toEqual([])
    expect(host.querySelector('.detail')).toBeNull()
  } finally {
    warn.mockRestore()
    app.unmount()
    host.remove()
  }
})
