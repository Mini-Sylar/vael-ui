import { COMPONENT_NAMES } from './generated/component-names'

// Structurally matches unplugin-vue-components' real ComponentResolverObject
// contract (confirmed against its source), hand-written rather than
// imported — zero dependency on unplugin-vue-components itself, so this
// keeps working across that project's versions with no coupling here.
export interface ImportInfo {
  as?: string
  name?: string
  from: string
}
export interface ComponentInfo extends ImportInfo {
  sideEffects?: (ImportInfo | string)[] | ImportInfo | string
}
export type ComponentResolveResult =
  | string
  | ComponentInfo
  | null
  | undefined
  | void
  | Promise<string | ComponentInfo | null | undefined | void>
export type ComponentResolverFunction = (name: string) => ComponentResolveResult
export interface ComponentResolverObject {
  type: 'component' | 'directive'
  resolve: ComponentResolverFunction
}

export interface VaelUiResolverOptions {
  /** Which build to resolve components from. `'vapor'` resolves from
   * `vael-ui/vapor` instead of `vael-ui` — pick whichever your app actually
   * renders with; mixing the two builds in one app isn't supported. */
  variant?: 'vdom' | 'vapor'
}

/**
 * A resolver for `unplugin-vue-components` — pass it into that plugin's own
 * `resolvers` option and every vael-ui component becomes usable in a
 * template with zero manual `import`:
 *
 * ```ts
 * // vite.config.ts
 * import Components from 'unplugin-vue-components/vite'
 * import { VaelUiResolver } from 'vael-ui/resolver'
 *
 * export default {
 *   plugins: [Components({ resolvers: [VaelUiResolver()] })],
 * }
 * ```
 *
 * No CSS side-effect wiring is needed here (unlike most resolvers) — every
 * vael-ui component already imports its own CSS internally, so resolving
 * the component import alone pulls its styles in for free.
 */
export function VaelUiResolver(options: VaelUiResolverOptions = {}): ComponentResolverObject {
  const from = options.variant === 'vapor' ? 'vael-ui/vapor' : 'vael-ui'
  return {
    type: 'component',
    resolve: (name) => {
      if (!COMPONENT_NAMES.has(name)) return
      return { name, from }
    },
  }
}

export { COMPONENT_NAMES }
