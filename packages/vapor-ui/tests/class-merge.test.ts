/**
 * REGRESSION SENTINEL — a component whose root wraps its content in
 * <Transition> used to auto-forward its own received attrs (including
 * `class`) onto VaporTransition as a single-root child, gated on
 * VaporTransition's own `inheritAttrs` (which it never opts out of) — NOT on
 * the component's own `inheritAttrs: false`. VaporTransition then applied
 * those raw attrs directly onto its resolved child via a single-source
 * `setDynamicProps(el, [attrs])`, unconditionally overwriting whatever the
 * child's own template computed for `class`. Filed as vuejs/core#15274,
 * fixed by vuejs/core#15275 ("compiler-vapor: propagate component root
 * through Transition") in vue 3.6.0-rc.4.
 *
 * Every component correctly merges an external class via
 * `inheritAttrs: false` + `useAttrs()` + `v-bind="attrs"` on its root — see
 * Button.vue's own established pattern, applied to 36 components that were
 * missing it. If this test ever starts failing again, the fix regressed
 * upstream.
 */
import { expect, test } from 'vitest'
import { createVaporApp } from 'vue'
import ClassMergeButtonRoot from './fixtures/ClassMergeButtonRoot.vue'
import ClassMergeMessageRoot from './fixtures/ClassMergeMessageRoot.vue'

test('external class merges correctly (no Transition in the component root)', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ClassMergeButtonRoot)
  app.mount(host)
  try {
    const el = host.querySelector<HTMLElement>('[data-testid="target"]')!
    expect(el.className).toContain('ui-button')
    expect(el.className).toContain('external-class')
  } finally {
    app.unmount()
  }
})

test('external class merges correctly through a Transition-wrapped root', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ClassMergeMessageRoot)
  app.mount(host)
  try {
    const el = host.querySelector<HTMLElement>('[data-testid="target"]')!
    expect(el.className).toContain('ui-message')
    expect(el.className).toContain('ui-message--warning')
    expect(el.className).toContain('external-class')
  } finally {
    app.unmount()
  }
})
