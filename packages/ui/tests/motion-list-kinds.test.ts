// Breadcrumb and AvatarGroup as lists: crumbs and avatars you add or remove go through your motion.
import '../src/style.css'
import { expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { h, shallowRef } from 'vue'
import Avatar from '../src/components/Avatar/Avatar.vue'
import AvatarGroup from '../src/components/AvatarGroup/AvatarGroup.vue'
import Breadcrumb from '../src/components/Breadcrumb/Breadcrumb.vue'

const global = { stubs: { 'transition-group': false } }
const leaving = (log: HTMLElement[], part: string) => ({
  leave: (parts: Record<string, HTMLElement>) => {
    log.push(parts[part]!)
    return parts[part]!.animate([{ opacity: 1 }, { opacity: 0 }], 200)
  },
})

test('Breadcrumb: a crumb that leaves the path goes through your `leave`', async () => {
  const left: HTMLElement[] = []
  const path = shallowRef([
    { label: 'Home', attrs: { href: '/' } },
    { label: 'Docs', attrs: { href: '/docs' } },
    { label: 'Motion', attrs: { href: '/docs/motion' } },
  ])
  render(() => h(Breadcrumb as never, { items: path.value, motion: leaving(left, 'item') }), {
    global,
  })
  await new Promise((resolve) => setTimeout(resolve, 200))
  path.value = path.value.slice(0, 2)
  await vi.waitFor(() => expect(left.map((el) => el.textContent?.trim())).toContain('Motion'))
})

test('AvatarGroup: a keyed avatar you remove goes through your `leave`', async () => {
  const left: HTMLElement[] = []
  const people = shallowRef(['A', 'B', 'C'])
  render(
    () =>
      h(AvatarGroup as never, { motion: leaving(left, 'avatar') }, () =>
        people.value.map((name) => h(Avatar as never, { key: name, fallback: name })),
      ),
    { global },
  )
  await new Promise((resolve) => setTimeout(resolve, 200))
  const second = document.querySelectorAll<HTMLElement>('.ui-avatar')[1]
  people.value = ['A', 'C']
  await vi.waitFor(() => expect(left).toEqual([second]))
})
