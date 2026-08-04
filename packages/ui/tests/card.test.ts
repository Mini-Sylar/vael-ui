import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Card from '../src/components/Card/Card.vue'

test('no header rendered when neither title nor #header slot is given', async () => {
  const screen = render(Card, { slots: { default: 'Body content' } })
  expect(screen.container.querySelector('.ui-card-header')).toBeNull()
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-card-body')!)
    .toHaveTextContent('Body content')
})

test('title/description render the default header', async () => {
  const screen = render(Card, { props: { title: 'Plan', description: 'Billed monthly' } })
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-card-title')!)
    .toHaveTextContent('Plan')
  await expect
    .element(screen.container.querySelector<HTMLElement>('.ui-card-description')!)
    .toHaveTextContent('Billed monthly')
})

test('#header slot replaces the default title/description markup', async () => {
  const screen = render(Card, {
    props: { title: 'Ignored' },
    slots: { header: '<span class="custom-header">Custom</span>' },
  })
  expect(screen.container.querySelector('.ui-card-title')).toBeNull()
  expect(screen.container.querySelector('.custom-header')).not.toBeNull()
})

test('no footer rendered without the #footer slot', async () => {
  const screen = render(Card)
  expect(screen.container.querySelector('.ui-card-footer')).toBeNull()
})

test('#footer slot renders the footer region', async () => {
  const screen = render(Card, { slots: { footer: '<button>Confirm</button>' } })
  const footer = screen.container.querySelector('.ui-card-footer')!
  expect(footer.querySelector('button')).not.toBeNull()
})

test('as="a" renders the root as a real anchor and implies interactive', async () => {
  const screen = render(Card, { props: { as: 'a', href: 'https://example.com' } })
  const el = screen.container.querySelector('.ui-card')!
  expect(el.tagName).toBe('A')
  expect(el).toHaveClass('ui-card--interactive')
})

test('interactive prop adds the affordance class on a plain div', async () => {
  const screen = render(Card, { props: { interactive: true } })
  expect(screen.container.querySelector('.ui-card')).toHaveClass('ui-card--interactive')
})

test('ui part overrides merge onto each region', async () => {
  const screen = render(Card, {
    props: {
      title: 'Plan',
      ui: { root: 'my-root', header: 'my-header', title: 'my-title', body: 'my-body' },
    },
    slots: { footer: 'x' },
  })
  expect(screen.container.querySelector('.ui-card')).toHaveClass('my-root')
  expect(screen.container.querySelector('.ui-card-header')).toHaveClass('my-header')
  expect(screen.container.querySelector('.ui-card-title')).toHaveClass('my-title')
  expect(screen.container.querySelector('.ui-card-body')).toHaveClass('my-body')
})
