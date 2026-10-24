import '../src/style.css'
import { userEvent } from 'vitest/browser'
import { beforeEach, expect, test, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import CascadeSelectFixture from './fixtures/CascadeSelectFixture.vue'

beforeEach(() => {
  for (const el of document.querySelectorAll('.ui-menu-positioner')) el.remove()
})

const searchBox = () => document.querySelector<HTMLInputElement>('.ui-cascade-select-filter input')
const rowTexts = () =>
  [
    ...document.querySelectorAll('[role="menu"] :is([role="menuitem"], [role="menuitemcheckbox"])'),
  ].map((el) => el.textContent?.replace(/\s+/g, ' ').trim())

test('with filter, opening focuses the search box and the levels show as before', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  expect(rowTexts()).toEqual(['Africa', 'Europe'])
})

test('typing lists matching leaves with their path; a disabled branch hides its leaves', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('acc')
  await vi.waitFor(() => expect(rowTexts()).toEqual(['Accra Africa / Ghana']))
  await userEvent.clear(searchBox()!)
  await userEvent.type(searchBox()!, 'lagos')
  await vi.waitFor(() => expect(rowTexts()).toEqual([]))
  expect(document.querySelector('.ui-cascade-select-empty')?.textContent?.trim()).toBe('No options')
  expect(searchBox()).toBeTruthy()
})

test('every word matches somewhere in the path, ignoring case and accents', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('EUROPE ly')
  await vi.waitFor(() => expect(rowTexts()).toEqual(['Lyon Europe / France']))
})

test('Enter in the search box picks the first result, with its full path, and closes', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('par')
  await vi.waitFor(() => expect(rowTexts()).toEqual(['Paris Europe / France']))
  await userEvent.keyboard('{Enter}')
  await expect.element(screen.getByTestId('value')).toHaveTextContent('paris')
  await expect.element(screen.getByTestId('path')).toHaveTextContent('europe>fr>paris')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
})

test('Arrow Down moves into the results, ArrowUp from the first returns, typing on a row goes back to the box', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('a')
  await vi.waitFor(() => expect(rowTexts().length).toBeGreaterThan(1))
  await userEvent.keyboard('{ArrowDown}')
  await vi.waitFor(() =>
    expect(document.activeElement?.textContent?.replace(/\s+/g, ' ').trim()).toBe(rowTexts()[0]),
  )
  await userEvent.keyboard('{ArrowUp}')
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('{ArrowDown}c')
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  expect(searchBox()!.value).toBe('ac')
  await vi.waitFor(() => expect(rowTexts()).toEqual(['Accra Africa / Ghana']))
})

test('closing clears the search, so reopening shows the levels', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('par')
  await vi.waitFor(() => expect(rowTexts()).toHaveLength(1))
  await userEvent.keyboard('{Escape}')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('closed')
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(rowTexts()).toEqual(['Africa', 'Europe']))
  expect(searchBox()!.value).toBe('')
})

test('multiple: picking a result toggles it and keeps the panel and the search open', async () => {
  const screen = await render(CascadeSelectFixture, { props: { filter: true, multiple: true } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement).toBe(searchBox()))
  await userEvent.keyboard('a')
  await vi.waitFor(() => expect(rowTexts().length).toBeGreaterThan(1))
  await userEvent.keyboard('{ArrowDown}{Enter}')
  await expect.element(screen.getByTestId('model')).toHaveTextContent('["accra"]')
  await expect.element(screen.getByTestId('open-state')).toHaveTextContent('open')
  expect(searchBox()!.value).toBe('a')
})

test('every level of the panel gets ui.panel and says which level it is', async () => {
  const screen = await render(CascadeSelectFixture, { props: { ui: { panel: 'my-panel' } } })
  await screen.getByRole('button').first().click()
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Africa'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Ghana'))
  await userEvent.keyboard('{ArrowRight}')
  await vi.waitFor(() => expect(document.activeElement?.textContent?.trim()).toBe('Accra'))
  const panels = [...document.querySelectorAll<HTMLElement>('.ui-menu-panel')]
  expect(panels.map((panel) => panel.dataset.level)).toEqual(['1', '2', '3'])
  for (const panel of panels) expect(panel.classList).toContain('my-panel')
})
