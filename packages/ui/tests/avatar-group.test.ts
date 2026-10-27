import '../src/style.css'
import { h } from 'vue'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'
import { render } from 'vitest-browser-vue'
import AvatarGroup from '../src/components/AvatarGroup/AvatarGroup.vue'
import Avatar from '../src/components/Avatar/Avatar.vue'

test('no overflowCount: renders only the slotted avatars', async () => {
  const screen = await render(AvatarGroup, {
    slots: {
      default: () => [h(Avatar, { name: 'Ada Lovelace' }), h(Avatar, { name: 'Grace Hopper' })],
    },
  })
  expect(screen.container.querySelectorAll('.ui-avatar').length).toBe(2)
  expect(screen.container.querySelector('.ui-avatar-group-overflow')).toBeNull()
})

test('overflowCount renders a trailing "+N" avatar', async () => {
  const screen = await render(AvatarGroup, {
    props: { overflowCount: 3 },
    slots: { default: () => [h(Avatar, { name: 'Ada Lovelace' })] },
  })
  const overflow = screen.container.querySelector<HTMLElement>('.ui-avatar-group-overflow')!
  await expect.element(overflow).toHaveTextContent('+3')
  expect(screen.container.querySelectorAll('.ui-avatar').length).toBe(2)
})

test('overflow slot overrides the default "+N" content', async () => {
  const screen = await render(AvatarGroup, {
    props: { overflowCount: 5 },
    slots: {
      default: () => [h(Avatar, { name: 'Ada Lovelace' })],
      overflow: ({ count }: { count: number }) => `and ${count} more`,
    },
  })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-avatar-group-overflow')!)
    .toHaveTextContent('and 5 more')
})

test('size prop sizes the generated overflow avatar to match', async () => {
  const screen = await render(AvatarGroup, {
    props: { size: 'lg', overflowCount: 2 },
    slots: { default: () => [h(Avatar, { name: 'Ada Lovelace', size: 'lg' })] },
  })
  expect(screen.container.querySelector('.ui-avatar-group-overflow')).toHaveClass('ui-avatar--lg')
})

test('hover-lift: a pointer resting on an avatar’s bottom edge keeps it lifted, without flicker', async () => {
  const screen = await render(AvatarGroup, {
    props: { hoverLift: true },
    slots: { default: () => ['Ama', 'Kofi', 'Esi'].map((name) => h(Avatar, { name })) },
  })
  const avatar = screen.container.querySelectorAll<HTMLElement>('.ui-avatar')[1]!
  const box = avatar.getBoundingClientRect()
  // Page coordinates, through the root: a hover on the avatar itself would follow its lift.
  const rest = (nudge = 0) =>
    userEvent.hover(document.documentElement, {
      position: { x: box.left + box.width / 2 + nudge, y: box.bottom - 1.5 },
      force: true,
    })
  await rest()
  await new Promise((r) => setTimeout(r, 400))
  expect(avatar.getBoundingClientRect().bottom).toBeLessThan(box.bottom - 2)
  // Lifted 3px, the edge is below its box; moving a hair checks again, as a resting hand does.
  for (const nudge of [0.4, -0.4, 0.4]) {
    await rest(nudge)
    expect(avatar.matches(':hover')).toBe(true)
  }
})
