# Working on vael-ui — a playbook for Claude agents

This is not an architecture reference — `README.md` already covers the CSS
layer strategy, theming, i18n injection, the layer stack, Toast internals,
and the Vapor/SSR spike results in depth. Read that first for _what the
codebase is_. This file is _how to work on it_: the conventions every
component follows, the verification discipline that catches real bugs
before a human does, and the mistakes worth not repeating.

If you only read one section, read "Verify, don't trust" — most of the real
bugs caught in this codebase were caught there, not by writing careful code
the first time.

## What this library is

A Vue 3 component library (`packages/ui`) built around two commitments that
shape almost every other decision here:

1. **Animation-agnostic.** Every component ships a real built-in animation,
   but a consumer using motion-v, GSAP, or their own spring library must be
   able to fully replace it — never fight it. See "The animation-agnostic
   contract" below.
2. **Apple's fluid-interface principles, actually implemented, not just
   cited.** Direct manipulation (never gate a live drag behind a CSS
   transition), velocity-aware commit decisions, rubber-banding instead of
   hard stops, spatial consistency between enter/exit. These aren't
   aspirational — `useResizable.ts`, `useSheetDrag.ts`, `useSwipeReveal.ts`,
   and `usePullToRefresh.ts` all share the literal same dampening curve and
   the same `0.11 px/ms` velocity threshold (lifted from Sonner, via
   `Toaster.vue`), reused verbatim, not re-derived per component.

`packages/playground` is a Vite app that dogfoods the library — every demo
uses real `vael-ui` components, never a bare `<button>` or hand-rolled pattern.
If you're building a demo and reach for raw HTML, stop: the component you
need either exists or is missing, and a demo is not the place to route
around that.

## The component-building playbook

Every component in this codebase follows the same shape. When adding a new
one, match it — don't improvise a variant.

**File shape:**

- `<template>` first, then `<script lang="ts">` (only if the component
  needs to export types — a prop shape, an item interface), then a large
  **comment block OUTSIDE `<template>`**, then `<script setup lang="ts">`.
- **The comment never goes inside `<template>`.** A template-adjacent
  comment survives `unplugin-vue`'s production compile as a Fragment
  sibling, silently making the component multi-root — attrs fallthrough
  (including `@click`) then dies in `dist` while dev and tests pass clean.
  This bit `Button.vue` for real once; don't reintroduce it. The comment
  explains _why_, not _what_ — non-obvious tradeoffs, the reasoning behind
  a specific number, what was deliberately left out and why.
- **Default to zero new comments** beyond that one block. Never restate the
  same "why" in two places. If you're about to write a comment explaining
  what the code obviously does, delete it instead.

**The `ui` prop and theming:**

- Every component's `ui` prop is `Partial<{ partName: UiPartValue }>` —
  `UiPartValue` is a class string or `{ class, style }` (`classes.ts`).
  Resolve every rendered class through `resolveUiPart(cx, themedUi()?.part,
'ui-my-component', ...conditionalClasses)`, never a raw template literal.
- `useThemedUi((theme) => theme.myComponent, () => props.ui)` (`theme.ts`)
  merges an app-wide `ConfigProvider` default with the local `ui` prop,
  local winning per-key. Add your component's shape to `UiTheme`, appended
  as the **last** property — multiple agents landing entries concurrently
  in this file has worked cleanly all session precisely because each
  insertion targets unique, non-overlapping text.
- `style.css` is one file, everything inside a single `@layer
ui-components { ... }` block. Never create a second `@layer` statement —
  find your component's logical neighbors (a popover-chrome component goes
  near Select/Menu; a drag primitive goes near Resizable/Slider) and insert
  there. Comments explain WHY a value is what it is, matching the file's
  existing voice.

**Every component exposes real handles:**
`defineExpose({ el: root, ...subElements, ...imperativeMethods })` — a
consumer needs the actual root element and any imperative control
(`open()`/`close()`/`reveal()`/`focusDay()`) without reaching into
implementation details. Look at `Tree.vue`'s `focusFirstRow`/`initRoving`
exposure for the pattern of a base component handing a popover wrapper just
enough surface to do its own focus management without duplicating logic.

**Reuse, don't fork — two established splits:**

- **Headless composable + themed wrapper**, for anything with real pointer
  math: `useResizable.ts` / `Resizable.vue`, `useDock.ts` / `Dock.vue`,
  `useSwipeReveal.ts` / `SwipeToReveal.vue`, `usePullToRefresh.ts` /
  `PullToRefresh.vue`. The composable is pure where possible (see "Test the
  math separately" below) and DOM-free except for the actual event
  listeners; the component is a thin, `ui`-part-overridable shell.
- **Standalone base + popover-chrome wrapper**, for anything that can exist
  both inline and behind a trigger: `Tree.vue` is `TreeSelect.vue`'s panel
  content, extracted so it renders on its own; `Calendar.vue` is
  `DatePicker.vue`'s panel the same way. The wrapper owns
  trigger/positioner/open-close/auto-close-on-select and reuses
  `usePopover`/`useFloatingPosition` verbatim; the base owns 100% of the
  actual behavior and never knows a popover exists. When you need
  backward-compatible class names on the base (the wrapper's existing tests
  query specific classes), pass extra classes through the base's own `ui`
  prop rather than forking its CSS — `resolveUiPart`'s override composes
  onto the base classes, it doesn't replace them.
- **Popover anchored to an external, non-trigger-slot element:** `Tour.vue`
  positions its panel against whatever DOM node a `target` selector resolves
  to, not its own `#trigger` slot — `:trigger-el="targetEl"`, a plain ref to
  a node rendered elsewhere. `PasswordInput.vue` reuses this same
  `triggerEl`-as-a-plain-ref shape for its `hintPlacement="popover"` mode,
  anchoring against its own inner `Input`'s `inputEl` rather than anything
  Popover renders itself. Reach for this whenever a popover needs to track
  an element that isn't the thing that opened it.
- **Item-data shape reuse:** `MenuItemData` (`label`/`value`/`icon`/
  `disabled`/`onSelect`) is the house vocabulary for "a row with an icon and
  a click handler." `DockItemData`, `SpeedDialItem`, `ContextMenu`'s items,
  and `TreeSelectNode` all deliberately stay compatible with it (adding
  only what's genuinely component-specific — `badge` on a dock item,
  `children` on a tree node) so one item array can be shared across
  components in a consuming app.

**When a shared composable can't be touched safely:** if the "obviously
correct" fix requires widening a composable every floating component
depends on (`useFloatingPosition.ts`, `usePopover.ts`, `Menu.vue`), stop and
look for the workaround first. `ContextMenu.vue` needed point-anchored
positioning — the textbook fix is a Floating UI "virtual element," which
would have meant widening `Menu.vue`'s own trigger type (used everywhere,
high blast radius). It used a real zero-size DOM node moved to the cursor
position instead — behaviorally identical to `computePosition`, reached
with **zero changes** to any shared file. Read that component's own SFC
comment for the full reasoning; it's the reference example of "reuse
without risk."

## The animation-agnostic contract

A component with any built-in enter/exit motion needs:

- `motionCss?: boolean` (default `true`) — `false` disables every built-in
  transition/animation at once (`:css="motionCss"` on a `<Transition>`,
  `data-motion="off"` gating a CSS rule, whatever the component's specific
  mechanism is).
- `forceMount?: boolean` + `beforeClose?: (done: () => void) => void` for
  anything with a popover-style open/close lifecycle — lets a consumer keep
  the element mounted and drive visibility themselves (`v-show`), deferring
  the actual unmount until their own exit animation finishes.
- Real exposed refs to the actual animatable elements (`panelEl`, `listEl`,
  not just the root) so an external animation library has something to grab.
- A `#node`/`#item`/`#action` slot that replaces a row's _content_ while the
  library still owns the row's _behavior_ (click, keyboard, ARIA) — the same
  split Select's `#item` slot established, reused by Tree, TreeSelect, Dock,
  SpeedDial, SwipeToReveal.

Before shipping a new component, audit it against this list the way the
project's own animation audit did (see the audit findings that produced the
Slider/Dock/Calendar fixes below) — a missing `motionCss` on a component
with real motion is a real gap, not a nice-to-have.

**Apple fluid-interface specifics actually enforced here, with exact values:**

- Rubber-band curve (reused verbatim across every bounded drag):
  `dampen(overshoot) = DAMPEN_CONSTANT * Math.log(1 + overshoot / DAMPEN_CONSTANT)`.
  `DAMPEN_CONSTANT` scales with the drag's natural range — 60 for a
  size-drag-scale range (`useResizable.ts`), 40 for a short fixed-width
  reveal (`useSwipeReveal.ts`). Don't invent a new curve; port this one.
- Velocity-based commit: `0.11 px/ms` (Sonner's own constant) is the
  "was this a deliberate flick" threshold everywhere in this codebase —
  `Toaster.vue`, `useSheetDrag.ts`, `useSwipeReveal.ts`. A drag under that
  velocity falls back to a distance/midpoint decision instead.
- **Never gate a live drag behind a CSS transition.** The value being
  dragged is written directly (`el.style.translate`/`scale`, or a plain
  ref), zero transition, every single pointermove frame. Only the
  _settle-after-release_ gets `transition: ... var(--ui-duration-enter)`.
  Search style.css for `[data-resizing]`/`[data-dragging]`-gated rules for
  the pattern — the live-drag state suppresses the transition, the settled
  state re-enables it.
- Respond on `pointerdown`, not `click`/`pointerup`, for anything that
  should feel immediate.

## Test the math separately from the DOM

Every composable with real pointer/gesture math exports its **pure
decision functions** so they're unit-testable with known numeric inputs,
not simulated through unreliable synthetic pointer timing:
`dockFalloff`/`dockItemSize`/`dockItemSizes`/`dockItemOffsets`
(`useDock.ts`), `resolveSwipeCommit` (`useSwipeReveal.ts`). Real pointer
_velocity_ especially cannot be simulated reliably through dispatched
`PointerEvent`s in a test — dispatched events fire synchronously, so
back-to-back calls collapse elapsed time toward ~1ms, making even a few
pixels of movement compute as an absurd velocity. If a test needs to
exercise a "slow drag," it needs a real `setTimeout` delay long enough that
`distance / delay` genuinely lands under the velocity threshold — do the
arithmetic explicitly in a comment, this session got that math wrong twice
before landing on values that actually worked.

DOM-level tests then only need to prove the _wiring_ — that a real drag
calls into the composable correctly — not re-derive the math.

## Verify, don't trust

This is the single highest-leverage discipline in this codebase's history.
Concretely, every fix or new component in this session went through:

1. `pnpm --filter vael-ui typecheck` and `pnpm --filter playground typecheck` —
   both, always. Playground catches type errors that only surface once a
   component is actually _consumed_.
2. `pnpm --filter vael-ui test` — full suite, not just the new file. A shared
   composable change (however small it looks) can silently break every
   other component depending on it.
3. **Rebuild before any live check.** The playground consumes
   `packages/ui/dist`, never `src`, directly — `pnpm --filter vael-ui build`
   first, every time, or you're staring at stale behavior and drawing wrong
   conclusions about a "bug" that's actually just an unbuilt fix.
4. A real Playwright script against the actual running dev server —
   `getComputedStyle`, `getBoundingClientRect()`, real `mouse.down()` /
   `move()` / `up()` sequences, screenshots, zero-console-errors checks.
   Unit tests prove the code path; this proves the pixel.
5. **Re-verify a subagent's own self-report before repeating its claims.**
   Agents in this session reported success on work that had real bugs
   (Calendar's disabled-date test asserted the wrong expected value; Dock's
   magnification visibly overlapped neighboring icons; a fully-built
   ContextMenu was never actually wired into the demo app at all, making it
   completely unreachable despite "working" by every internal measure). All
   three were only caught by independently re-running the app and clicking
   around — not by re-reading the agent's code more carefully. Trust code
   review to catch consistency; trust live interaction to catch reality.

**Scope locators precisely on the playground.** It is one long single-page
gallery of 50+ demos. An unscoped selector (`page.locator('.ui-menu-panel')`,
`getByRole('heading', {name: 'X'})`) will silently match an unrelated
instance elsewhere on the page far more often than seems likely — this
happened repeatedly across the session. Scope to the specific
`section.demo` containing your target heading, or to a specific known
container, every time.

**A test's own math can be the bug.** More than once this session, a test
failure was traced back to the test's own assertion being wrong (an
expected value that didn't match what the fixture actually seeded, a
velocity calculation that didn't account for synthetic-event timing) rather
than a real component defect. Read the actual failure output before
assuming either direction — don't reflexively "fix" the test OR the
component; find out which one is actually wrong first.

## Dispatching background agents in this repo

- **Never pass `isolation: "worktree"` while the tree has uncommitted
  work.** A worktree branches from the last real commit, not the live
  working directory — any uncommitted file (which, in an active session, is
  most of them) is invisible to it, so the agent silently builds against a
  stale base. Check `git status --short` first; if it's non-empty, omit
  `isolation` entirely (direct-tree editing is the reliable default here).
- **Scope files explicitly between concurrent agents** and say so in every
  prompt — "Agent X owns file A, don't touch it; you own file B." This
  session ran up to five agents concurrently in the same live tree with
  zero collisions specifically because each prompt listed the other
  agents' exact file ownership.
- **Write self-contained prompts.** An agent has zero context from the
  conversation that spawned it — inline the exact convention (with a file
  reference to read first), the exact target values, the exact scope
  boundary. "Match the existing pattern" without naming the pattern's file
  produces plausible-looking but inconsistent code.
- **A killed/quota-limited agent leaves partial work, not zero work** — but
  which parts landed is unpredictable. After a kill, check `git status`
  before assuming anything: some agents had finished the component but not
  its export; some had the export but not the demo registration; some had
  the demo but not the theme entry needed for it to typecheck. Don't assume
  "the last message it sent" tells you how far it got — verify the actual
  files.

## Known toolchain gaps (don't re-discover these)

- `<Column field="typo">` type-checking (DataTable's generic column
  component) doesn't error under the current `vue-tsc` when `Column` comes
  from a destructured scoped slot rather than a direct import — a real
  toolchain limitation, not a typing gap in the library. Use `<component
:is="Column">` in demos/tests that need to prove the generic actually
  works, matching the existing DataTable demo's own documented workaround.
- Slider's thumb position moved from `inset-inline-start` (a logical,
  RTL-aware property) to a `translate` (physical, not logical) as part of
  the performance fix that made it compositor-only. RTL correctness for
  that specific rule was not verified — there's no RTL test or demo in this
  codebase yet to verify against. Flag this rather than assuming it's fine
  if RTL support ever becomes a real requirement.
- Volar's Vapor-mode template checker always validates a `v-x="..."`
  binding against the classic `(el, DirectiveBinding<T>)` overload, never a
  directive's actual getter-based Vapor overload (`(el, () => T)`) — so a
  non-primitive value on `v-draggable`/`v-tooltip`/`v-scroll-mask` errors in
  a hand-authored `<script setup vapor>` file even though it's correct at
  runtime (proven by `packages/vapor-ui/tests/built-draggable.test.ts`,
  which exercises the real built bundle). Not a typing gap in the library —
  suppress with `<!-- @vue-expect-error known Volar vapor-directive
typecheck gap, see generate-doc-demos.mjs -->` directly before the tag,
  matching `generate-doc-demos.mjs`'s `suppressKnownVaporDirectiveGaps` and
  `packages/vapor-ui/tests/fixtures/DraggableRoot.vue`.

## Where to look next

- `README.md` — CSS layer/theming/i18n architecture, the layer stack,
  Toast's real implementation history, Vapor/SSR spike results.
- `packages/ui/src/style.css` — read the section for whatever component
  you're closest to touching; the comments document _why_, not _what_, and
  are the fastest way to absorb a decision that isn't written down anywhere
  else.
- Any recently-added component's own SFC comment (`Tree.vue`,
  `TreeSelect.vue`, `Resizable.vue`, `Dock.vue`, `SwipeToReveal.vue`,
  `ContextMenu.vue`, `Calendar.vue`, `DatePicker.vue`, `PasswordInput.vue`)
  for a worked example of every convention above applied together.
