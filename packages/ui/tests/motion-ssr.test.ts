// Base 9: server-rendered motion. Nothing replays on hydration; first appearances play from CSS.
import '../src/style.css'
import { TransitionGroup, createSSRApp, defineComponent, h, withDirectives } from 'vue'
import type { Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import type { SSRContext } from 'vue/server-renderer'
import { afterEach, expect, test, vi } from 'vitest'
import Dialog from '../src/components/Dialog/Dialog.vue'
import { vAnimate } from '../src/directives/vAnimate'
import { useMotion } from '../src/motion/useMotion'

const frame = () => new Promise(requestAnimationFrame)
let hosts: HTMLElement[] = []
afterEach(() => {
  for (const host of hosts) host.remove()
  hosts = []
})

/** Server-renders `root`, puts the HTML (and anything teleported) on the page, then hydrates it. */
async function serveAndHydrate(root: () => Component | ReturnType<typeof h>) {
  const ctx: SSRContext = {}
  const html = await renderToString(createSSRApp({ render: root }), ctx)
  const host = document.createElement('div')
  host.innerHTML = html
  const target = document.createElement('div')
  target.id = 'ssr-target'
  target.innerHTML = (ctx.teleports?.['#ssr-target'] ?? '') as string
  document.body.append(host, target)
  hosts.push(host, target)
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    createSSRApp({ render: root }).mount(host)
    await frame()
    const messages = [...warn.mock.calls, ...error.mock.calls].map((args) => args.join(' '))
    return { html, host, mismatches: messages.filter((m) => /hydrat|mismatch/i.test(m)) }
  } finally {
    warn.mockRestore()
    error.mockRestore()
  }
}

test('a dialog open on load hydrates as it is: no entrance replays over the server render', async () => {
  const { mismatches } = await serveAndHydrate(() =>
    h(Dialog as never, { open: true, title: 'On load', teleportTo: '#ssr-target' }),
  )
  expect(mismatches).toEqual([])
  const panel = document.querySelector<HTMLElement>('#ssr-target .ui-dialog-panel')!
  for (let i = 0; i < 3; i++) {
    expect(panel.getAnimations()).toHaveLength(0)
    expect(getComputedStyle(panel).opacity).toBe('1')
    await frame()
  }
})

const cards = () =>
  h('section', [
    withDirectives(h('p', { class: 'card', style: { color: 'rgb(1, 2, 3)' } }, 'Card'), [
      [vAnimate, { initial: { opacity: 0, y: 8 }, duration: 300, easing: 'ease-out' }],
    ]),
    withDirectives(h('p', { class: 'named' }, 'Named'), [
      [vAnimate, { initial: { opacity: 0 } }, 'rows'],
    ]),
    withDirectives(h('p', { class: 'later' }, 'Later'), [
      [vAnimate, { initial: { opacity: 0 }, when: 'visible' }],
    ]),
    withDirectives(h('p', { class: 'replays' }, 'Replays'), [
      [vAnimate, { initial: { opacity: 0 }, appear: false, replay: 1 }],
    ]),
  ])

test('server render: a v-animate appearance is CSS in the HTML; named targets and `when: visible` just show', async () => {
  const html = await renderToString(createSSRApp({ render: cards }))
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const card = doc.querySelector<HTMLElement>('.card')!
  expect(card.hasAttribute('data-ui-appear')).toBe(true)
  expect(card.style.getPropertyValue('--ui-appear-opacity')).toBe('0')
  expect(card.style.getPropertyValue('--ui-appear-translate')).toBe('0px 8px')
  expect(card.style.animationName).toBe('ui-appear')
  expect(card.style.animationDuration).toBe('300ms')
  expect(card.style.animationTimingFunction).toBe('ease-out')
  // Its own style is kept alongside.
  expect(card.style.color).toBe('rgb(1, 2, 3)')
  expect(doc.querySelector('.named')!.hasAttribute('data-ui-appear')).toBe(false)
  expect(doc.querySelector('.later')!.hasAttribute('data-ui-appear')).toBe(false)
  // `appear: false`: only its replays play, never the server's first paint.
  expect(doc.querySelector('.replays')!.hasAttribute('data-ui-appear')).toBe(false)
})

test('with no script at all, the server HTML plays its appearance from CSS', async () => {
  const html = await renderToString(createSSRApp({ render: cards }))
  const host = document.createElement('div')
  host.innerHTML = html
  document.body.append(host)
  hosts.push(host)
  const card = host.querySelector<HTMLElement>('.card')!
  const run = card.getAnimations().find((a) => (a as CSSAnimation).animationName === 'ui-appear')
  expect(run).toBeDefined()
  expect(Number(getComputedStyle(card).opacity)).toBeLessThan(1)
})

test('hydrated: no mismatch, no second appearance from script, and the CSS is dropped once it ends', async () => {
  const { host, mismatches } = await serveAndHydrate(cards)
  expect(mismatches).toEqual([])
  const card = host.querySelector<HTMLElement>('.card')!
  // Only the CSS one: the script didn't start its own.
  expect(card.getAnimations().map((a) => (a as CSSAnimation).animationName ?? a.id)).toEqual([
    'ui-appear',
  ])
  await vi.waitFor(() => expect(card.hasAttribute('data-ui-appear')).toBe(false), { timeout: 1000 })
  expect(card.style.animation).toBe('')
  expect(card.style.color).toBe('rgb(1, 2, 3)')
})

test('a list with `appear` hydrates as it is: its items never replay their entrance', async () => {
  const entered: string[] = []
  const List = defineComponent({
    setup() {
      const motion = useMotion('list', () => ({
        appear: true,
        enter: (({ item }: { item: HTMLElement }) => {
          entered.push(item.textContent!)
        }) as never,
      }))
      return () =>
        h(TransitionGroup, { tag: 'ul', ...motion.transition }, () =>
          ['a', 'b'].map((n) => h('li', { key: n, class: 'served' }, n)),
        )
    },
  })
  await import('../src/motion/list')
  const { mismatches } = await serveAndHydrate(() => h(List))
  expect(mismatches).toEqual([])
  for (let i = 0; i < 3; i++) await frame()
  expect(entered).toEqual([])
  for (const item of document.querySelectorAll<HTMLElement>('.served'))
    expect(getComputedStyle(item).opacity).toBe('1')
})
