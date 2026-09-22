import type { FunctionalComponent, VNodeChild } from 'vue'
import { defineVaporComponent } from 'vue'

/**
 * Forwards an already-captured slot into a nested instance via `<component :is>`
 * — needed where a bare `<slot>` written directly inside a recursive component
 * call would re-resolve against the nested instance's own (empty) slot instead
 * of the parent's. `propKeys` is unused here; it only matters for the Vapor
 * build (see {@link createSlotRelayVapor}) but both variants share a call site.
 */
export function createSlotRelay<P extends object>(
  render: (props: P) => VNodeChild,
  _propKeys: (keyof P & string)[],
): FunctionalComponent<P> {
  return (props) => render(props)
}

// Vapor build only — aliased in at generation time, see VAPOR_ALIASES in
// generate-vapor.mjs. A plain functional component is treated as a VDOM
// component by vaporInteropPlugin, which then stringifies the Vapor block
// `render` returns instead of rendering it. Wrapping the relay with
// `defineVaporComponent` marks it as a Vapor component so the interop bridge
// mounts it correctly: https://github.com/vuejs/core/issues/15596
export function createSlotRelayVapor<P extends object>(
  render: (props: P) => VNodeChild,
  propKeys: (keyof P & string)[],
) {
  // `render`'s return is typed as VNodeChild to match createSlotRelay's shared
  // call site, but under vapor compilation a captured slot call actually
  // produces a vapor Block, not a VNodeChild — hence the `any`, the real
  // mismatch is between the vdom/vapor slot representations, not a bug here.
  return defineVaporComponent((props: P) => render(props) as any, { props: propKeys })
}
