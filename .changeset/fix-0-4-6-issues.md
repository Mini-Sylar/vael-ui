---
'vael-ui': patch
---

## Features

- **ConfigProvider:** new `size` prop sets the default size for every button, field and table inside, e.g. `size="sm"` for a dense app. A component's own `size` still wins.
- **ConfigProvider:** new `motionCss` prop. `:motion-css="false"` turns off every built-in animation inside, including dialogs, popovers and menus, which is handy for screenshot and end-to-end tests. Panels still open and close, and toasts still leave, just instantly.
- **ConfigProvider:** dates and numbers follow your `i18n` locale. Calendar, DatePicker and InputNumber switch format along with your app's language.
- **ConfigProvider:** `theme.fontSize` sets the text size for the components inside it.
- **Typography:** all component text, form fields included, now follows your `html` font size.
- **New `preventFocusZoom()`:** call it once in `main.ts` so iPhones don't zoom into fields when your text is under 16px. Pinch-to-zoom keeps working.
- **Toaster:** new `name` prop and `toaster` toast option send a toast to one Toaster, e.g. `<Toaster name="editor" />` with `toast('Copied', { toaster: 'editor' })`. Each Toaster keeps its own stack, `maxVisible` and timers.
- **Dialog, Drawer, BottomSheet:** the backdrop is exposed as `overlayEl`. With `forceMount`, set its opacity yourself to fade it along with your own animation.
- **BottomSheet:** new `container` and `teleportTo` props, like Drawer's. A contained sheet fills that element, and its snap points follow its height.
- **BottomSheet:** new `releaseVelocity`, the speed of the flick that closed the sheet, so a custom exit in `beforeClose` can carry it on.
- **Stepper:** new `circleEls` and `connectorEls`, and the connector fill follows `--ui-stepper-fill`, to animate the steps yourself.
- **SpeedDial:** new `iconEl` for the trigger icon.
- **Tour:** new `motionCss` prop turns off the spotlight's glide, and new `spotlightEl` and `positionerEl` let you animate it yourself.

## Behavior change

- **Form fields on touch screens** no longer jump to 16px, so they match the rest of your text. If your text is under 16px, call `preventFocusZoom()`, or set `--ui-touch-font-size: 16px` for the old behavior.
- **Vapor:** `vael-ui/vapor` is now built against Vue `3.6.0-rc.12`. Pin that exact version.

## Fixes

- **i18n:** passing your vue-i18n instance no longer fills the console with "Not found 'uiKit…'" warnings. If you've translated some uiKit keys but not all, you get one warning per language in development, listing the missing ones.
- **Switch, Stepper, SpeedDial:** `:motion-css="false"` now turns off every built-in transition, like the Switch track's color, Stepper's line fill and SpeedDial's icon turn.
- **SpeedDial:** follows a ConfigProvider's `motionCss`.
- **BottomSheet:** when `beforeClose` slides the sheet away itself, it now closes as soon as you call `done()`, instead of staying in the way for half a second.
- **Stepper:** the check mark stays centered while it swaps in, instead of sitting in the corner and then snapping to the middle.
- **Stepper:** in a vertical Stepper, the line now starts right under the circle, even when the step has a description.
- **Stepper:** a horizontal Stepper no longer clips a circle that grows, such as a pop animation.
- **Toaster:** hovering a stack of toasts that arrived together no longer shows the top one far away before it settles.
- **DataTable:** with `scrollHeight` and columns wider than the table, rows reach the last column, the header stays lined up while you scroll sideways, and frozen columns stay put.
- **DataTable:** with `scrollHeight`, a column without a `width` keeps at least 8rem instead of shrinking to nothing.
- **DataTable:** with `scrollHeight`, the scrollbars no longer fade out with the edges, and the strip above the vertical scrollbar matches the header.
- **DataTable:** a column's `width` now includes its padding even without a `box-sizing: border-box` reset, so `width="8rem"` is 8rem.
- **ScrollArea:** with `orientation="both"`, the edges fade on both axes at once.
- **Drawer:** `flush` and `maximizable` now work.
- **InputNumber:** changing `locale`, `currency` or `mode` updates the shown number straight away.
