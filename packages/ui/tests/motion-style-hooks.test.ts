// Hooks in a ConfigProvider style: every Dialog inside runs them, unless its own `motion` says otherwise.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import ConfigProvider from '../src/components/ConfigProvider/ConfigProvider.vue'
import Dialog from '../src/components/Dialog/Dialog.vue'

const global = { stubs: { transition: false } }

test('a style hook runs on every Dialog inside, and a Dialog of its own motion keeps its own', async () => {
  const calls: string[] = []
  const open = shallowRef(false)
  const style = {
    version: 1 as const,
    dialog: {
      enter: ({ panel }: { panel: HTMLElement }) => {
        calls.push(`style:${panel.className.includes('ui-dialog-panel')}`)
        return panel.animate([{ opacity: 0 }, { opacity: 1 }], 120)
      },
      leave: ({ panel }: { panel: HTMLElement }) => {
        calls.push('style:leave')
        return panel.animate([{ opacity: 1 }, { opacity: 0 }], 200)
      },
    },
  }
  render(
    () =>
      h(ConfigProvider as never, { motion: style }, () => [
        h(Dialog as never, { open: open.value, title: 'Styled' }),
        h(Dialog as never, {
          open: open.value,
          title: 'Own',
          motion: { enter: () => void calls.push('own') },
        }),
      ]),
    { global },
  )
  open.value = true
  await vi.waitFor(() => expect(calls.sort()).toEqual(['own', 'style:true']))
  const panels = [...document.querySelectorAll<HTMLElement>('.ui-dialog-panel')]
  open.value = false
  await vi.waitFor(() => expect(calls).toContain('style:leave'))
  // Held for the style's leave.
  expect(panels.some((p) => p.isConnected)).toBe(true)
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-panel')).toBeNull(), {
    timeout: 1500,
  })
})

test('engine: a style hands every value to your library, in vael-ui names, and waits for it', async () => {
  const seen: { from: Record<string, unknown>; to: Record<string, unknown> }[] = []
  let stopped = 0
  const engine = (
    el: HTMLElement,
    from: Record<string, string | number>,
    to: Record<string, string | number>,
    timing: { duration: number },
  ) => {
    seen.push({ from, to })
    const run = el.animate(
      [{ opacity: String(from.opacity ?? 1) }, { opacity: String(to.opacity ?? 1) }],
      { duration: timing.duration * 1000 + 200, fill: 'forwards' },
    )
    // What a library returns: awaitable, and stoppable.
    return Object.assign(
      run.finished.then(
        () => {},
        () => {},
      ),
      { stop: () => (stopped++, run.cancel()) },
    )
  }
  const open = shallowRef(false)
  render(
    () =>
      h(ConfigProvider as never, { motion: { version: 1, engine } }, () =>
        h(Dialog as never, { open: open.value, title: 'Engine' }),
      ),
    { global },
  )
  open.value = true
  await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0))
  const panelIn = seen.find((s) => 'scale' in s.from)!
  expect(panelIn.from).toMatchObject({ opacity: 0 })
  expect(panelIn.to).toMatchObject({ scale: 1 })
  // Closed while it opens: what the engine started is stopped.
  open.value = false
  await vi.waitFor(() => expect(stopped).toBeGreaterThan(0))
  await vi.waitFor(() => expect(seen.some((s) => s.to.opacity === 0)).toBe(true))
  await vi.waitFor(() => expect(document.querySelector('.ui-dialog-panel')).toBeNull(), {
    timeout: 2000,
  })
})
