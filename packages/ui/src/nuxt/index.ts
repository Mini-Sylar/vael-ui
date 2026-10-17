import { addComponent, defineNuxtModule } from '@nuxt/kit'
import { COMPONENT_NAMES } from '../resolver/generated/component-names'

export interface ModuleOptions {
  /** Component names to skip auto-registering — e.g. to register your own
   * `<Button>` under that same tag name instead. */
  exclude?: string[]
  /** Which build to register. `'vapor'` (Nuxt 4.6+) uses `vael-ui/vapor` and turns on
   * Nuxt's `vue.vapor`, the same choice as `vael-ui/resolver`'s `variant`. @default 'vdom' */
  variant?: 'vdom' | 'vapor'
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

const vaelUiNuxtModule = defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'vael-ui',
    configKey: 'vaelUi',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    exclude: [],
    variant: 'vdom',
  },
  setup(options: ModuleOptions, nuxt) {
    const vapor = options.variant === 'vapor'
    // Vapor components need Nuxt's interop. `vael-ui/vapor` resolves to its server-rendering
    // build on the server by itself, so nothing else is needed here.
    if (vapor) (nuxt.options.vue as { vapor?: boolean }).vapor = true

    // Components come in through Nuxt's #components, which Vite's startup scan doesn't follow, so
    // dev found these on the first visit and reloaded the page. Naming them up front avoids that.
    nuxt.hook('vite:extendConfig', (config, { isClient }) => {
      if (!isClient || !nuxt.options.dev) return
      const optimizeDeps = ((config as { optimizeDeps?: { include?: string[] } }).optimizeDeps ??=
        {})
      optimizeDeps.include = [
        ...(optimizeDeps.include ?? []),
        'vael-ui > @floating-ui/dom',
        'vael-ui > @vueuse/core',
      ]
    })

    const filePath = vapor ? 'vael-ui/vapor' : 'vael-ui'
    const excluded = new Set(options.exclude ?? [])
    for (const name of COMPONENT_NAMES) {
      if (excluded.has(name)) continue
      addComponent({ name, export: name, filePath })
    }
  },
}) as unknown as VaelUiNuxtModule

export default vaelUiNuxtModule
