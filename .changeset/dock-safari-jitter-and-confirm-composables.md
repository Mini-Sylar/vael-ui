---
'vael-ui': patch
---

Add `confirmDialog()` and `useConfirmAction()` for building async-aware confirm flows (delete confirmations, destructive-action gates) without a dedicated `AlertDialog` component. `useConfirmAction()` is presentation-agnostic — bind its `open` ref to any overlay's own `v-model:open` (`Popover`, `Dialog`, or a fully custom surface), anchored however that overlay already supports (`Popover`'s existing `#trigger` slot or `triggerEl` prop, unchanged). `confirmDialog()` is a thin convenience wrapper over the existing `openDialog()` service for the common "title + description + Cancel/Confirm" shape, still accepting a custom `body`/`footer` component for full control. Both share the same core behavior: `confirm(action)` keeps the surface open and `pending` true until `action` settles, closing only on success — a rejected action clears `pending`, sets `error`, and leaves the surface open instead of closing out from under a failed action.

Fix `Dock`'s pointer-proximity magnification visibly juddering in Safari. The live per-item `transform` was written every `pointermove` frame while a CSS `transition` was still active on that property, so Safari was continuously retargeting an in-flight transition — Chromium mostly masked it, Safari didn't. Replaced with a small `requestAnimationFrame` spring loop (exponential decay toward each item's target scale/offset) that owns the live tracking entirely; the CSS transition now only ever governs the discrete press-shrink feedback.

Fix `Accordion`'s `motionCss={false}` being unable to close. `useCollapse`'s settle logic was forcing the resting style to `{}` (visually open) whenever motion was disabled, regardless of the target open/closed state — so disabling the built-in transition also silently disabled closing. `motionCss={false}` now still snaps instantly to the correct open/closed resting style, just without the animated transition.

Fix `Calendar`'s month-change slide briefly bleeding into the weekday header row — the leaving month's grid was `position: absolute` against the wrong containing block (the whole calendar body, which the weekday row also shares), landing it on top of the header text for one frame instead of at the grid's own top edge.

Fix `SelectButton`'s sliding indicator popping in instantly with no transition on the very first selection (starting from nothing selected). The indicator's first-measurement guard was only tracking whether the component had ever measured at all, not whether it had ever shown a real selection — so the first real pick was mistaken for the initial-mount case and had its transition suppressed.

Fix `OtpInput`'s blinking caret drawing through an already-typed digit instead of only appearing in the next empty cell, and fix a one-frame focus flash on the wrong cell when clicking back into a completed code — the browser's own default caret placement (based on the invisible input's unstyled text metrics) was landing and painting before the click handler's correction ran; both are now resolved before any paint by handling pointerdown with `preventDefault()` instead of click.

Fix `Toolbar`'s vertical orientation not being vertically centered when only one of its three internal slot groups (start/center/end) had content — the two empty groups were still full flex participants contributing gap spacing. Toolbar now only renders a slot group when it actually has content.

Fix `Toast` alignment (action button text centering, close-icon sizing) and `Radio`'s icon being misaligned with its label text.

Fix `BottomSheet`'s swipe-to-dismiss being inconsistent on mobile — dragging down past the lowest snap point wasn't always registering as a dismiss gesture.

Fix `Badge`'s count text rendering visibly offset from center.
