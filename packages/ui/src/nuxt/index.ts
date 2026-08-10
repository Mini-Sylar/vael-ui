import { addComponent, defineNuxtModule } from '@nuxt/kit'
import { COMPONENT_NAMES } from '../resolver/generated/component-names'

export interface ModuleOptions {
  /** Component names to skip auto-registering — e.g. to register your own
   * `<Button>` under that same tag name instead. */
  exclude?: string[]
}

// Loosely typed on purpose: `defineNuxtModule`'s real return type
// (`NuxtModule<...>`, from @nuxt/schema) pulls in webpack/postcss/ignore's
// own type surfaces transitively — tsdown's declaration bundler can't
// resolve that whole graph into one self-contained .d.ts (it either leaves
// an unresolvable `NuxtModule<TOptions, ...>` reference behind, or fails
// outright trying to inline it). This shape is what actually matters for
// consumers: callable with inline options, usable as the `modules` array's
// entry, either by string (`modules: ['vael-ui/nuxt']`, the common case —
// doesn't touch this type at all) or by importing the default export
// directly for typed inline options.
export interface VaelUiNuxtModule {
  (
    this: void,
    inlineOptions: Partial<ModuleOptions> | undefined,
    nuxt: unknown,
  ): void | Promise<void>
}

// VDOM only: Nuxt's SSR/hydration pipeline has no Vue Vapor support, so
// there's no `variant` option here the way vael-ui/resolver has one — this
// module always registers from the regular `vael-ui` build.
const vaelUiNuxtModule = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vael-ui',
    configKey: 'vaelUi',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    exclude: [],
  },
  setup(options: ModuleOptions) {
    const excluded = new Set(options.exclude ?? [])
    for (const name of COMPONENT_NAMES) {
      if (excluded.has(name)) continue
      addComponent({ name, export: name, filePath: 'vael-ui' })
    }
  },
}) as unknown as VaelUiNuxtModule

export default vaelUiNuxtModule
