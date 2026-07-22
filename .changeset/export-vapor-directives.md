---
'vael-ui': patch
---

Fix: `vTooltip`/`vScrollMask` weren't exported from `vael-ui/vapor` at all —
a Vapor-only app had no way to register them. Now exported under their
plain names (`vTooltip`, `vScrollMask`, the Vapor-compiled functions),
usable the same way as the main `vael-ui` entry: locally imported in
`<script setup>`, or globally via `app.directive('tooltip', vTooltip)` on a
`createVaporApp()` instance — verified global registration genuinely works
for Vapor apps too (falls back to the same runtime directive resolution
VDOM uses).
