---
'vael-ui': patch
---

**Breaking: `Button`'s `loading` prop now defaults to `false`, not `'auto'`.** A promise-returning
`@click` handler no longer triggers loading automatically — opt in with `loading="auto"`. The old
default fired for any thenable regardless of user-facing meaning (e.g. router `navigate()`),
which showed an unwanted spinner and cursor on ordinary link clicks. Migration: add
`loading="auto"` anywhere you relied on the implicit default.

Also drops `cursor: progress` from the loading state — purely visual, no accessibility role, and
not what other component libraries do.

---

`DataTable`, `FileUpload`, `SpeedDial`, `SwipeToReveal`, and `Stepper` now follow the same
animation-agnostic contract as `Dialog`/`Popover`/`Toaster`: a `motionCss` prop gates the built-in
CSS transition, and `false` hands a `(el, done)` hook to a matching event instead
(`@row-enter`/`@row-leave`, `@item-enter`/`@item-leave`, `@action-enter`/`@action-leave`) so GSAP,
motion-v, or anything else can own the animation instead.

`DataTable` specifically:

- Row expansion now animates open/close (fade + a measured real height, not a fixed one), and
  sort/paging reorder animates via the same mechanism. The expand chevron points right when
  collapsed and rotates down when expanded, matching `Tree`'s own convention.
- Pagination itself doesn't animate — rows snap on page change rather than fading, matching how
  every other table library handles it. (Different pages can have different row counts, which
  made a per-row fade look like a broken partial crossfade; only single-row expand/collapse
  animates now.)
- `selectionMode="row"` clickable rows get a subtle `scale(0.99)` press, matching the button-press
  feedback used elsewhere in the library.

---

Fixes:

- `DataTable`: sorting a `Date`-valued column now compares chronologically instead of falling
  through to string coercion, which sorted by weekday name (`Date.toString()` puts the weekday
  first) rather than by date.
- `Calendar`: when `Intl.Locale.weekInfo` isn't supported by the engine, the first-day-of-week
  fallback is now Monday (ISO 8601) instead of Sunday — a better blind guess for the majority of
  locales when the real per-locale answer isn't available. Explicit `firstDayOfWeek`/`locale`
  props are unaffected.
- `Toaster`, `Pagination`, `DatePicker`, `DataTable`: several `aria-label`s that were hardcoded
  English strings now flow through the `messages` i18n system like every other label in the
  library (`messages.toaster.label`, `messages.pagination.*`, `messages.datePicker.chooseDate`,
  `messages.dataTable.*`).
- `Combobox`: documented the existing 100-item auto-virtualize threshold on the `virtualize` prop
  (already true, wasn't written down — `Select`'s own doc already had it).

---

Adds `PasswordInput` — a password field with a reveal toggle and a requirements hint, composing
`Input` the same way `InputNumber` does.

- Reveal toggle (`revealable`, default `true`) sits in `Input`'s `#end` slot, stays in the normal
  tab order, and flips `type="password"`/`"text"` plus its own `aria-label`. Reveal state is a
  real `v-model:visible`.
- The requirements hint's _placement_ is the component's job (`hintPlacement: 'inline' | 'popover'
| 'none'`, default `'popover'`); its _content_ is entirely the consumer's (`rules` prop —
  `{ label, test(value) }` pairs — or a `#hint` slot for full override). No built-in default rule
  set: pass `rules` and/or `#hint`, or the hint doesn't mount.
- `autocomplete` has no default on purpose: `current-password` for login, `new-password` for
  signup/reset.
- Exposes `{ el, inputEl, visible, hintPanelEl, closeHint, cancelCloseHint }`; themeable via a
  `passwordInput` entry; i18n via `messages.passwordInput.{show,hide}`.
