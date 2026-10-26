// Vapor: list components with their own motion render their items, with no VDOM TransitionGroup.
import { expect, test, vi } from 'vitest'
import { createVaporApp, nextTick } from 'vue'
import MotionListsVaporRoot from './fixtures/MotionListsVaporRoot.vue'

test('Vapor: Breadcrumb and AvatarGroup with a motion of their own render, and update', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const warnings: string[] = []
  const warn = vi
    .spyOn(console, 'warn')
    .mockImplementation((...args) => void warnings.push(args.join(' ')))
  const app = createVaporApp(MotionListsVaporRoot)
  app.config.warnHandler = (message) => void warnings.push(message)
  const root = app.mount(host) as unknown as { crumbs: { label: string }[]; people: string[] }
  try {
    await nextTick()
    expect(host.querySelectorAll('.ui-breadcrumb-item')).toHaveLength(2)
    expect(host.querySelectorAll('.ui-avatar-group .ui-avatar')).toHaveLength(2)
    root.crumbs = [{ label: 'Reports' }, { label: 'Month' }, { label: 'Sites' }]
    root.people = ['Ama Mensah']
    await vi.waitFor(() => {
      expect(host.querySelectorAll('.ui-breadcrumb-item')).toHaveLength(3)
      expect(host.querySelectorAll('.ui-avatar-group .ui-avatar')).toHaveLength(1)
    })
    expect(warnings).toEqual([])
  } finally {
    warn.mockRestore()
    app.unmount()
    host.remove()
  }
})
