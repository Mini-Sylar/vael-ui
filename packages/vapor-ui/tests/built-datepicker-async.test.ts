// Vapor: DatePicker's lazily loaded calendar is a Vapor async component, and its ref reaches it.
import { expect, test, vi } from 'vitest'
import { createVaporApp } from 'vue'
import DatePickerVaporRoot from './fixtures/DatePickerVaporRoot.vue'

test('Vapor: ArrowDown opens the DatePicker panel and focuses the picked day, without warnings', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const problems: unknown[] = []
  const app = createVaporApp(DatePickerVaporRoot)
  app.config.errorHandler = (error) => void problems.push(error)
  app.config.warnHandler = (message) => void problems.push(message)
  const rejected = (event: PromiseRejectionEvent) => {
    event.preventDefault()
    problems.push(event.reason)
  }
  addEventListener('unhandledrejection', rejected)
  app.mount(host)
  try {
    const input = host.querySelector('input')!
    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('14'), {
      timeout: 3000,
    })
    expect(problems.map(String)).toEqual([])
  } finally {
    removeEventListener('unhandledrejection', rejected)
    app.unmount()
    host.remove()
  }
})
