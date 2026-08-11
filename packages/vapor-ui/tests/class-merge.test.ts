/**
 * REGRESSION SENTINEL — Vapor-only bug: a component whose root wraps its
 * content in <Transition> auto-forwards its own received attrs (including
 * `class`) onto VaporTransition as a single-root child, gated on
 * VaporTransition's own `inheritAttrs` (which it never opts out of) — NOT on
 * the component's own `inheritAttrs: false`. VaporTransition then applies
 * those raw attrs directly onto its resolved child via a single-source
 * `setDynamicProps(el, [attrs])`, unconditionally overwriting whatever the
 * child's own template computed for `class`. No in-component workaround
 * exists (tried: implicit fallthrough, explicit v-bind, array :class,
 * isolated computed — all fail identically). Traced against vue 3.6.0-rc.3
 * runtime-vapor source (createComponent's isSingleRoot check, ~line 2950;
 * handleSetupResult's fallthrough trigger, ~line 3457; applyFallthroughProps
 * -> setDynamicProps, ~line 3073).
 *
 * Every other component (no <Transition> in its own template) correctly
 * merges an external class via `inheritAttrs: false` + `useAttrs()` +
 * `v-bind="attrs"` on its root — see Button.vue's own established pattern,
 * applied to 36 components that were missing it.
 *
 * If the "Message" test below ever starts passing, the upstream Vue/Vapor
 * bug got fixed — the `v-bind="attrs"` pattern stays correct either way, so
 * nothing needs to change in the library itself, just this comment.
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

test('KNOWN BROKEN (upstream vue/vapor): external class does not merge through a Transition-wrapped root', () => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createVaporApp(ClassMergeMessageRoot)
  app.mount(host)
  try {
    const el = host.querySelector<HTMLElement>('[data-testid="target"]')!
    expect(el.className).toBe('external-class') // should be 'ui-message ui-message--warning external-class'
  } finally {
    app.unmount()
  }
})
