---
'vael-ui': patch
---

## Fixes

- **`SelectButton`:** with `allowEmpty` (the default), clicking the active option to clear it and
  then clicking that SAME option again to re-select it silently did nothing — the radio stayed
  visually cleared until you picked a _different_ option first. Root cause was a real click on an
  already-checked native radio: canceling that click (`event.preventDefault()`, needed to stop the
  browser re-affirming the option we're about to clear) also triggers the browser's own "canceled
  activation steps" for radio buttons, which unconditionally restore the input's checkedness to
  whatever it was _before_ the click — after Vue's own reactive patch already set it to unchecked,
  silently reverting it back to checked outside of any JS-observable property write. The next
  click then saw an already-checked native radio and never fired a `change` event at all.
  `preventDefault()` turns out to be unnecessary here anyway — a click on an already-checked radio
  is already a no-op by default (no native `change` fires either way) — so it's simply removed.

- **`Toaster`:** now takes a `ui` prop (`root`/`toast`/`icon`/`content`/`title`/`description`/
  `action`/`close`) and a `theme.toaster` slice, the same convention every other component
  follows — it was the one component still hardcoding its part classes with no way to theme it
  through `ConfigProvider`.

- **`DataTable`:** column header AND body cells were keyed by their raw array index
  (`:key="colIndex"`), not by column identity. Harmless for the header today (its drag/reorder
  animation is driven imperatively, by direct DOM measurement — never through Vue's own keyed
  diffing), but for the body it's a real bug waiting to happen: any `#cell` slot with its own local
  state (a focused input, an open popover) would silently keep that state in the same grid
  position after a column reorder, now showing a _different_ column's data behind it. Both now key
  on the column's `field`. Separately, worth understanding: only the header row visibly animates
  during/after a column drag — the body's cells re-render in the new order instantly, with no
  transition of their own, the moment the drop commits. That's not a bug so much as a boundary:
  `Sortable`/`Tree`'s draggable unit is a whole row, so animating "the sortable thing" already
  covers everything on screen; DataTable's draggable unit is only the header, and animating every
  visible row's cells on every column drag — worse under virtualization, where most rows aren't
  even mounted — is a different, much heavier feature than what this patch covers. Flagging it
  rather than quietly deciding it doesn't matter.

- **`DataTable`:** now takes a `ui` prop (`root`/`toolbar`/`table`/`thead`/`th`/`sortButton`/
  `grip`/`resizeHandle`/`tbody`/`tr`/`td`/`expansionRow`/`expansionContent`/`footer`) and a
  `theme.dataTable` slice — the last component in the library with visible parts but no way to
  theme them through `ConfigProvider`. `DataTableHead`/`DataTableBody` take their own slice of
  the same resolved overrides as a plain `ui` prop, the same split `Select`/`SelectListBody`
  already use, so only `DataTable` itself talks to the theme.

- **`SwipeToReveal`:** dragging over the row's own text no longer highlights it. The content pane
  now gets `user-select: none` for the span of a committed drag (`[data-dragging]`, the same gate
  already used for suppressing its release transition) — a horizontal mouse/touch drag over text
  is indistinguishable from a text-selection drag to the browser until this component's own
  8px-threshold hysteresis resolves it as a swipe, so without this the selection can start before
  that resolution and then keep growing for as long as the pointer keeps moving.

- **`Button`:** a custom `background`/`border`/`border-radius`/`box-shadow`/`backdrop-filter` on
  a badge-carrying `Button` (via a fallthrough `class` or `ui.root`) no longer paints a square box
  behind the actually-rounded button. That class rides onto the badge wrapper as well as the real
  button (so grid/`nth-child` placement still resolves against it, the actual outer element), but
  the wrapper now forces its own paint properties off — it's always an invisible shell, whatever
  the class contains. The button still receives the same class and paints everything normally.

- **`Menu`:** `.ui-menu-trigger` (the span wrapping the `#trigger` slot) is now `display:
contents`. It only ever existed for a click handler and a ref, but giving it a box meant a
  trigger styled `position: absolute; inset: 0` to cover its own parent lost its sizing — the
  wrapper, containing only an out-of-flow child, collapsed to near-zero and stopped
  participating in the real parent's layout the way the trigger used to directly. A
  `display: contents` element also has a zero rect, and Menu used to anchor the panel off the
  wrapper itself — fixed by resolving past it to the real trigger element (a new
  `resolvePastDisplayContents` export) before handing it to floating-ui, so the panel anchors to
  the trigger again instead of collapsing to the viewport's top-left corner.

- **`ScrollArea`:** a `max-height` passed to the component's own `class` now actually caps it.
  The viewport used `block-size: 100%`, which only resolves against an ancestor with an
  explicitly specified height — `max-height` alone never counts, so the viewport grew to fit all
  content regardless. The root is now a flex column with the viewport as `flex: 1 1 auto; min-block-size: 0`, which works against any root height, specified or capped.

- **`Field`:** a `float`-placement label no longer sits on top of a control's leading icon/slot.
  The label's resting position was a fixed `0.75rem` offset that assumed no leading content;
  `useFieldControl` now takes a `startInset` option so a control can report how far its real
  content starts from its own edge, and the label clears it. `Input` measures this off its own
  `#start` slot; `Combobox` and `InputNumber` inherit it for free since both wrap `Input`
  internally.

- **`Tooltip`:** the panel now animates its own width/height when its content resizes while it
  stays open (e.g. async content swapping in, a state change) instead of snapping instantly.
  Separate from the existing position "travel" glide, which never touched the panel's own box.
  Respects `prefers-reduced-motion`.

- **`Tooltip`:** warm-hovering between two different `v-tooltip` triggers (e.g. adjacent toolbar
  buttons) now actually glides instead of snapping straight to the next trigger, in both
  directions. Two compounding causes: (1) floating-ui's `autoUpdate` fires its position callback
  more than once per reference swap (its own observers settling independently, sometimes across
  the whole transition, not just at the start) — those extra fires used to be misread as sudden,
  large repositions, snapping straight to the target or cutting a transition short partway
  through; now ignored for the travel's full lifetime, since they carry no information the travel
  didn't already capture. (2) A safety valve that skips the glide when the two tooltips' sizes
  differ too much (avoiding a visible "stretch") used a size _ratio_ alone, which over-triggers
  for small tooltips — two adjacent toolbar tooltips at 40px and 72px are a 1.8x ratio but only a
  32px gap, nowhere near an actual stretch. The ratio now only bails once the absolute gap is
  large enough to actually look like one. Verified live (real interpolated position values
  through every adjacent hop, both directions) since this specific timing race couldn't be
  reliably reproduced in an automated test.

- **`Tooltip`:** fixed a flash of wrapped/doubled text during the warm-glide above. Content swaps
  to the new trigger's label the instant it's hovered, but the box is briefly pinned to the old
  (or a mid-tween) size — a label that only needs one line at its real target width can wrap to
  two at that narrower size, and for one frame (before the panel's own clip engaged) that extra
  wrapped line was fully visible, then abruptly cut off for the rest of the transition. The
  panel now also gets `white-space: nowrap` for the travel's whole span (not just once the CSS
  transition itself is running), so it reveals the label horizontally as the box grows instead of
  ever wrapping.

- **`Tooltip`:** the warm-glide's own transition now uses the same duration/easing tokens
  (`--ui-duration-tooltip` + `--ui-ease-out`) as the panel's same-trigger resize animation, instead
  of the generic press duration and a symmetric in-out curve — both are "the tooltip box
  resizing/repositioning," so they read as one consistent motion instead of two slightly different
  speeds, and the glide is a touch quicker as a result.

- **`Tooltip`:** fixed a subtle bottom/right-edge "expand" at the very end of the warm-glide
  between two triggers. The glide's target width/height came from `offsetWidth`/`offsetHeight`,
  which round to the nearest integer pixel, while the panel's real (unlocked) size is a
  fractional layout value — e.g. a panel truly `26.42px` tall got locked to `26px` for the whole
  CSS transition, then snapped back up to `26.42px` the instant the lock was released at the end.
  The lock now reads the same fractional `getBoundingClientRect()` size used everywhere else in
  the travel math, so the locked size and the real resting size always match and nothing snaps on
  release.

- **`Stepper`:** the check-mark that swaps in for a step's number on completion no longer reads as
  laggy — two separate fixes, both confirmed by tracing the actual computed styles frame-by-frame:
  (1) it used `--ui-ease-in-out` (a steep, symmetric S-curve) instead of `--ui-ease-out`, which
  sits at near-zero velocity for roughly the first third of the transition — the number disappears,
  then there's a beat of almost no visible motion before the check-mark actually animates in.
  Every other fade/scale-in "appear" transition in the library (`Popover`, `Menu`, `Avatar`,
  `AccordionItem`, ...) already uses `--ui-ease-out` for exactly this reason; `Stepper`'s was the
  one outlier. (2) The check-mark swap ran on `--ui-duration-enter` (200ms) while the circle's own
  background/border/color fill — the _same_ "this step just completed" event — ran on
  `--ui-duration-press` (160ms), so the circle finished filling in solid roughly 40-50ms before the
  check-mark caught up on top of it. Two pieces of the same motion landing at different times reads
  as a stutter/catch-up glitch even though neither piece is individually slow. Both now animate on
  `--ui-duration-press`, landing together.

- **`Button`:** the `:active` press-scale no longer visibly pops on its first frame. A prior fix
  dropped the always-on `will-change: transform` (it forced a permanent compositor layer per
  button, leaking edges past clipping ancestors) but left the browser to promote the layer
  just-in-time once the transform actually started, which could show as a one-frame jump before
  settling. `will-change: transform` is back, scoped to `:active` itself, so the layer exists only
  for the duration of the press — no permanent layer, no JIT-promotion pop.

## Internal hardening

- **`useTooltip`:** the travel animation's pending `requestAnimationFrame`/`setTimeout` calls are
  now actually cancelled — on scope dispose and whenever a newer travel/reposition supersedes an
  in-flight one — instead of just being token-invalidated to no-op whenever they eventually fire.
  A `<Tooltip>` unmounted mid-transition (e.g. its host list item removed while animating) no
  longer leaves that work scheduled, holding its closure alive until it fires on its own.
- **`useFloatingPosition`:** `update()`'s async `computePosition()` result is now discarded if a
  newer call has since started (or the scope was disposed) — previously whichever call happened
  to resolve LAST won, even if an EARLIER call for a newer reference/config resolved first, so a
  reference swap under `autoUpdate`'s own redundant re-fires could leave the position briefly
  wrong, and a disposed instance could still write into refs nothing will read again.

## `Button` reminder

The badge wrapper is still conditional on `#badge`/`badgePlacement` (unchanged from 0.3.4) — set
`badgePlacement` up front on any badge-carrying `Button` that's grid- or `nth-child`-placed, so
its DOM shape doesn't change the moment a `v-if`'d badge first appears.

## Internal

- Bumped `vue` (and all `@vue/*` packages) to `3.6.0-rc.8` across the workspace.
