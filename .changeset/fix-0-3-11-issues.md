---
'vael-ui': patch
---

## Features

- **Combobox:** `allowCustom` now shows a `Create "…"` row whenever the typed text isn't an existing label, including when it partially matches one. Customize it with the new `#create` slot, or turn it off with `:create-option="false"`.
- **Combobox:** `@create` now receives `{ reason, cancel }`. Call `cancel()` to reject a value.
- **Combobox:** `#item` slot now receives `query` for highlighting matches.
- **Combobox:** new `tab-behavior` prop: `'select'` picks the highlighted option on Tab, `'create'` commits the typed text. Unset, Tab just moves focus.

## Fixes

- **Combobox:** a custom value no longer disappears from the input after it's committed.
- **Combobox:** text that exactly matches an option now highlights that option first.
- **Combobox:** a disabled first result no longer blocks Enter.
- **Combobox:** Escape now discards uncommitted typing.
- **Combobox:** tabbing away now closes the panel.
- **Select / Combobox:** Tab no longer moves focus into a long, scrollable option list.

## Behavior change

- **Combobox:** clicking away with `allowCustom` no longer commits the typed text. Set `commit-on-blur` to keep the old behavior.
