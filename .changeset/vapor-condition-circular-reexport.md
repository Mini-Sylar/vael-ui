---
'vael-ui': patch
---

Fixes a build failure (`CIRCULAR_REEXPORT`, `MISSING_EXPORT`) in `vael-ui/vapor` for any consumer using the `vapor` export condition added in 0.2.1 — several composable/utility re-exports were pure passthroughs that resolved back to themselves once `vael-ui`'s root pointed at the same file. They now import from their real source files directly instead of through the package specifier.

Also fixes `confirmAction`, which was excluded from the Vapor build in 0.2.1 (it rendered the real VDOM `Button` component internally) — it now composes real Vapor-compiled components, so it's available from `vael-ui/vapor` like every other composable.
