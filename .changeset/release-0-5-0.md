---
'vael-ui': minor
---

![vael-ui 0.5.0](https://raw.githubusercontent.com/Mini-Sylar/vael-ui/main/.github/assets/release-0.5.0.png)

## Upgrading

Three components render different DOM. Props, slots and events are unchanged, but a selector or a test that reaches inside them may need updating.

- **Button (breaking if you colour buttons)**: the box is now its own layer, `.ui-button::before`, and the contents sit in `.ui-button-inner`. A `background` or `border` you set on the button element paints under that layer, so it disappears on hover for ghost and outline buttons, and always for primary, secondary and danger. Set the button's variables instead:

  ```css
  /* Before */
  .my-button {
    background: #18181b;
    border-color: #3f3f46;
  }
  /* After */
  .my-button {
    --ui-button-bg: #18181b;
    --ui-button-border: #3f3f46;
  }
  ```

  From an unlayered stylesheet, such as Vue's scoped styles, your variables override the variant's own, hover included. For a dashed or dotted border, style the layer: `.my-button::before { border-style: dashed }`. To read a button's colour from code, read it from `::before`.

- **Sortable**: the root is now a `div` (`.ui-sortable`) with the `<ul>` inside it as `.ui-sortable-list`. Your class and a parent's scoped styles now reach the root.
- **Tooltip, TooltipHost**: the label sits in a `.ui-tooltip-content` span, and the box is drawn by `.ui-tooltip-panel::before`. `data-traveling` and `data-morphing` replace `data-sizing-locked`.

## New

- **Editable**: text that becomes an input when you click it, for renaming in place, and saves on Enter or blur. `activation-mode` sets what starts editing, `submit-mode` sets what saves, and `v-model:editing` controls it. The `#edit` slot swaps in any control (a Textarea saves on Cmd or Ctrl+Enter), `#actions` adds save and cancel buttons, and `start`, `submit` and `cancel` are exposed.
- **ColorPicker**: a swatch that opens a picker with a saturation and brightness plane, a hue slider, a hex field, optional presets and an eyedropper where the browser supports one. The plane works with arrow keys, `v-model:open` controls the panel, and `name` submits the hex value with a form. Customise it with the `#trigger` and `#preset` slots, `show-eye-dropper` and `--ui-color-picker-radius`.
- **Progress**: `value` also takes segments (`{ value, label?, variant?, color? }`) that stack into one bar with a legend, for a storage breakdown or a budget. `value-text` sets `aria-valuetext`. `type="circle"` draws a ring, with the default slot in the middle for the percentage, and `sweep` turns it into a gauge: `180` is a half-ring, `270` a speedometer. Stacked segments make a donut. The ARIA attributes moved from the root to the track; `data-state` stays on the root.
- **Loader**: `type` picks the animation: `ring`, `dots`, `bars`, `comet` or `dither`. Each is pure CSS in a 1em square that follows the text color, so swapping one never moves a layout. Button's new `loader-type` picks one for its loading state, and `ConfigProvider`'s `loader-type` sets it for every spinner inside, including Button, list loading rows, loading toasts and PullToRefresh.
- **Toaster**: `container` keeps a toaster's stack inside an element instead of the viewport, so a panel or a demo frame can show its own toasts. `teleportTo` also accepts an element.
- **OtpInput**: `variant="field"` draws one box around the whole code, and `placeholder` marks each empty cell.
- **CommandPalette**: a `#footer` slot for key hints or a status line, which receives the highlighted `activeItem` and the `query`. `activeItem` is also exposed, so your own shortcuts can act on the highlighted row.
- **Textarea**: each side of the bottom action strip lines its contents up in one row, so a counter, an icon and a button align without extra markup.
- **Animation hooks**: Editable, ColorPicker and Progress accept `motion-css="false"` and expose their elements for your own animations: `previewEl`, `inputEl`, `swatchEl`, `panelEl`, `areaEl`, `thumbEl`, `fillEl` and `fillEls`.
- **Tokens**: `--ui-duration-drawer-exit` and `--ui-duration-stagger`.

## Motion

Every built-in animation now follows the same rules: it stays under 300 ms, eases out when entering and leaving, closes faster than it opens, and under reduced motion keeps its fade but drops its movement.

- **Button**: pressing no longer makes the label or icon flinch. The box and the contents scale together, and sizes snap to whole pixels at any root font size. At a 16 px root no size changes; at 14 px, the medium button grows from 31.5 px to 32 px.
- **Tooltip**: text no longer jitters, blurs or shifts, including on Windows. Moving between triggers glides from wherever the tooltip is, follows a target that is still moving (a magnifying Dock item), and resizes smoothly when its content changes.
- **Tree, TreeSelect**: folders open and close with a spring, and the rows below move with them, with no overlap or jitter on tall folders. Clicking again mid-way reverses the motion. Keyboard navigation, search and trees over 150 visible rows still change instantly. TreeSelect's panel grows with the tree, and an opening folder no longer shifts the scroll position.
- **Sortable**: rows spring into place everywhere: back into their own slot when released over it, between lists in a group, and into new slots when your data re-sorts after a drop. A dragged row takes its slot from its centre, not the pointer, and stays above the other rows the whole time. While rows settle, the root has `data-settling` and `isSettling` is exposed.
- **Calendar, DatePicker**: the month label resizes smoothly, and grids switching months or years no longer overlap or get clipped at the sides.
- **Collapsible, Accordion**: content that grows while a panel opens is no longer clipped, and panels ease out.
- **Message**: grows and shrinks with its fade, so the content below moves instead of jumping.
- **Select, CascadeSelect**: removing the last chip collapses it smoothly, and a trigger sized to its content eases to the placeholder's width.
- **Dock**: sliding a finger along the dock magnifies it, and tapping an item makes it bounce. Item tooltips open above the magnified item. `v-tooltip` takes a `sideOffset`, a number or a function.
- **Tour**: the callout travels with the spotlight between steps.
- **Tour**, **Popover**, **Tooltip**: asked for `left` or `right` with no room on either side (a full-width card on a phone), the panel goes below or above instead of being cut off.
- **Switch, Checkbox, Radio**: press feedback.
- **Drawers, BottomSheet**: close in 350 ms instead of 500 ms.
- **Chevrons**: in Select, Combobox, TreeSelect, SplitButton, CascadeSelect, DataTable and Accordion, they turn in step with their panel.
- **DataTable**: expansion rows that grow after opening are no longer clipped.
- **Smaller changes**: Stepper checks and clear buttons scale in from 0.9 instead of 0.5. Under reduced motion, Skeleton pulses slower, OtpInput's caret blinks slower and Stepper keeps its colour fade. A keyboard-focused Tree row shows an inset ring.

## Fixes

- **BottomSheet**: dragging is smooth on phones, and nothing behind the sheet scrolls while you drag. Pulling a raised sheet back down returns it to rest instead of closing it. When a phone's toolbars or keyboard appear, the sheet stays on its snap point. `scroll-fade`, on by default, fades the content's edges while there is more to scroll, and the first control's focus ring is no longer clipped.
- **CommandPalette**: on Android, the list filters as you type instead of waiting for the space bar, and the keyboard's action key picks the highlighted match. Moving up through a grouped list no longer hides the highlighted row under its group heading.
- **Dialog, Drawer, BottomSheet, CommandPalette**: with a classic scrollbar, as on Windows, a closing panel no longer jumps sideways. The page stays scroll-locked until the exit animation ends, so the scrollbar comes back after the panel is gone.
- **useColorScheme**: `resolvedMode` matches `initial` from the first render, so server-rendered HTML no longer starts in the system scheme.
- **Accordion, Collapsible**: a panel no longer hops by a fraction of a pixel as it finishes opening. It opens to its exact height instead of a rounded one.
- **Pagination**: hovering the current page no longer covers it with the hover background.
- **Calendar, DatePicker**: clicking a disabled day from the previous or next month no longer moves to that month.
- **ColorPicker**: on Windows, the panel no longer scrolls sideways, and the eyedropper is the same height as the hex field.
- **Combobox**: the phone keyboard's action key picks the highlighted match. It sets `enterkeyhint="enter"`, which you can override.
- **Touch screens**: hover styles no longer stick after a tap, and pressed rows show a background instead. Two taps in a row on a stepper or a calendar arrow count as two presses instead of zooming the page on iOS.
- **Sortable**: `preview-mode="clone"` floats a copy from the start of every drag, not only once it leaves its list. The original is the placeholder: within its list it moves to where the row will land, so the list shows the result before you drop, and it stays in its list until the drop when the copy is over another; and it carries `data-sortable-source` (hidden by default; style it to show it dimmed or outlined). On drop the copy flies into the row's slot above every list and follows the row if the list re-sorts while it lands, and the placeholder fades out as it arrives (in place, when the row moved to another list).
- **Sortable**: lists make real room for a row. A list grows smoothly for a row hovering it from another list and closes again when it leaves; at the drop the row takes that room without a jump, and the list it left closes up instead of snapping. In a list that scrolls, the room lets autoscroll reach a gap at its end, and holding the row past the list's top or bottom keeps it scrolling that way. New `restrict-to-list` keeps the dragged row inside the part of the list it's over, so it never hangs past a fixed-height column (off by default). Autoscroll stops at the list's last row instead of chasing a dragged row into empty space (and jumping back on drop), and never scrolls a list sideways. A drop keeps the list where you scrolled it (scroll anchoring is off on `.ui-sortable`), a row dropped below the fold is scrolled into view, and a real row dropped into another list lands above every list, as a clone does.
- **Tooltip**: after a long press on Android, the next tap on the trigger works.
- **Text fields on phones**: PasswordInput, Combobox, CommandPalette and the Select, CascadeSelect and Tree filters no longer autocapitalise or autocorrect what you type. ColorPicker's hex field and Editable show “Done” on the keyboard.
- **PasswordInput**: `autocomplete` defaults to `new-password` when the field shows requirements, so phones suggest a strong password, and to `current-password` otherwise, so saved passwords fill in.
- **InputNumber**: on phones, a field that allows negative numbers opens the full keyboard, because iPhone number pads have no minus key. A whole-number field that can't go negative opens a digits-only keypad.
- **Safe areas**: in apps that use `viewport-fit=cover`, Toaster, BottomSheet and full-height drawers keep clear of the notch and the home indicator.
- **Dialog**: scrolling to the end of a long dialog no longer scrolls the page behind it.
- **Dialog**, **Drawer**, **BottomSheet**: a closing one lets taps through while it animates out, so reaching for a button (or a dock) right after closing no longer takes two taps.
