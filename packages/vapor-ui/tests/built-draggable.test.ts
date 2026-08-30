/**
 * Proves v-draggable specifically through the BUILT vapor-lib bundle, not
 * source. vTooltip/vScrollMask/vDraggable all need their function-form
 * (vXVapor) registered in generate-vapor.mjs's VAPOR_DIRECTIVE_ALIASES map —
 * a directive object works in VDOM but is not callable, so a missed
 * registration compiles fine and only throws at runtime in a real Vapor app
 * ("dir is not a function"). packages/ui/tests/draggable.test.ts imports
 * from source and cannot catch this; only a built-package test can.
 */
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import DraggableRoot from './fixtures/DraggableRoot.vue'

test('the built vapor-lib bundle applies v-draggable without throwing', async () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(DraggableRoot)
  app.mount(host)
  try {
    const list = host.querySelector<HTMLElement>('[data-testid="vapor-draggable-list"]')!
    expect(list.children.length).toBe(3)
    expect(host.querySelector('[data-testid="item-a"]')?.textContent).toBe('a')
  } finally {
    app.unmount()
  }
})
