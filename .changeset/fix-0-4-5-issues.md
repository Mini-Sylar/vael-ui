---
'vael-ui': patch
---

## Features

- **Vapor:** `vael-ui/vapor` now works with server rendering (Nuxt, Vite SSR, static sites). Same import, nothing to configure.
- **Nuxt:** `vaelUi: { variant: 'vapor' }` switches your app to the Vapor build (Nuxt 4.6+).
- **Slider:** new `#thumb` and `#track` slots, for things like a value bubble or tick marks.
- **OtpInput:** `groups` splits the cells with a separator, e.g. `:groups="3"` for `123-456`.
- **DataTable:** edges fade while there's more to scroll to. Turn it off with `:scroll-fade="false"`.
- **Timeline:** `@item-enter` and `@item-leave` now hand you the step's marker, line and content elements to animate.
- **DatePicker:** new `#day` slot, the same as Calendar's.
- **Calendar, DatePicker:** `:months="2"` shows months side by side, so a range across two months stays in view. On a phone they stack.
- **Calendar, DatePicker:** switching between days, months and years now zooms in and out.
- **DatePicker:** `:close-on-select="false"` keeps the panel open after picking, for an Apply button or trying a few dates.
- **Calendar, DatePicker:** new `#label` slot for the month and year heading, e.g. to add an icon, a tooltip or a price.
- **Calendar, DatePicker:** the month name now slides with the days when you change month, and a day gives a small press when clicked.
- **CommandPalette:** the results list now grows and shrinks smoothly to fit as you type. Use `@item-enter` and `@item-leave` to animate rows yourself.
- **Accordion:** `@change` now gives you the type you bound with `v-model:value` (for example `'shipping' | 'returns'`) instead of a plain `string`.
- **Radio, Pagination, PullToRefresh:** new `motionCss` prop. Set it to `false` to turn off the built-in transition and animate the exposed elements yourself (Radio `controlEl`/`dotEl`, Pagination `indicatorEl`/`labelsEl`/`listEl`, PullToRefresh `zoneEl`).
- **Dock:** new `itemEls()` returns the item buttons, to animate yourself with `:magnify="false"`.
- **Tokens:** new `--ui-touch-font-size` sets the smallest text size on touch screens (default `16px`).

## Fixes

- **Button, Card, Menu, MenuList, Stepper, BreadcrumbItem:** no longer break when you register components globally under their own names.
- **Form controls:** iOS no longer zooms the page when you tap into a field.
- **Tour:** no longer errors during server rendering.
- **DatePicker, SelectButton, Tabs:** the selection indicator no longer slides in from the first option when it first appears.
- **Pagination:** the active page number changes color together with the sliding indicator.
- **Switch:** the thumb sits evenly in both positions, and the off track is now a solid fill.
- **InputNumber:** easier-to-tap steppers on touch screens.
- **Calendar, DatePicker:** clicking between two days always selects one; there's no dead space between rows.
