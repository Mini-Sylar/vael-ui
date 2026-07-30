---
'vael-ui': patch
---

Fix `Combobox`, `Select`, `TreeSelect`, and `DatePicker` silently dropping a plain `class`/`style` passed by a consumer. Each sets `inheritAttrs: false` but never forwarded those attrs onto its own visible trigger element (only onto the teleported dropdown panel, where one existed), so `<Combobox class="my-class">` (and the same on the other three) never reached the rendered DOM — any consumer relying on ordinary class-based styling (width, layout, `display: none` in a media query, etc.) had no effect. Audited every other component using `inheritAttrs: false`; the remaining ones (Popover, Tooltip, Menu, Dialog, Drawer, BottomSheet, ContextMenu) take a consumer-provided trigger via slot and have no component-owned trigger element, so they were unaffected by design, not by accident.
