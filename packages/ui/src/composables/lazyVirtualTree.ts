import type { useVirtualTree } from './useVirtualTree'

type VirtualTreeModule = { useVirtualTree: typeof useVirtualTree }

// A tree's flat list loads with the first tree past 500 visible rows: an app of smaller trees never
// ships it. One request for the whole page.
let request: Promise<VirtualTreeModule> | undefined
let loaded: VirtualTreeModule | undefined
export const loadVirtualTree = () =>
  (request ??= import('./useVirtualTree').then((module) => (loaded = module)))
/** The flat list if it has loaded, so a tree can switch in the same update instead of a tick later. */
export const loadedVirtualTree = () => loaded
