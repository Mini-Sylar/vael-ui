// A closed Tour mounts neither its callout's nor its spotlight's Teleport, and keys bind only while open.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, nextTick, shallowRef } from 'vue'
import Tour from '../src/components/Tour/Tour.vue'

// A Teleport leaves two empty text nodes in its target.
const bodyAnchors = () =>
  [...document.body.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).length

function target() {
  const el = document.createElement('button')
  el.id = 'tour-target'
  el.textContent = 'Target'
  document.body.append(el)
  return el
}
const steps = [{ target: '#tour-target', title: 'First' }]

test('a closed tour mounts no Teleport; forceMount still does', async () => {
  const el = target()
  try {
    const before = bodyAnchors()
    const screen = await render(() => h(Tour as never, { steps }))
    await nextTick()
    expect(bodyAnchors()).toBe(before)
    screen.unmount()
    await render(() => h(Tour as never, { steps, forceMount: true }))
    expect(document.querySelector('.ui-tour-spotlight')).not.toBeNull()
  } finally {
    el.remove()
  }
})

test('the spotlight fades in on the first open and the ones after', async () => {
  const el = target()
  try {
    const open = shallowRef(false)
    await render(
      () =>
        h(Tour as never, {
          steps,
          open: open.value,
          'onUpdate:open': (v: boolean) => (open.value = v),
        }),
      { global: { stubs: { transition: false } } },
    )
    for (let round = 0; round < 2; round++) {
      open.value = true
      await vi.waitFor(() =>
        expect(
          document
            .querySelector('.ui-tour-spotlight')
            ?.classList.contains('ui-tour-spotlight-enter-active'),
        ).toBe(true),
      )
      open.value = false
      await vi.waitFor(() => expect(document.querySelector('.ui-tour-spotlight')).toBeNull())
    }
  } finally {
    el.remove()
  }
})

test('a tour opened at mount shows its spotlight at once, as before', async () => {
  const el = target()
  try {
    await render(() => h(Tour as never, { steps, open: true }), {
      global: { stubs: { transition: false } },
    })
    const spotlight = await vi.waitFor(() => document.querySelector('.ui-tour-spotlight')!)
    expect(spotlight.classList.contains('ui-tour-spotlight-enter-active')).toBe(false)
  } finally {
    el.remove()
  }
})

test('a closed tour sets up a fixed number of watchers', async () => {
  const tour = shallowRef<{ $: { scope: { deps?: { nextDep?: unknown } } } }>()
  await render(() => h(Tour as never, { ref: tour, steps }))
  await nextTick()
  let effects = 0
  for (let link = tour.value!.$.scope.deps; link; link = link.nextDep as typeof link) effects++
  // Was 28, with a watcher for each of its three key listeners.
  expect(effects).toBeLessThanOrEqual(26)
})
