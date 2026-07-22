---
'vael-ui': patch
---

Add `useColorScheme()` composable for dark/light/system mode (persistence,
DOM attribute application, live OS-preference updates — no forced UI).

Register `v-tooltip`/`v-scroll-mask` on Vue's `GlobalDirectives` interface
so Volar/vue-tsc resolves them when registered globally
(`app.directive('tooltip', vTooltip)`), not just via a local `<script
setup>` import.

Document directive setup (including the global-registration requirement)
and Vue Vapor support in the README.
