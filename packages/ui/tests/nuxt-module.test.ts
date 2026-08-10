import { beforeEach, expect, test, vi } from 'vitest'

// Real `addComponent`/`defineNuxtModule` need a live Nuxt module-loading
// context (`useNuxt()` under the hood) that doesn't exist in a plain vitest
// run — the actual end-to-end behavior (SSR render, real component
// registration) is verified against a real Nuxt app in playground/nuxt
// instead. This fake keeps defineNuxtModule's real shape (a callable
// carrying the definition) just enough to exercise setup()'s own logic —
// which component names it registers, respecting `exclude` — in isolation.
const addComponent = vi.fn()
vi.mock('@nuxt/kit', () => ({
  addComponent,
  defineNuxtModule: (def: {
    defaults: unknown
    setup: (options: unknown) => void
    meta: unknown
  }) =>
    Object.assign(
      (options: Record<string, unknown> = {}) =>
        def.setup({ ...(def.defaults as object), ...options }),
      {
        getMeta: () => def.meta,
      },
    ),
}))

beforeEach(() => {
  addComponent.mockClear()
})

test('registers every known component name by default', async () => {
  const { default: vaelUiNuxtModule } = await import('../src/nuxt/index')
  const { COMPONENT_NAMES } = await import('../src/resolver/generated/component-names')

  vaelUiNuxtModule(undefined, undefined)

  expect(addComponent).toHaveBeenCalledTimes(COMPONENT_NAMES.size)
  const registeredNames = addComponent.mock.calls.map((call) => call[0].name)
  expect(new Set(registeredNames)).toEqual(COMPONENT_NAMES)
})

test('every registration resolves name/export from "vael-ui", never vael-ui/vapor', async () => {
  const { default: vaelUiNuxtModule } = await import('../src/nuxt/index')
  vaelUiNuxtModule(undefined, undefined)

  for (const call of addComponent.mock.calls) {
    const options = call[0]
    expect(options.filePath).toBe('vael-ui')
    expect(options.export).toBe(options.name)
  }
})

test('exclude skips those component names and no others', async () => {
  const { default: vaelUiNuxtModule } = await import('../src/nuxt/index')
  const { COMPONENT_NAMES } = await import('../src/resolver/generated/component-names')

  vaelUiNuxtModule({ exclude: ['Button', 'DataTable'] }, undefined)

  const registeredNames = new Set(addComponent.mock.calls.map((call) => call[0].name))
  expect(registeredNames.has('Button')).toBe(false)
  expect(registeredNames.has('DataTable')).toBe(false)
  expect(registeredNames.size).toBe(COMPONENT_NAMES.size - 2)
})

test('module metadata: name/configKey used to identify + configure it in nuxt.config.ts', async () => {
  const { default: vaelUiNuxtModule } = await import('../src/nuxt/index')
  const meta = (
    vaelUiNuxtModule as unknown as { getMeta: () => { name: string; configKey: string } }
  ).getMeta()
  expect(meta.name).toBe('vael-ui')
  expect(meta.configKey).toBe('vaelUi')
})
