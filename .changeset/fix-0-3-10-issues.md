---
'vael-ui': patch
---

- Combobox now filters the list as you type in the Vapor build.
- Input and Textarea no longer lose your `@input`, `@change`, `@focus` and `@blur` handlers while typing in the Vapor build.
- CascadeSelect no longer loses your `@click`, `@keydown`, `@focus` and `@blur` handlers on its trigger in the Vapor build.
- Rating no longer loses your pointer and keyboard handlers while you hover or change it in the Vapor build.
- The Tabs indicator now lines up with the active tab when Tabs opens inside an animating Dialog, Drawer or Popover.
- FileUpload no longer opens the camera on mobile unless you set `capture`.
- `v-scroll-mask` now fades both edges as you scroll in browsers without scroll-driven animations.
- Sortable now scrolls the list, its scrollable parents or the page when you drag near an edge (turn it off with `autoScroll: false`).
- Sortable drop targets now stay accurate if the list scrolls during a drag.
