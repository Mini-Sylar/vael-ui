---
'vael-ui': minor
---

![vael-ui 0.5.0](https://raw.githubusercontent.com/Mini-Sylar/vael-ui/main/.github/assets/release-0.5.0.png)

## The motion system

Every animated component now takes one `motion` prop, and one engine runs every animation. The engine animates `transform` and `opacity` with CSS transitions and Web Animations, and a page loads only the pieces it uses.

- **`motion`**: `false` turns a component’s motion off. An object changes it:
  - values for each part, such as `{ initial: { panel: { opacity: 0, y: 8 } } }` or `exit`. A plain number is px, or degrees for `rotate`.
  - timing: `{ spring: { damping, response } }`, or `duration` and `easing`
  - `enter` and `leave` hooks

  Each component exports its own type, such as `DialogMotion`, `SelectMotion` or `ToasterMotion`, so its parts autocomplete.

- **Your own library**: a hook returns what GSAP, motion’s `animate()` or `element.animate()` returns, or a promise, and the component waits for it. If you close mid-open or reopen mid-close, vael-ui stops the animation (`kill`, `stop` or `cancel`) and aborts `signal`. Under reduced motion, hooks don’t run unless you set `reducedMotion: 'run'`.
- **Lists**: Toaster, Timeline, FileUpload, SpeedDial, DataTable rows, CommandPalette `items` and the Select family’s `chips` animate items that come and go:
  - `stagger` brings new items in one after another
  - `leaving: 'pop'` lifts a leaving item out of the layout, so the rest close the gap at once; `'hold'` keeps the gap until the item is gone
  - the other items slide into their new places
  - `initial` or `exit` written as a function receives `{ index, count }` for the items arriving or leaving together, so a close can run last to first
  - `appear: true` also animates the items already there when the list mounts, such as each time a CommandPalette opens. It never runs on hydration.
- **Overlays**: `morph: 'trigger'` grows an overlay out of the element that opened it, and shrinks it back into that element on close. It works on Dialog, Drawer, BottomSheet, Popover, Menu, Tooltip, Tour and the Select family’s panels. Other overlay options:
  - on Dialog, Drawer and BottomSheet, `initial` also animates the inner parts: `title`, `body`, `footer` and the rest
  - `linked` moves other elements with the overlay, such as a page that recedes behind a drawer and follows a sheet’s drag
  - `surface` draws a shape layer behind a Popover, for gooey effects
  - `exitOrder: 'reverse'` closes the children first
  - `resize: false` stops a panel from easing to a new content size. While a panel’s width eases, its text keeps the line breaks of the final width.
- **Your own engine**: a style’s `engine` runs overlay parts, list items and your own targets through your library. It receives the element, `from` and `to` in vael-ui’s names (`x`, `y`, `scale`, `opacity`), and the timing with the spring it came from, and returns what your library returns. States, swaps and `linked` always use the built-in engine.
- **App-wide style**: `ConfigProvider`’s `motion` sets the motion for a whole app, by role (`overlay`, `list`, `reveal`, `press`, `content`) or by component (`dialog`, `toaster`, `select`). A component’s own `motion` overrides it. `presets` names looks you can use with `v-animate` anywhere inside the provider, such as `v-animate="'rise'"`. `parseMotionStyle` validates a style loaded from JSON.
- **`v-animate`**: animates your own elements:
  - `v-animate="{ initial: { opacity: 0, y: 8 } }"` plays when the element appears. When Vue removes the element, it leaves the way it came; `exit: false` turns that off.
  - `.size` eases an element to its content’s size
  - `layout: true` slides an element to its new place when the layout moves it
  - `layoutId` moves an element between two places, such as a card into a dialog. Add `layout: 'position'` to keep its size on the way, so text never stretches.
  - `replay` plays the animation again when its value changes; `appear: false` plays it only then
  - `when: 'visible'` waits until the element scrolls into view
  - `animate` sets a look the element holds. When the look changes, the element animates to it from wherever it is: `animate: { rotate: open ? 180 : 0 }`.
  - `progress` (0 to 1) holds keyframe arrays at that point, so a swipe or a scroll can scrub them. With a `spring`, they follow `progress` with a short lag.
  - `v-animate:name` passes an element to the nearest component, which animates it with its own motion
- **Entrances on any component**: `initial` on any component’s parts plays when it mounts, never on hydration, as in `<Separator :motion="{ initial: { root: { scale: '0 1' } } }" />`. Repeated parts, such as Rating’s stars or a Stepper’s steps, come in one after another with `stagger`. `replay` plays the entrance again without remounting, such as a burst on a five-star rating; `appear: false` plays it only on replays.
- **States on every component**: each component has its own motion type (`SwitchMotion`, `ProgressMotion`, …) for its parts and states, so a style can shake every invalid field or lift every pressed card:
  - **Keyframes**: an array is a set of keyframes. `times` places them, and `easing` eases each step; a list of easings gives each step its own, such as a rise and then a bounce. `repeat` plays them again, or forever while the state is on, and `repeatType: 'reverse'` alternates direction.
  - **Repeated parts**: a part that appears many times plays its states one element at a time. That covers a Stepper’s `current`, `completed` and `upcoming` steps, each Dock item’s hover and press, and `selected` on each item you pick. OtpInput’s new `cell` part works the same way, and its values can use each cell’s `index`.
  - **Off states**: Switch, Checkbox and Radio add `unchecked`, so turning one off can animate too
  - **Timing**: a `spring`, or a `duration` and `easing`, on one component retimes its own transitions, such as a Switch’s release, a Progress fill or an AnimatedNumber’s roll
  - **Indicators**: in Tabs, SelectButton, MenuList, Pagination and Toolbar, indicators take a `spring`, and a `move` hook lets you animate them yourself. On Tabs, Pagination and SelectButton, `stretch` makes the trailing edge follow on its own spring with a short lag, so the pill stretches as it travels (`true`, or `{ trail, delay }`). `squash` flattens the pill at the start of each move, such as `0.82`. Pagination’s page numbers change color exactly where the pill is.
  - **Breadcrumb, AvatarGroup**: crumbs and avatars that come and go animate
  - **Toaster**: `states` play when a toast changes variant, such as a promise toast that ends in `error`
  - **Loader, Skeleton**: `false` holds a Loader still and stops a Skeleton from pulsing
- **Server rendering**: vael-ui writes a `v-animate` entrance into the server HTML as CSS, so it plays before any script loads and doesn’t replay on hydration. An overlay that’s open on load renders open, without animating. The Nuxt module registers `v-animate` for you.
- **Your own components**: `useMotion` gives your component the same `motion` prop as vael-ui’s. It follows the app’s style, animates in and out, and animates its named targets with it. In tests, `await settled()` waits until every animation vael-ui started has finished.
- **Animations that don’t run**: vael-ui skips these:
  - any animation in a hidden tab
  - a view restored by `KeepAlive`
  - elements past the 24th appearing together, unless you time them with `delay` or `stagger`; they appear at once
  - rows recycled while a virtual list scrolls
- **Development**: an overlay, or a component using `useMotion`, carries `data-motion` on its root, naming where its motion came from. Each open and close appears as a measure in the DevTools Performance panel. If a part has its own CSS transition on a property the motion animates, you get a warning.

## Upgrading from 0.4

Three changes break existing code: the `motionCss` rename, `beforeClose` and the list events. The rest change behavior, DOM or styles that your own CSS and tests may rely on.

- **`motionCss` is now `motion` (breaking)**: the rename covers every component, `ConfigProvider`, and the options of `useCollapse`, `useSortable` and `useSortableGroup`. It works the same way: `:motion="false"` turns off the built-in animation. Find and replace `motion-css` and `motionCss` with `motion`.
- **`beforeClose` is a guard (breaking)**: it decides whether the overlay closes, and no longer runs your exit animation. Return `true` to close, `false` to stay open, or a promise of either. The `(done) => …` form is gone. While the guard decides, the overlay stays still. When it says no, the overlay stays open and the next close asks again, so you no longer call `cancelClose()`.

  ```ts
  // Before
  beforeClose: (done) => {
    if (!dirty.value) return done()
    confirmAction({ title: 'Discard changes?' }).result.then((ok) => {
      if (ok) done()
      else dialogRef.value?.cancelClose()
    })
  }
  // After
  beforeClose: () => !dirty.value || confirmAction({ title: 'Discard changes?' }).result
  ```

  To animate a close, use a `motion` hook:

  ```ts
  // Before
  beforeClose: (done) => gsap.to(panel, { opacity: 0, onComplete: done })
  // After
  motion: {
    leave: ({ panel }) => gsap.to(panel, { opacity: 0 })
  }
  ```

- **List events are gone (breaking)**: these events no longer fire:
  - `chip-enter` and `chip-leave` (Select, Combobox)
  - `item-enter` and `item-leave` (CommandPalette, FileUpload, Timeline)
  - `card-enter` and `card-leave` (Toaster)
  - `row-enter` and `row-leave` (DataTable)
  - `action-enter` and `action-leave` (SpeedDial)

  Pass `enter` and `leave` hooks in `motion` instead. Each hook gets the item by name (`{ toast }`, `{ row }`, `{ item }`, `{ action }`) and waits for the animation you return, so there’s no `done()`. Chips go under `motion.chips` and CommandPalette’s rows under `motion.items`, because the top level animates the panel. Timeline’s hooks get the step’s `marker`, `connector`, `previousConnector`, `content` and `opposite`, which replaces the removed `TimelineItemParts` type.

- **`force-mount` keeps content mounted**: use it to keep the content’s state while it’s closed, not to take over the animation. vael-ui leaves the motion of content kept this way to you; to animate it, use `motion` hooks.
- **`motion="false"` covers the panel too**: on Select, Combobox, CascadeSelect, DatePicker, TreeSelect and CommandPalette, `false` now opens and closes the panel at once as well.
- **Message**: no longer shrinks while `beforeClose` decides. It leaves once the guard allows it.

Some components render different DOM or styles. Their props, slots and events are unchanged, but a selector, a style or a test that reaches inside them may need updating:

- **Button (breaking if you color buttons)**: the box is now its own layer, `.ui-button::before`, and the contents sit in `.ui-button-inner`. A `background` or `border` you set on the button element paints under that layer. It disappears on hover for ghost and outline buttons, and always for primary, secondary and danger. Set the button’s variables instead:

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

  From an unlayered stylesheet, such as Vue’s scoped styles, your variables override the variant’s own, hover included. For a dashed or dotted border, style the layer: `.my-button::before { border-style: dashed }`. To read a button’s color from code, read it from `::before`.

- **Sortable**: the root is now a `div` (`.ui-sortable`), with the `<ul>` inside it as `.ui-sortable-list`. Your class and a parent’s scoped styles now reach the root.
- **Tooltip, TooltipHost**: the label sits in a `.ui-tooltip-content` span, and `.ui-tooltip-panel::before` draws the box. `data-traveling` and `data-morphing` replace `data-sizing-locked`.
- **Hover backgrounds in lists**: rows in Select, Combobox, CommandPalette, Menu, Tree, TreeSelect, MenuList, DataTable, Pagination, Tabs, SelectButton, Toolbar and Calendar no longer paint their own hover or focus background. One `.ui-indicator` element slides behind them instead. If you restyled the hover with a selector such as `.ui-menu-item:hover { background: … }`, set `--ui-indicator-bg` instead, or your color paints over the highlight. DataTable’s striped and selected rows are now see-through tints, so the highlight shows under them; over the table’s surface, they look the same as before.
- **`--ui-indicator-bg`**: no longer set on `:root`. The highlight reads it with `var(--ui-muted)` as the fallback, so a panel that changes `--ui-muted` recolors its highlight too. If your own CSS uses `var(--ui-indicator-bg)`, add that fallback.
- **Stepper**: a step you can’t reach yet is now a disabled button instead of a `div`. Its circle stays the same element as you move through the steps, so its color transitions. It looks the same, and screen readers announce it as unavailable.

## New components and features

0.5.0 adds four components (Editable, AnimatedNumber, AnimatedText and ColorPicker), haptics, and new options across forms, overlays and lists.

- **Editable**: text that turns into an input when you click it, for renaming in place. It saves on Enter or blur:
  - `activation-mode` sets what starts editing, `submit-mode` sets what saves, and `v-model:editing` controls it
  - the `#edit` slot swaps in any control; a Textarea saves on Cmd+Enter or Ctrl+Enter
  - `#actions` adds save and cancel buttons, and `start`, `submit` and `cancel` are exposed
  - a control in `#edit` with its own panel, such as a DatePicker, keeps the edit open while you use the panel
- **AnimatedNumber**: a number whose changed digits roll to their new value:
  - `format` takes any `Intl.NumberFormat` options (currency, percent, compact), and the locale follows `ConfigProvider`, numbering system included
  - a digit that appears or disappears fades while the number makes room for it
  - screen readers hear the formatted value
  - tune the roll with `--ui-duration-number` and `--ui-ease-number`; `motion="false"` swaps digits without rolling

  `InputNumber`’s new `animated` prop rolls its value the same way when the steppers, the arrow keys or your code change it. Typing shows plain text.

- **AnimatedText**: swaps a label or status for new text. The new text rises 4 px into place while the old text fades a third faster, and the box eases to the new width, so nothing beside it jumps. The swap takes 150 ms, with no blur. Tune it with `--ui-duration-text` and `--ui-ease-text`; `motion="false"` swaps at once, so you can animate the exposed `el` yourself.
- **Input**: `animated` crossfades a placeholder that changes, even while the field is focused and empty, and a value your code sets while the field isn’t focused. What you type never animates. Fields also get a `#display` slot:
  - it draws the field’s text yourself, for a fancy input. vael-ui places it exactly over the input’s own text and scrolls it with a long value, while the real input keeps the caret, selection, autofill and screen reader text.
  - an element in it with `pointer-events: auto` receives hover, such as for a tooltip on a mention
  - Textarea has the same slot and follows its wrapping and scroll. PasswordInput, Combobox (the typed text, after any chips) and InputNumber pass it through.
- **Select, CascadeSelect, TreeSelect**: the label crossfades whenever it changes, from the placeholder to the first choice, between choices, and back to the placeholder when cleared. A trigger sized to its content eases to the new width. A value already set when the page loads shows at once, and `motion="false"` swaps it at once. A `#value` slot of your own replaces the label and its crossfade; wrap your text in `<AnimatedText>` to keep it.
- **Button**: `hold` asks for a press and hold before a destructive action. A fill sweeps across while you hold, and `@click` fires when it completes; letting go early snaps it back:
  - `true` holds for 1200 ms, and a number sets the time. Space and Enter hold too.
  - screen readers hear the new `button.hold` message, “Press and hold to confirm” (key `uiKit.button.hold`), as the button’s description, alongside any `aria-describedby` of your own
  - `holding` is exposed, and `holdProgress` (0 to 1) reaches the default slot, the component and CSS as `--ui-hold-progress`, so a label can change partway through
- **InputNumber**: `scrub` changes the value when you drag sideways on a field you’re not typing in. Each 4 px is one step (pass a number to change the distance), and Shift makes it ten. A click without a drag still focuses the field.
- **useColorScheme**: `setMode(mode, { from: event })` spreads the new scheme in a circle from a click, an element or a point, using a View Transition. Browsers without View Transitions, and reduced motion, switch at once.
- **useHaptic**: haptic feedback on phones that support it, inside components or outside them:
  - `selection()` is the lightest tick, `impact('light' | 'medium' | 'heavy')` a bump, and `notification('success' | 'warning' | 'error')` a short pattern
  - `vibrate(pattern)` plays your own pattern, and `intensity` scales them all
  - `isSupported` says whether the device can play them
  - `HapticImpact`, `HapticNotification`, `HapticOptions` and `UseHapticReturn` type it
- **ConfigProvider `haptics`**: `true`, or `{ intensity }`, turns on vael-ui’s own haptics, each matched to its moment:
  - a tick when a Switch flips
  - a light bump when a swiped row snaps or a pull passes the refresh point
  - a firmer bump when a dragged Sortable row drops into place
  - the strongest when a held Button completes

  `false` silences every `useHaptic` call inside the provider, yours included, for a “turn off haptics” setting. When it’s unset, your haptics play and vael-ui’s stay silent.

- **Switch**: you can drag the thumb. It follows the pointer, the track flips as the thumb passes halfway, and the switch settles on the side you release it past. A tap still toggles. `dragging` is exposed, and the root carries `data-dragging`.
- **One spring for everything**: `ConfigProvider`’s `:motion="{ spring: { damping, response } }"` puts drawers, sheets, toasts, AnimatedNumber, the sliding indicators, and the folds of Tree and Accordion on one spring. Crossfades such as AnimatedText keep their own short timing. Damping below 1 overshoots, and binding the values to refs retunes the app live. `indicator` still sets the indicators on their own. `springEasing` turns a spring into a CSS `linear()` curve and its settle time, in the shape `element.animate()` takes, so your own animations can use it.
- **Dialog**: `origin="trigger"` zooms the panel out of the element that opened it, and back into it on close. It uses the drawer curve, so `ConfigProvider`’s spring applies to it. It works on centered dialogs only, and reduced motion keeps a fade.
- **ColorPicker**: a swatch that opens a picker with a saturation and brightness plane, a hue slider, a hex field, optional presets and an eyedropper where the browser supports one:
  - the plane works with the arrow keys
  - `v-model:open` controls the panel, and `name` submits the hex value with a form
  - customize it with the `#trigger` and `#preset` slots, `show-eye-dropper` and `--ui-color-picker-radius`
- **Progress**: `value` also takes segments (`{ value, label?, variant?, color? }`) that stack into one bar with a legend, for a storage breakdown or a budget:
  - `value-text` sets `aria-valuetext`
  - `type="circle"` draws a ring, with the default slot in the middle for the percentage. `sweep` turns it into a gauge: `180` is a half ring and `270` a speedometer. Stacked segments make a donut.
  - the ARIA attributes moved from the root to the track; `data-state` stays on the root
- **Loader**: `type` picks the animation: `ring`, `dots`, `bars`, `comet` or `dither`. Each is pure CSS in a `1em` square that follows the text color, so swapping one never shifts the layout:
  - Button’s new `loader-type` picks one for its loading state
  - `ConfigProvider`’s `loader-type` sets it for every spinner inside: Button, list loading rows, loading toasts and PullToRefresh
  - all three also take your own component, or a render function such as `() => h(MySpinner, { speed: 2 })`, drawn in the same `1em` box. `LoaderSource` types it.
- **Toaster**: `container` keeps a toaster’s stack inside an element instead of the viewport, so a panel or a demo frame can show its own toasts. `teleportTo` also accepts an element.
- **OtpInput**: `variant="field"` draws one box around the whole code, and `placeholder` marks each empty cell. The active cell’s ring is now one element, `ringEl`, that glides from cell to cell with the caret and follows `ConfigProvider`’s `indicator`, springs included. It sits in `.ui-otp-cells`, after the cells.
- **useNumberFormat**: returns `formatOptions`, the `Intl.NumberFormat` options it builds, so you can pass the same format to AnimatedNumber.
- **CommandPalette**: a `#footer` slot for key hints or a status line. It receives the highlighted `activeItem` and the `query`. `activeItem` is also exposed, so your own shortcuts can act on the highlighted row.
- **Textarea**: each side of the bottom action strip lines up its contents in one row, so a counter, an icon and a button align without extra markup.
- **Large trees**: past 500 visible rows, Tree and TreeSelect render only the rows in view: a tree of 50,000 rows keeps about two dozen in the page, so it opens and scrolls like a small one and still folds its folders on the spring. It works whatever scrolls the tree: the list itself, a sidebar around it or the page.
  - sticky scroll pins the folders being scrolled through, as a copy that screen readers skip
  - arrow keys, Home and End move through the whole tree, scrolling the row into view first; the focused row stays in the page while you scroll away from it
  - each row tells screen readers its level, its position among its siblings and how many there are
  - the code for it loads with the first tree that needs it, so an app of smaller trees doesn’t ship it
  - a reorderable tree and `forceMount` keep rendering every row
- **Animation hooks**: Editable, ColorPicker and Progress accept `motion="false"` and expose their elements for your own animations: `previewEl`, `inputEl`, `swatchEl`, `panelEl`, `areaEl`, `thumbEl`, `fillEl` and `fillEls`.
- **Sliding highlight on every list**: the hover and keyboard highlight glides between rows in Select, Combobox, CommandPalette, Menu (and so ContextMenu, SplitButton and CascadeSelect), Tree, TreeSelect, MenuList, DataTable, Pagination, Tabs, SelectButton, Toolbar and Calendar:
  - keyboard focus always moves it, even with the pointer resting in the list
  - a move of more than 3 rows (typeahead, Home, End, a new search) jumps instead of gliding, and touch never shows it
  - it moves with `translate`, which the compositor animates, and vael-ui writes straight to its element, so hovering never re-renders the list, even a DataTable or a long sidebar. A fast sweep glides after the pointer instead of jumping.
  - crossing a group label or a separator keeps it on the last row, and it glides on from there
  - each component exposes it as `highlightEl`. `indicatorEl` stays the name for a selection indicator, and MenuList now exposes its current-page one.
  - with `motion="false"`, it moves at once, for an animation of your own
- **ConfigProvider `indicator`**: sets how every sliding indicator inside moves, both the hover highlight and the selection in Tabs, SelectButton and MenuList. Use `'glide'` (the default), `'instant'`, or a spring such as `{ damping: 0.5, response: 0.35 }`, where damping below 1 overshoots. A spring writes to the element on each frame, so nothing re-renders. `motion="false"` still makes indicators instant. `IndicatorMode` and `IndicatorSpring` type it, and `useTabIndicator` and `useHoverIndicator` take the same `indicator` option.
- **useHoverIndicator**: the composable behind that highlight, for your own lists. Mark the rows with `itemSelector`, put an element with the `ui-indicator` class in the list, and bind the `style` it returns:
  - `motion: false` leaves the movement to you; the docs show a highlight driven by `createSpring` that overshoots and stretches
  - `group` passes the highlight between neighbouring lists, so moving from one into the next glides across instead of fading out and in. MenuList and Tree do this on their own, for two nav groups or an explorer’s sections.
- **useTabIndicator**: new options:
  - `scroller` for an indicator inside a list that scrolls
  - `matchCross` to match each row on the other axis too
  - `maxGlide` to jump instead of gliding over long moves
  - `motion: false` to move at once
  - `position: 'translate'` to move it on the compositor

  It returns `update()`, which re-measures once before the next paint however often you call it, and it writes to `indicatorEl` directly when you pass one.

- **Slider, Knob, Dial**: a `change` event fires with the final value when you release the thumb or press a key, like a native range input. `v-model` still updates on every move.
- **BottomSheet**: setting the exposed `activeSnap` moves the sheet to that snap point.
- **SplitButton**: `unified` joins the action and its menu button into one surface, without the thin line between them.
- **Tree, TreeSelect**: `scroll-fade`, on by default, fades the list’s edges while there’s more to scroll. With `sticky-scroll`, only the bottom fades, so pinned rows stay solid.
- **Tokens**:
  - `--ui-duration-drawer-exit` and `--ui-duration-stagger`
  - for the highlight: `--ui-duration-indicator` (120 ms), `--ui-duration-indicator-wide` (200 ms, for the wide rows of MenuList, Tree and DataTable), `--ui-ease-indicator` and `--ui-indicator-bg`. `ConfigProvider`’s `motion="false"` zeroes both durations along with the rest.
  - for AnimatedNumber and AnimatedText: `--ui-duration-number`, `--ui-ease-number`, `--ui-duration-text` and `--ui-ease-text`

## Changes to built-in animations

Every built-in animation now follows the same rules:

- it stays under 300 ms, except drawers, a dialog grown from its trigger and AnimatedNumber’s roll, which travel further
- it eases out when entering and leaving
- it closes faster than it opens
- under reduced motion, it keeps its fade and drops its movement

These components changed how they move:

- **Popover, Menu, Tooltip**: panels grow from the exact center of their trigger instead of the nearest corner, even after flipping or shifting to stay on screen.
- **Button**: pressing no longer makes the label or icon flinch. The box and its contents scale together, and sizes snap to whole pixels at any root font size. At a 16 px root, no size changes; at 14 px, the medium button grows from 31.5 px to 32 px.
- **Tooltip**: text no longer jitters, blurs or shifts, including on Windows. Moving between triggers glides from wherever the tooltip is, and follows a target that’s still moving, such as a magnifying Dock item. The tooltip resizes smoothly when its content changes.
- **Tree, TreeSelect**: folders open and close with a spring, and the rows below move with them, with no overlap or jitter on tall folders. The spring follows the motion system: the tree’s own `motion`, then a style’s `tree` key, then the app’s spring; a bouncy one makes folders overshoot as they open, and every folder closes without the bounce. Clicking again partway reverses the motion. Keyboard navigation and search still change instantly. TreeSelect’s panel grows with the tree, and an opening folder no longer shifts the scroll position.
- **Sortable**: rows spring into place in every case: back into their own slot when released over it, between lists in a group, and into new slots when your data re-sorts after a drop. A dragged row picks its slot by its center, not the pointer, and stays above the other rows throughout. While rows settle, the root has `data-settling` and `isSettling` is exposed.
- **Calendar, DatePicker**: the month label resizes smoothly, and grids switching months or years no longer overlap or get clipped at the sides.
- **Collapsible, Accordion**: content that grows while a panel opens is no longer clipped, and panels ease out.
- **Message**: grows and shrinks with its fade, so the content below moves instead of jumping.
- **Select, CascadeSelect**: removing the last chip collapses it smoothly, and a trigger sized to its content eases to the placeholder’s width.
- **Dock**: sliding a finger along the dock magnifies it, and tapping an item makes it bounce. Item tooltips open above the magnified item. `v-tooltip` takes a `sideOffset`, as a number or a function.
- **Tour**: the callout travels with the spotlight between steps, including to a step on the other side of its target:
  - `motion` (`duration` and `easing`, or `spring`) times that glide
  - the spotlight exposes the cutout as `--ui-tour-cutout-x`, `-y`, `-width`, `-height` and `-radius`, so a ring of your own can follow it
  - a tour that’s open when the page loads glides on its first step change too
- **Tour, Popover, Tooltip**: when you ask for `left` or `right` and there’s no room on either side, such as a full-width card on a phone, the panel opens below or above instead of being cut off.
- **Switch, Checkbox, Radio**: give feedback when pressed.
- **Slider**: a value set from your code, such as a reset or a preset, glides the thumb and fill there. The glide uses AnimatedNumber’s timing, so a `ConfigProvider` spring retunes it. Keys and a press on the track glide too, while a drag follows the pointer at once. `motion: false` turns the glide off.
- **Drawers, BottomSheet**: close in 350 ms instead of 500 ms.
- **Chevrons**: in Select, Combobox, TreeSelect, SplitButton, CascadeSelect, DataTable and Accordion, chevrons turn in step with their panel.
- **DataTable**: expansion rows that grow after opening are no longer clipped.
- **Tree**: in single selection, the selected row’s tint slides from the previous selection, and fades in when the new row is more than 4 rows away.
- **Clear buttons**: in Select, Combobox, CascadeSelect and TreeSelect, the button fades and shrinks in place. In a fixed-width trigger, the value area widens under it; in a trigger sized to its content, the trigger closes up. Leaving fades a quarter faster than appearing, on a plain ease-out, so the fade stays visible.
- **Smaller changes**:
  - Stepper checks and clear buttons scale in from 0.9 instead of 0.5
  - under reduced motion, Skeleton pulses slower, OtpInput’s caret blinks slower, and Stepper keeps its color fade
  - a keyboard-focused Tree row shows an inset ring

## Bug fixes

These fix behavior in 0.4.8 and earlier.

- **Pressing at the edge**: a control that shrinks while pressed (close buttons, steppers, chip removers, menu items, interactive Cards and 25 more) keeps its full box clickable. A press released near its edge is no longer lost. Clickable DataTable rows no longer shrink on press; the hover highlight is their feedback.
- **Springs**: a spring stays smooth and never overshoots when the page drops to 30 fps. Before, a snappy spring could jitter or fly off.
- **Field**: a page full of fields no longer restyles long lists on every hover. Field now asks its control whether it has a frame, instead of using a costly `:has()` selector.
- **OtpInput**: typing fast no longer snaps the gliding ring backwards; only the caret blink restarts.
- **Right to left**:
  - the sliding selection in Tabs, SelectButton, MenuList and Pagination lines up with the selected item instead of measuring from the wrong edge
  - Switch’s thumb starts on the right and travels left
  - a magnified Dock spreads its items apart instead of piling them on top of each other
  - the arrow keys follow the screen: ArrowLeft moves toward the end of the line in Tabs, Toolbar, Menu, Tree, Rating, Dock, Tour, the Calendar's days and Resizable, and a submenu opens to the left
  - Slider starts at its right edge, with its fill, thumbs, keys and pointer to match
  - Rating counts its stars from the right, by pointer too, and a half star fills its right half
  - SpeedDial’s `direction` stays on screen: `'left'` fans out to the left, and `'up'` and `'down'` stay centered on the trigger
  - a Resizable drag grows the panel toward its trailing edge, on the left
- **Smaller bundles**: Input, InputNumber, Select, CascadeSelect and TreeSelect load AnimatedText and AnimatedNumber after mount, and show the same text until they arrive. A page that only renders fields no longer ships the animation code up front.
- **Reduced motion**: every component reads one shared `prefers-reduced-motion` query instead of creating a new one on each check.
- **BottomSheet**:
  - dragging is smooth on phones, and nothing behind the sheet scrolls while you drag
  - pulling a raised sheet back down returns it to rest instead of closing it
  - when a phone’s toolbars or keyboard appear, the sheet stays on its snap point
  - `scroll-fade`, on by default, fades the content’s edges while there’s more to scroll
  - the first control’s focus ring is no longer clipped
  - a sheet keeps its `width` and `fullScreen` while it closes, even when your code resets them as it closes
- **CommandPalette**: on Android, the list filters as you type instead of waiting for the space bar, and the keyboard’s action key picks the highlighted match. Moving up through a grouped list no longer hides the highlighted row under its group heading.
- **Select, Combobox, CommandPalette**: pointing at a row that the list’s edge cuts off no longer scrolls the list under the pointer. It could happen with no input at all, when rows animated in under a still cursor. The keyboard still scrolls to the highlighted row. For your own lists, `useListbox` now returns `point(index)`, which highlights the option under the pointer without calling `onActiveChange`.
- **Dialog, Drawer, BottomSheet, CommandPalette**: with a classic scrollbar, as on Windows, a closing panel no longer jumps sideways. The page stays scroll-locked until the exit animation ends, so the scrollbar returns after the panel is gone.
- **useColorScheme**: `resolvedMode` matches `initial` from the first render, so server-rendered HTML no longer starts in the system scheme.
- **Accordion, Collapsible**: a panel no longer jumps by a fraction of a pixel as it finishes opening, because it opens to its exact height instead of a rounded one.
- **Pagination**: hovering the current page no longer covers it with the hover background.
- **Radio, Checkbox, Switch**: at a fractional pixel ratio (Windows display scaling or browser zoom), the dot, tick and thumb no longer shift when you press them. Each stays on its own compositor layer. Tables over 150 rendered rows and trees between 150 and 500 visible rows make their checkboxes static instead, with no press feedback and no layer, so scrolling stays cheap. A virtualized table and a large tree keep them, since they render only the rows on screen.
- **SelectButton**: the selection glides to a new choice. Before, it jumped, because the first measurement turned its transition off for good.
- **SpeedDial**: the trigger’s plus sits in the middle of the button instead of a pixel above it, and pressing it no longer looks like a jitter.
- **`vael-ui/style.css`**: the full stylesheet now includes AvatarGroup, Breadcrumb, CommandPalette, PasswordInput, Rating, ScrollArea, Sortable, Stepper, Timeline and Tour, and the shared clear-button, tick and indicator styles. Before, an app that imported the full stylesheet instead of each component’s own CSS rendered those components unstyled.
- **Resizable**: End no longer sizes a panel to `Infinity` when it has no `max`; it does nothing instead.
- **useFileDrop, FileUpload**: dragging selected text or a link no longer lights up the drop zone, and turning `disabled` on mid-drag clears the drag-over state instead of leaving it stuck.
- **moveTreeNode**: a failed move leaves the data untouched. Before, it left an empty `children` array on the target.
- **useTabs**: object items each find their own tab. Before, they all matched the first tab, so focus jumped there.
- **Tooltip**: `open-change` reasons are typed as the close reasons that actually fire, without the `'hover'` and `'focus-visible'` that never did.
- **Forced colors**: in Windows high contrast mode, the sliding highlight shows as a `Highlight` outline, since the mode removes backgrounds.
- **Calendar, DatePicker**: clicking a disabled day from the previous or next month no longer moves to that month.
- **ColorPicker**: on Windows, the panel no longer scrolls sideways, and the eyedropper is the same height as the hex field.
- **Combobox**: with `multiple`, content in `#start`, such as an icon, sits at the start of the field before the chips, instead of moving along after them as you pick.
- **Combobox**: the phone keyboard’s action key picks the highlighted match. Combobox sets `enterkeyhint="enter"`, which you can override.
- **Touch screens**: hover styles no longer stick after a tap, and pressed rows show a background instead. Two taps in a row on a stepper or a calendar arrow count as two presses instead of zooming the page on iOS.
- **Sortable `preview-mode="clone"`**:
  - a copy floats from the start of every drag, not only once the row leaves its list
  - the original stays as the placeholder. Within its list, it moves to where the row will drop, so the list shows the result before you drop; while the copy is over another list, the original stays in its own list until the drop.
  - the placeholder carries `data-sortable-source`. It’s hidden by default; style it to show it dimmed or outlined.
  - on drop, the copy flies into the row’s slot above every list, and follows the row if the list re-sorts during the flight. The placeholder fades out as the copy arrives, in place when the row moved to another list.
- **Sortable lists make room for a row**:
  - a list grows smoothly for a row hovering it from another list, and closes again when the row leaves. At the drop, the row takes that room without a jump, and the list it left closes up instead of snapping.
  - in a list that scrolls, the room lets autoscroll reach a gap at the end, and holding the row past the list’s top or bottom keeps it scrolling
  - new `restrict-to-list` keeps the dragged row inside the part of the list it’s over, so it never hangs past a fixed-height column. It’s off by default.
  - autoscroll stops at the list’s last row instead of chasing a dragged row into empty space and jumping back on drop, and never scrolls a list sideways
  - a drop keeps the list where you scrolled it, because scroll anchoring is off on `.ui-sortable`
  - a row dropped below the fold scrolls into view
  - a real row dropped into another list draws above every list, as a clone does
- **Tooltip**: after a long press on Android, the next tap on the trigger works.
- **Text fields on phones**: PasswordInput, Combobox, CommandPalette and the Select, CascadeSelect and Tree filters no longer autocapitalize or autocorrect what you type. ColorPicker’s hex field and Editable show “Done” on the keyboard.
- **PasswordInput**: `autocomplete` defaults to `new-password` when the field shows requirements, so phones suggest a strong password, and to `current-password` otherwise, so saved passwords fill in.
- **InputNumber**: on phones, a field that allows negative numbers opens the full keyboard, because iPhone number pads have no minus key. A whole-number field that can’t go negative opens a digits-only keypad.
- **Safe areas**: in apps that use `viewport-fit=cover`, Toaster, BottomSheet and full-height drawers keep clear of the notch and the home indicator.
- **Dialog**: scrolling to the end of a long dialog no longer scrolls the page behind it.
- **DataTable**: changing page no longer flashes the table. Before, the old page’s rows stayed for two frames, doubling the table’s height, and then every new row faded in. Now the new page shows at once, and a removed row leaves the layout at once, so the rows below slide up.
- **Dock**: with `magnify` off, moving over the dock no longer clears the transforms your own animation sets on its items.
- **v-draggable**: a decorative child marked `aria-hidden`, such as Tabs’ sliding highlight, no longer counts as a row. Before, it shifted every row by one, so a drag moved the wrong item.
- **v-draggable**: grabbing a row while the last drop is still settling no longer leaves a row stuck off its slot.
- **PasswordInput**: Edge no longer adds its own reveal button. Only `revealable` shows one.
- **Dialog, Drawer, BottomSheet**: a closing overlay lets taps through while it animates out, so a tap on a button or a dock right after closing works the first time.
