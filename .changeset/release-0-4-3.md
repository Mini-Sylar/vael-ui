---
'vael-ui': patch
---

## Features

- **Field:** `labelPlacement` takes `start` and `end` for labels beside the control. `label-width` lines up a column of fields and `label-align` aligns the text.
- **Field:** `attached` joins a side label to the control as one bordered box.
- **Field:** new `#prepend` and `#append` slots join cells to any control (Input, Select, Combobox, Textarea and the rest). A cell can hold several things: text and icons flow together, and each control (a Select, a Button) gets its own segment, so `$` plus a currency Select reads `[ $ | USD ]`. Clicking a text cell focuses the control.
- **Field:** controls in a cell get their own id and follow the Field's `disabled`, and focusing one highlights the whole row.
- **Field:** controls with no bordered frame (Switch, Slider, RadioGroup and the like) still work: cells render as plain inline text and an attached label falls back to a plain side label.
- **Field:** joined cells follow the control's size, and theme through `--ui-field-cell-bg`, `--ui-field-cell-color` and the new `group`, `prepend` and `append` `ui` parts.

## Fixes

- **Dialog:** with a footer, the end of the body is no longer cut off. Focus rings, hover-grown controls (like a Slider thumb) and shadows at the bottom of the body were clipped because the scrolling body had no bottom padding. The body now keeps a little padding and the footer gives up the same amount, so the visible spacing is unchanged.
- **Field:** an icon in `#label` stays on the same line as the text, even when a CSS reset (like Tailwind's) makes SVGs `display: block`.
