import '../src/style.css'
import { h } from 'vue'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import AvatarGroup from '../src/components/AvatarGroup/AvatarGroup.vue'
import Avatar from '../src/components/Avatar/Avatar.vue'

test('no overflowCount: renders only the slotted avatars', async () => {
  const screen = render(AvatarGroup, {
    slots: {
      default: () => [h(Avatar, { name: 'Ada Lovelace' }), h(Avatar, { name: 'Grace Hopper' })],
    },
  })
  expect(screen.container.querySelectorAll('.ui-avatar').length).toBe(2)
  expect(screen.container.querySelector('.ui-avatar-group-overflow')).toBeNull()
})

test('overflowCount renders a trailing "+N" avatar', async () => {
  const screen = render(AvatarGroup, {
    props: { overflowCount: 3 },
    slots: { default: () => [h(Avatar, { name: 'Ada Lovelace' })] },
  })
  const overflow = screen.container.querySelector<HTMLElement>('.ui-avatar-group-overflow')!
  await expect.element(overflow).toHaveTextContent('+3')
  expect(screen.container.querySelectorAll('.ui-avatar').length).toBe(2)
})

test('overflow slot overrides the default "+N" content', async () => {
  const screen = render(AvatarGroup, {
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
  const screen = render(AvatarGroup, {
    props: { size: 'lg', overflowCount: 2 },
    slots: { default: () => [h(Avatar, { name: 'Ada Lovelace', size: 'lg' })] },
  })
  expect(screen.container.querySelector('.ui-avatar-group-overflow')).toHaveClass('ui-avatar--lg')
})
