import { expect, test } from 'vitest'
import { VaelUiResolver } from '../src/resolver/index'

test('is a ComponentResolverObject: type "component" with a resolve function', () => {
  const resolver = VaelUiResolver()
  expect(resolver.type).toBe('component')
  expect(typeof resolver.resolve).toBe('function')
})

test('resolves a known component name to { name, from: "vael-ui" } by default', () => {
  const resolver = VaelUiResolver()
  expect(resolver.resolve('Button')).toEqual({ name: 'Button', from: 'vael-ui' })
  expect(resolver.resolve('DataTable')).toEqual({ name: 'DataTable', from: 'vael-ui' })
})

test('variant: "vapor" resolves from "vael-ui/vapor" instead', () => {
  const resolver = VaelUiResolver({ variant: 'vapor' })
  expect(resolver.resolve('Button')).toEqual({ name: 'Button', from: 'vael-ui/vapor' })
})

test('an unknown name resolves to undefined, so unplugin-vue-components falls through to other resolvers', () => {
  const resolver = VaelUiResolver()
  expect(resolver.resolve('MyOwnLocalButton')).toBeUndefined()
  expect(resolver.resolve('div')).toBeUndefined()
})

test('resolution never carries a sideEffects entry — each component already imports its own CSS', () => {
  const resolver = VaelUiResolver()
  const result = resolver.resolve('Button')
  expect(result).not.toHaveProperty('sideEffects')
})

test('sub-components (Column, host components) are resolvable too, not just top-level ones', () => {
  const resolver = VaelUiResolver()
  expect(resolver.resolve('Column')).toEqual({ name: 'Column', from: 'vael-ui' })
  expect(resolver.resolve('DialogHost')).toEqual({ name: 'DialogHost', from: 'vael-ui' })
})

test('the exported COMPONENT_NAMES manifest is non-empty and matches what resolve() accepts', async () => {
  const { COMPONENT_NAMES } = await import('../src/resolver/index')
  expect(COMPONENT_NAMES.size).toBeGreaterThan(60)
  const resolver = VaelUiResolver()
  for (const name of COMPONENT_NAMES) {
    expect(resolver.resolve(name)).toEqual({ name, from: 'vael-ui' })
  }
})
