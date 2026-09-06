---
'vael-ui': patch
---

## Fixes

- **`PullToRefresh`:** the pull gesture is driven by touch events again, not Pointer Events.
  0.3.2 moved it to `pointermove` + a `touch-action` that got toggled from a `scroll` listener,
  and neither reliably holds back the native scroll: `preventDefault()` on a `pointermove` does
  nothing to scrolling, and re-arming `touch-action` always lagged the moment you settled back
  at the top by an event or two. It now uses a non-passive `touchmove` + `preventDefault()` —
  the one thing browsers actually honour — for exactly the span of a downward drag while the
  scroll box is at `scrollTop === 0`, and mutates no styles on the consumer's element. Pointer
  events stay wired up for a real mouse only. The gesture engages strictly at the top of the
  container; anywhere else it's an ordinary scroll.

- **`Menu`:** nested submenus render correctly in the Vapor build. The recursive `<Menu>` was
  resolved by name (`resolveComponent('Menu', true)`), which returns the bare string — not the
  component — inside a Vapor render, so every submenu came out as a stray `<menu>` element with
  its props dropped and never opened. It's now an explicit self-import. A custom `#item` slot
  also keeps applying at every submenu depth instead of reverting to the default row past level
  one (and, under the Vapor compiler, instead of a `<slot>` forward that re-resolved against the
  submenu and recursed).

## Also

- The whole Vue toolchain is pinned to one RC (`3.6.0-rc.7`) via `pnpm.overrides`, not just
  `vue` itself — a second copy of `@vue/runtime-vapor` in the tree breaks recursive Vapor
  components, since self-reference resolves against the wrong instance registry.
