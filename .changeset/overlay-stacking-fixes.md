---
'vael-ui': patch
---

## Fixes

- **Popover / Menu / Select / Combobox / TreeSelect / DatePicker:** correct stacking order when opened from within another overlay, based on open order instead of family.
- **Tour:** panel no longer becomes unclickable when a step opens another overlay to reveal its target.
- **Tag:** no longer stretches to fill a flex row.
- **Tabs:** sliding indicator no longer lands in the wrong spot when mounted inside an animating Dialog/Drawer/Popover.
- **Menu / CascadeSelect (vapor build):** fixed a custom `#item` slot rendering as `[object Object]` in a nested submenu under `vaporInteropPlugin`.
