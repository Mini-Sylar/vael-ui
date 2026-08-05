import '../src/style.css'
import { h } from 'vue'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import Breadcrumb from '../src/components/Breadcrumb/Breadcrumb.vue'
import BreadcrumbItem from '../src/components/BreadcrumbItem/BreadcrumbItem.vue'
import BreadcrumbSeparator from '../src/components/BreadcrumbSeparator/BreadcrumbSeparator.vue'

test('nav has a default localized aria-label, overridable', async () => {
  const screen = render(Breadcrumb)
  await expect
    .element(screen.container.querySelector('nav')!)
    .toHaveAttribute('aria-label', 'Breadcrumb')

  const custom = render(Breadcrumb, { props: { ariaLabel: 'You are here' } })
  await expect
    .element(custom.container.querySelector('nav')!)
    .toHaveAttribute('aria-label', 'You are here')
})

test('item default renders an <a>; attrs (href) fall through', async () => {
  const screen = render(BreadcrumbItem, {
    attrs: { href: '/docs' },
    slots: { default: 'Docs' },
  })
  const link = screen.container.querySelector('a')!
  expect(link).not.toBeNull()
  expect(link.getAttribute('href')).toBe('/docs')
  await expect.element(link).toHaveTextContent('Docs')
})

test('as overrides the rendered tag, e.g. a router-link stub component', async () => {
  const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }
  const screen = render(BreadcrumbItem, {
    props: { as: RouterLinkStub as unknown as string },
    attrs: { to: '/docs' },
    slots: { default: 'Docs' },
  })
  expect(screen.container.querySelector('a')!.getAttribute('href')).toBe('/docs')
})

test('current renders plain text with aria-current="page", no link', async () => {
  const screen = render(BreadcrumbItem, {
    props: { current: true },
    slots: { default: 'Settings' },
  })
  expect(screen.container.querySelector('a')).toBeNull()
  const current = screen.container.querySelector<HTMLElement>('[aria-current="page"]')!
  await expect.element(current).toHaveTextContent('Settings')
})

test('separator renders a default chevron icon, aria-hidden', async () => {
  const screen = render(BreadcrumbSeparator)
  const li = screen.container.querySelector('li')!
  expect(li.getAttribute('aria-hidden')).toBe('true')
  expect(li.querySelector('svg')).not.toBeNull()
})

test('separator default slot replaces the chevron', async () => {
  const screen = render(BreadcrumbSeparator, { slots: { default: '/' } })
  const li = screen.container.querySelector('li')!
  expect(li.querySelector('svg')).toBeNull()
  await expect.element(li).toHaveTextContent('/')
})

test('composed: root + items + separators produce the expected structure', async () => {
  const screen = render({
    render: () =>
      h(Breadcrumb as any, null, {
        default: () => [
          h(BreadcrumbItem, { href: '/' }, { default: () => 'Home' }),
          h(BreadcrumbSeparator),
          h(BreadcrumbItem, { current: true }, { default: () => 'Docs' }),
        ],
      }),
  })
  expect(screen.container.querySelectorAll('.ui-breadcrumb-item').length).toBe(2)
  expect(screen.container.querySelectorAll('.ui-breadcrumb-separator').length).toBe(1)
  expect(screen.container.querySelector('[aria-current="page"]')).not.toBeNull()
})
