---
'vael-ui': patch
---

## Features

- **useColorScheme:** design your own theme switch with `motion`, written like a component's `motion`. The page as it was leaves to `exit.old` and the new scheme comes in from `initial.new`, both turning and scaling about where the switch starts:

  ```ts
  const { setMode } = useColorScheme({
    motion: { duration: 800, exit: { old: { scale: 0, rotate: -180 } } },
  })
  ```

  Every switch from that call plays it. Values take their own timing, arrays play as keyframes, and a snapshot that sets its own `transformOrigin` keeps it, so a 3D cube turn or a starburst from the click is a few lines. `setMode(mode, { motion })` overrides it for one switch, and `motion: false` switches at once. You write no CSS, and the code loads only when a switch uses it. `from` is now optional: without it, the switch starts from the centre of the screen, as for a keyboard shortcut. The type is `ColorSchemeMotion`.

- **useDragSelect:** `items` takes a CSS selector for items at any depth in the box, such as the cards in a board's columns: `useDragSelect({ el: board, items: '.card' })`. A band crosses columns, a press on a card leaves the card to its own drag, and a card scrolled out of view in its column isn't selected. `selected` lists the matches in document order. Without `items`, the box's children are the items, as before.
- **Menu, ContextMenu:** submenus have a safe triangle. Heading diagonally from a row to its open submenu across the rows below it no longer opens the submenu of a row you pass over: while the pointer moves inside the triangle between where it left the row and the submenu's near edge, the submenu stays open, however slowly you move. Moving back toward the list, leaving the triangle, or resting for 300 ms hands over to the row under the pointer at once. Hovering a row opens its submenu after 100 ms instead of 150 ms. Its code loads with the first submenu you open.
- **Combobox:** when your text matches nothing, the list says so: `No results for "kiwi"`. The new `combobox.emptyFor` message carries it, with `{query}` replaced by your text. With nothing typed, it still says `No results`.

## Behavior changes

- **Popover, Dialog, Drawer, BottomSheet, CommandPalette, Tooltip, Menu, Select, Combobox, DatePicker, TreeSelect, ColorPicker, Tour:** a closed overlay no longer renders its panel. The panel mounts the first time it opens, and the first open animates as before. If your code reads a closed panel's DOM, pass `forceMount` to keep it mounted from the start.

## Performance

Measured against 0.5.7 in Chromium at 4× CPU slowdown, 100 instances per mount and 1,000 options per list:

- **Select, Combobox:** long lists open and respond far faster. With 1,000 options and `virtualize` off, opening the list went from 284 ms to 14 ms, an arrow key from 46 ms to 1.3 ms, and filtering a Combobox from 36 ms to 10 ms. Each option renders once on open instead of about seven times. Options out of view, in blocks of 50, skip style, layout and paint until they scroll near, and stay findable with find in page and readable by screen readers. Options from a custom `#item` slot always render in full and still get a live `active`. The panel is capped at its max height from its first layout, so opening lays the list out once.
- **Popover, Select, Combobox, Menu, Tooltip, DatePicker and every other floating panel:** each loads what only an open panel needs on its own, starting as the component mounts: the positioning code, the Select and Combobox list, Select's filter field, and the hover highlight of menus, lists and trees. An app ships far less up front, gzipped: Select 39.7 KB → 25.9 KB, Combobox 39.8 KB → 27.9 KB, Menu 31.9 KB → 24.3 KB, Popover 24.3 KB → 18.0 KB, Tooltip 23.1 KB → 17.0 KB, DatePicker 34.0 KB → 27.8 KB. The parts normally arrive long before the first click, even on a slow connection. A panel opened before they have waits for them and comes in whole, in place, with its entrance.
- **Mounting:** components mount 8% to 49% faster. 100 Tabs mount in 105 ms instead of 206 ms, Select in 75 ms instead of 106 ms, and Dialog, Popover, Menu and Tooltip about 25% faster. A page of every component hydrates 17% faster.
- **Closed overlays:** a closed Popover, Dialog, Drawer, BottomSheet, Menu, Tooltip, DatePicker, TreeSelect, ColorPicker, CommandPalette or Tour costs almost nothing. It mounts no Teleport, Transition, observers or drag listeners until it first opens, and its motion resolves nothing until then. A closed Tooltip sets up about half the watchers it did, and a closed Menu no longer waits for web fonts.
- **Every component with built-in motion:** when you don't customise its motion, it sets up less and ships less. The code for its timing, states and `replay` loads only once you customise it, so an app using Button, Switch, Checkbox or Input ships 330 B to 800 B less gzipped.
- **Checkbox:** mounts about 9% faster. The indeterminate dash is now drawn by the box itself, with the same look and fade.
- **Tabs, SelectButton, menus and other sliding highlights:** a page with many of them no longer slows down as it grows, since each highlight no longer looks through every animation on the page.
- **Button, Switch, Radio, Field, Tabs, SelectButton, Pagination, Chip, ContextMenu, Select, Combobox, Input:** each renders once on mount instead of twice. A Button that is a real `<button>` without `hold` listens for clicks only.
- **Field:** typing and focus no longer re-render it. `data-filled`, `data-focused` and `data-frame-size` are written straight on its element.
- **Accordion, AccordionItem, Collapsible:** closed items render once on mount, and each item sets up less. Panels stay findable with find in page.
- **Floating panels:** an open panel re-renders only when it moves. DatePicker, TreeSelect and ColorPicker draw their content once on open, not again as the panel is placed or the page scrolls. Popovers add their document listeners when they open and remove them when they close.
- **Input, Textarea, InputNumber, Progress, Slider:** each sets up only what you use. Input's clear button, start slot and `#display` overlay wait until needed, Textarea observes its size only with `autoGrow`, fields with the same locale and options share one number formatter, and Slider listens on the window only while you drag.
- **v-scroll-mask, `scrollFade`:** a box with a scroll fade no longer restyles everything inside it when it mounts or resizes, or measures its content again as a highlight moves inside it. The clear buttons' transition rules no longer run against every element on the page.

## Fixes

- **animate():** a new call on an element stops only the values it names. Before, `animate(el, { opacity: 0 })` right after a move cancelled the move. `x` and `y` are separate values: `animate(el, { y: 50 })` keeps `x` where it is instead of resetting it to 0. In a sequence, overlapping steps on one element both play, so a hop on `y` with a slide on `x` lands at both ends.
- **v-animate:** a live value, a getter or a ref in `animate`, shows where it says while the element's entrance plays. Before, the entrance eased each new value in over 250 ms, so a selection band fading in trailed far behind the pointer.
- **v-animate `layout`:** content that follows its layout no longer slides when something around it enters, so grouped Select options with their own entrance no longer jitter on open. Content that follows its size inside a panel scaling open no longer nudges the rows below it.
- **v-hover-indicator, useHoverIndicator, and the highlight in Select, Combobox, Tabs and menus:** the highlight goes where the row rests, whatever moves it: an entrance, a slide after a delete above it, or a GSAP tween. It's in place from the first frame and doesn't move once the row stops.
- **ConfigProvider:** overlays inside a nested provider keep the outer provider's theme. Before, a Dialog, Popover, Select panel or Tooltip inside a nested ConfigProvider with its own `motion: false`, `spring` or `theme` lost the outer colours, so a primary Button in it turned black. The nearest provider still wins where both set a value.
- **useColorScheme:** your own CSS animation on `::view-transition-old(root)` or `::view-transition-new(root)` plays instead of the circle. A ConfigProvider with `motion: false` switches at once, like reduced motion. `duration` and `easing` default to the `--ui-duration-drawer` and `--ui-ease-drawer` tokens (500 ms, `cubic-bezier(0.32, 0.72, 0, 1)`), so a theme or a ConfigProvider `spring` retimes the reveal.
- **BottomSheet:** a sheet in a `container` slides up as it opens. Before, it appeared at its snap point at once. On a touchscreen, dragging down from the sheet's content now moves the sheet from where your finger touched down. Before, the drag stopped about 10 px in. `useSheetDrag` rests a panel that mounts as it opens on its snap point.
- **useDragSelect:** a band starts where you press and stays anchored there, as in a desktop file manager. Before, a press near the edge of a scrolling box scrolled it at once, so the band slid away from the pointer, and a new band showed briefly where the last one ended. An edge now scrolls only once the drag heads toward it.
- **useDrag:** a press anywhere on a thrown element catches it, not only a press on its `handle`. A drag on an element already moved by an earlier drag, a throw or `throwTo` follows the pointer 1:1 again instead of running away on one axis.
- **Sortable:** `virtualize` in a column that scrolls on its own draws every row as you scroll. Before, rows past the first screen collapsed and the column stopped scrolling.
- **Tour:** a step that opens a Drawer, Dialog, BottomSheet or CommandPalette keeps focus in the callout, so Tab reaches its buttons and Enter on Next advances. A tour skipped on its first step focuses its callout when restarted, and a tour that ends with a step's overlay open puts focus on the last step's target.
- **Tooltip:** with your own `motion`, a tooltip hovered again while it fades out turns back from where it is instead of jumping to full opacity.
- **Select, Combobox:** the listbox carries the field's name, from its Field label, `aria-labelledby` or `aria-label`, so a screen reader names the list as focus moves into it. With `motion: false`, the chevron turns at once.
- **v-scroll-mask, `scrollFade`:** a child moved by a transform, such as a dragged tab settling back, no longer turns the sideways fade on, so the tab no longer disappears past the box's edge.
- **Resizable:** each handle has `aria-controls` pointing at the box it resizes, as the APG window splitter pattern asks. The box uses your `id` if you set one.
