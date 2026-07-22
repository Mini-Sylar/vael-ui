---
'vael-ui': patch
---

Fix: `vTooltipVapor`/`vScrollMaskVapor` crashed with `TypeError: value is
not a function` on bare usage with no bound value (`<div v-scroll-mask>`,
the primary documented pattern for that directive) — Vapor's compiler
passes no `value` argument at all for a directive with no value
expression, not a no-op getter. Both now guard with `value?.()`.

Also: `app.directive('tooltip', vTooltip)` now type-checks cleanly on a
Vapor app with no cast needed on the consumer's side — added a second,
VDOM-shaped overload signature (never actually invoked at runtime, Vapor
always calls the real one) purely so TypeScript accepts it. `vue` is now
pinned to `3.6.0-rc.1` across the whole workspace (was mixed 3.5.x/3.6.x),
which the overload fix also depended on.
