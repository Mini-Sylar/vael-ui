# vael-ui

## 0.2.6

### Patch Changes

- [`35f5030`](https://github.com/Mini-Sylar/vael-ui/commit/35f50308f7d44827ae984adccf445a57ae542a26) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Adds `expandOnRowClick`, `selectableFolders`, and `stickyScroll` to `Tree`/`TreeSelect`, plus a
  small set of exposed methods for controlling expansion programmatically and three standalone tree
  utilities.

  - `expandOnRowClick`: clicking anywhere on a folder row also toggles its expansion, not just the
    chevron — it still selects too. Off by default, since it changes what a plain row click does.
  - `selectableFolders`: `false` keeps a node with children out of the selection entirely — click,
    keyboard Enter/Space, and `expandOnRowClick`'s own select-on-expand all skip it, only a leaf can
    become the value. Useful for a file-explorer-style tree where browsing through folders shouldn't
    replace whichever file is currently open. Has no effect in `selectionMode="checkbox"`, which
    already only ever puts leaves in the model. Default: `true` (a folder can be selected like any
    other node — today's existing behavior).
  - `stickyScroll`: pins each expanded ancestor's row to the top of the list as its own children
    scroll past, VS Code-style, using native `position: sticky` — each row is a real, nested DOM
    level, not a JS-measured overlay, so multi-level stacking and unstick timing come from the
    browser instead of scroll math.
  - Exposes `expandAll()`, `collapseAll()`, `expandNode(value)`, and `collapseNode(value)` on both
    `Tree` and `TreeSelect`, so a consumer can drive expansion state directly (e.g. auto-expanding
    the folder a newly created file just landed in).
  - New standalone exports `findTreeNode`, `findTreeParent`, and `removeTreeNode` — the same
    depth-first lookup/removal `Tree` already needed internally, generic over any `T extends
TreeNode`, so a consumer doesn't have to hand-roll the same recursion for their own `items` array
    (e.g. resolving a selected value back to its node, or deleting a node after a context-menu
    action). Also bound per-instance as `findNode`/`findParent`/`removeNode` — pre-scoped to that
    `Tree`/`TreeSelect`'s own `items` — on both the `#node` slot's scope and `defineExpose()`, so
    they're reachable from inside a custom row template or from outside via a template ref.
  - New `v-model:node` — mirrors `modelValue`'s selected value(s) as the actual node object(s) (`T`
    or `T[]` depending on `selectionMode`, matching `modelValue`'s own shape), resolved via
    `findNode` internally. Without it, reading anything beyond the bare `value` off a selection (an
    app-specific field, the node's `label`, its `children`) meant a manual `findTreeNode` lookup on
    every change — a mismatch with how much of that data `items` typically carries. Read-mostly:
    it's derived from `modelValue`/`items`, not an independent selection channel, so writing to it
    directly has no lasting effect.

  Internally, `Tree`'s row rendering moved from a single flat list to a recursive per-node component
  (`TreeNodeRow`) — required for `stickyScroll`'s native nesting. Each folder's own children still
  fade in/out locally; a small hand-rolled FLIP pass (measuring every row's position before/after any
  expand/collapse) now handles a row shifting because a _different_, nested folder elsewhere changed
  height, which a per-folder transition alone can't see. No public API changes beyond the additions
  above — existing `Tree`/`TreeSelect` usage is unaffected.

  Also fixes:

  - `Tree`/`TreeSelect` rows not shrinking below their content's natural width — a row (or, most
    visibly, an in-place rename `<input>`) could push the whole tree wider than a narrow or resized
    container instead of truncating/shrinking to fit.
  - `v-tooltip` rendering an empty bubble in an app that mixes the VDOM and Vapor builds (e.g. this
    docs site's own Vapor demo toggle): the directive's shared target map was a plain module-scope
    `WeakMap`, so the VDOM and Vapor bundles each got their own separate copy instead of one shared
    store, and the single `<TooltipHost/>` could only ever see whichever copy it was built from.
    Backed by `globalThis` instead, so every bundled copy of the directive shares the same map.
  - `Stepper`'s connector line drifting off the step number for any step whose title or description
    wraps to multiple lines — it was vertically centered against the whole trigger instead of
    anchored to the trigger's own top edge. That anchor fix left single-line labels sitting slightly
    above the circle's own center (top-aligning a short label against a taller circle no longer
    centers it), so the label now gets a `line-height` matching the circle's own size instead,
    centering its text regardless of whether a description follows.
  - The Vapor build's barrel silently dropping a component's own extra named exports (only its
    default export survived) — caught while adding `findTreeNode`/`findTreeParent`/`removeTreeNode`
    above: the compiled `dist/vapor` barrel had them missing from both the runtime bundle and its
    `.d.ts`, even though the VDOM build and the underlying generated Vapor source both had them, and
    even though `quarterCirclePoint` (a preexisting `SpeedDial` export) turned out to have the exact
    same problem already. Both build scripts (`generate-vapor.mjs`, `emit-vapor-types.mjs`) now list
    a component's extra exports explicitly instead of relying solely on a wildcard re-export.

  Bumps the `vue` dev dependency to `3.6.0-rc.4` across every package and playground (no change to
  the `peerDependencies` range, which already accepted `3.6.0-0` and up). Notably, vuejs/core#15275,
  fixed in rc.4, resolves the upstream bug directly at its source: a Vapor component whose root
  wraps its content in `<Transition>` would have an externally-passed `class` _replace_ its own
  internal classes instead of merging with them (e.g. passing `external-class` to `<Message
class="external-class">` left the element with only `external-class`, dropping `ui-message
ui-message--warning` entirely). The `inheritAttrs: false` + `v-bind="attrs"` workaround already
  shipped in this library stays correct either way and needs no change, but the regression test now
  exercises the real upstream fix too, not just the workaround.

  The docs site also gained an "AI Agent Skill" guide page (documenting the companion
  `vael-ui-skills` package) and a fix for the props playground's `Tour` demo rendering its
  spotlight/overlay against the whole page instead of its own preview pane. The "A Small VS Code"
  `Tree` demo was reworked to use the new `findTreeNode`/`findTreeParent`/`removeTreeNode` exports
  instead of its own hand-rolled copies (`v-model:node` for the one case — the open file's own
  data — that lookup existed for in the first place), and switched from a `<ContextMenu>` per row
  to a single shared instance retargeted on right-click — the per-row version meant a full popover
  instance (positioning, focus trap, portal) for every file/folder in the tree, whether or not it
  was ever opened.

## 0.2.5

### Patch Changes

- [#28](https://github.com/Mini-Sylar/vael-ui/pull/28) [`0f41be0`](https://github.com/Mini-Sylar/vael-ui/commit/0f41be0d8e524c7d88c93fd20f533022cfc60e95) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fixes an external `class` passed to a component (e.g. `<Message class="my-class">`) silently replacing the component's own internal styling classes instead of merging with them, under `vael-ui/vapor`. 36 components (Accordion, Card, Checkbox, DataTable, Tag, Toolbar, and others) now explicitly merge fallthrough attrs instead of relying on Vapor's implicit fallthrough, which doesn't reliably merge `class` on a component that already binds its own.

  Components whose root wraps content in `<Transition>` (Dialog, Popover, Message, Tooltip, and others) are not covered by this fix — that's a separate, upstream Vue 3.6 Vapor limitation in how `<Transition>` itself handles fallthrough attrs, tracked separately.

  Also bumps the `vue` dependency to `3.6.0-rc.3`, which fixes `AnimatePresence`/`<Transition>` deferring exit removal through a `<Teleport>` nested inside a component (e.g. a force-mounted `Dialog`) — the imperative `beforeClose` fallback is no longer required for that case, though it remains supported.

## 0.2.4

### Patch Changes

- [#26](https://github.com/Mini-Sylar/vael-ui/pull/26) [`32a8b7b`](https://github.com/Mini-Sylar/vael-ui/commit/32a8b7ba35dc66cf1aa04bf362c27045746b7db3) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fixes inconsistent internal spacing in Dialog, Card, Tour, and confirmAction's popover surface, where the gap on one side of a header/body/footer-style transition was silently double-counted against the other, making the two sides unequal (e.g. Dialog's body→footer gap was exactly double its header→body gap). Also fixes Tour rendering with doubled outer padding — its own header/actions padding was stacking on top of Popover's shared body padding.

## 0.2.3

### Patch Changes

- [#24](https://github.com/Mini-Sylar/vael-ui/pull/24) [`0a7d018`](https://github.com/Mini-Sylar/vael-ui/commit/0a7d0180369752ebc739ddda362b74f12a3d603e) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fixes `vael-ui/vapor` shipping with no CSS at all — the vapor build's generator was stripping every component's CSS import under the (incorrect) assumption a consumer would already have styles loaded some other way. It now copies each component's CSS alongside its generated source and keeps the import, the same way the main build already does.

  `packages/vapor-ui`'s build also moved from Vite library mode to `tsdown`, matching the main package's build exactly, so vapor gets the same real per-component CSS code-splitting — importing a single component only downloads that component's CSS, whether via `vael-ui/vapor` or the `vapor` export condition added in 0.2.1.

## 0.2.2

### Patch Changes

- [`c33d874`](https://github.com/Mini-Sylar/vael-ui/commit/c33d87486aafaa1a85b7ac2bb9b81d069ddebada) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fixes a build failure (`CIRCULAR_REEXPORT`, `MISSING_EXPORT`) in `vael-ui/vapor` for any consumer using the `vapor` export condition added in 0.2.1 — several composable/utility re-exports were pure passthroughs that resolved back to themselves once `vael-ui`'s root pointed at the same file. They now import from their real source files directly instead of through the package specifier.

  Also fixes `confirmAction`, which was excluded from the Vapor build in 0.2.1 (it rendered the real VDOM `Button` component internally) — it now composes real Vapor-compiled components, so it's available from `vael-ui/vapor` like every other composable.

## 0.2.1

### Patch Changes

- [#21](https://github.com/Mini-Sylar/vael-ui/pull/21) [`a78a3a9`](https://github.com/Mini-Sylar/vael-ui/commit/a78a3a9370a4a9fcc4d72b43400faafbab118cf4) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - `vael-ui/vapor` now also re-exports composables and utilities, not just components. This also enables a `vapor` export condition on the package root — set it in your bundler and `tsconfig.json` to use `vael-ui` everywhere with no `/vapor` subpath needed. See the [Auto Import guide](https://vael-ui.dev/docs/guides/auto-import#one-import) for setup; see the [0.2.0 release notes](https://github.com/Mini-Sylar/vael-ui/releases/tag/vael-ui%400.2.0) for the original Vapor/resolver docs.

## 0.2.0

### Minor Changes

- [#17](https://github.com/Mini-Sylar/vael-ui/pull/17) [`35d6fe3`](https://github.com/Mini-Sylar/vael-ui/commit/35d6fe3f09fee0ba8895456dfaf487766c1ea908) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Per-component CSS code-splitting, six new components (including `Tour`), large-data support for `DataTable`, a `vael-ui/resolver` for auto-importing components plus a `vael-ui/nuxt` module, container-scoped overlays, real link rows for `MenuList`/`Menu`, and broader generics across the item-based components.

  ## Per-component CSS code-splitting

  Every component now ships and imports its own CSS file instead of one bundled `style.css`.

  - Importing a component only pulls in the styles it actually uses — bundlers that tree-shake unused component imports drop their CSS along with them.
  - `import 'vael-ui/style.css'` still works unchanged (now resolving to a multi-entry build's combined output), for anyone who wants everything loaded up front or is on a pre-0.2.0 workflow. No import changes required either way.
  - Shared design tokens live in their own `components/shared/tokens.css`, pulled in once regardless of which components you use.

  ## New components

  - **`ScrollArea`** — custom scrollbar styling and edge fade over real native scrolling (`orientation: 'vertical' | 'horizontal' | 'both'`)
  - **`AvatarGroup`** — overlapping avatar stack with a "+N" overflow indicator and optional hover-lift
  - **`Breadcrumb`** / `BreadcrumbItem` / `BreadcrumbSeparator` — data-driven `items`, or compose the parts yourself. Each item's `as`/`attrs` renders it as a plain link, a `RouterLink`, or anything else your router provides
  - **`Stepper`** — linear or free-jump numbered step flow, horizontal or vertical
  - **`CommandPalette`** — ⌘K-style fuzzy-filtered command list, built on `Dialog`
  - **`Tour`** + **`useTour()`** — step-by-step spotlight walkthrough with grouped steps, a headless composable for a fully custom UI, and the same `container`-scoping and animation-agnostic contract as the rest of the overlay components

  ## `DataTable`: built for large data

  Server-driven sort/pagination, virtualization, and infinite-scroll wiring — designed to compose with `useInfiniteQuery`-style patterns rather than replicate them.

  - **`manualSort`** — `data` is already sorted server-side; `DataTable` stops sorting it locally and just reflects `v-model:sort`, so a header click tells you what to refetch instead of re-sorting what you gave it.
  - **`lazy` + `total`** — `data` is already just the current page; `DataTable` stops slicing it locally and uses `total` (the real across-all-pages count) for `#footer`/pagination math.
  - **`virtualize`** — windows rendering to only the visible rows + overscan, for tables with tens of thousands of rows. Row height is measured per-row by default (rows can wrap, or vary under `stackedBreakpoint`), not assumed uniform.
  - **`reach-end`/`reach-start`** events fire as the virtualized window nears either edge — wire them straight to `useInfiniteQuery`'s `fetchNextPage`/`fetchPreviousPage`.
  - **`v-model:sort`** — sort state (`{ field, dir }`) is now a real two-way binding instead of purely internal.
  - `scrollHeight` tables now split the header into its own non-scrolling row above a separately scrollable body, so the browser's scrollbar starts at the body instead of overlapping the header.
  - `selectionMode="row"` now shows a pointer cursor on every row, matching the click-to-select affordance.

  ## `vael-ui/resolver`: auto-import components

  A resolver for [`unplugin-vue-components`](https://github.com/unplugin/unplugin-vue-components) — register it once and every vael-ui component becomes usable in a template with no manual import at all:

  ```ts
  // vite.config.ts
  import Components from "unplugin-vue-components/vite";
  import { VaelUiResolver } from "vael-ui/resolver";

  export default {
    plugins: [Components({ resolvers: [VaelUiResolver()] })],
  };
  ```

  Pass `{ variant: 'vapor' }` to resolve from `vael-ui/vapor` instead of the default VDOM build. No CSS side-effect wiring needed — every component already imports its own CSS internally, so resolving the component pulls its styles in for free. Zero dependency on `unplugin-vue-components` itself; the resolver is a plain, hand-typed function that structurally matches its contract.

  ## `vael-ui/nuxt`: a Nuxt module

  Same idea as the resolver, for Nuxt apps — register the module once and every component is usable with no manual import, using Nuxt's own built-in component registration instead of `unplugin-vue-components`:

  ```ts
  // nuxt.config.ts
  export default defineNuxtConfig({
    modules: ["vael-ui/nuxt"],
  });
  ```

  `exclude: ['Button']` skips specific component names, e.g. to register your own `<Button>` under that tag instead. VDOM only, no `variant` option — Vue 3.6 supports Vapor SSR hydration, but the stable Nuxt release has no Vapor configuration yet (it's landing behind specific upstream PRs). Verified against a real Nuxt app: SSR markup, client hydration, and CSS all confirmed working in both `nuxt dev` and a production `nuxt build`.

  ## Container-scoped overlays

  `Dialog`, `Drawer`, `CommandPalette`, `Popover`, and `Tour` all gained a `container` prop that scopes the overlay to one element instead of the whole viewport — the scrim only dims that element, the panel teleports there instead of `body`, and scroll-lock/inert apply only inside it, leaving the rest of the page interactive. Useful for embedding a live overlay demo (a dashboard preview, a docs example) without it taking over the whole screen.

  `BottomSheet` doesn't support `container` yet — its drag mechanics still assume the full viewport.

  New composables back this:

  - **`useScrollLock`** — ref-counted, per-element locks so nested overlays compose correctly
  - **`useInert`** — scopes inertness to a container instead of the whole document
  - **`useLayerStack`** additions — scope Escape-key/layer ownership to an element

  Original contained/scoped `Dialog` implementation from [@arkida39](https://github.com/arkida39) ([#16](https://github.com/Mini-Sylar/vael-ui/pull/16)), extended here to `Drawer`, `CommandPalette`, `Popover`, and `Tour`.

  ## `MenuList`/`Menu` rows can now be real links

  A row's `as`/`attrs` (default `'button'`, so nothing existing changes) renders it as `<a>` or `RouterLink` instead — native cmd/ctrl/middle-click and "open in new tab" work, which a `<button>`-only row never could. A row with nested `items` (a submenu trigger) always stays a button.

  ## Broader generics

  `SelectButton`, `SpeedDial`, `Tour` (and `useTour`), `Tree`, `TreeSelect`, and `CascadeSelect` join `Select`, `Combobox`, `DataTable`, `Menu`, `MenuList`, `CommandPalette`, `Breadcrumb`, and `Stepper` in being generic over their item type (`T extends XItem = XItem`) — extend an item with your own fields and get them back fully typed through slots and events instead of casting.

  Deeply nested items (a `Tree` node's `children`, a `Menu` row's nested `items`) stay base-typed — same documented limitation as before.

  ## Fixes

  - Page-wide scroll locks now consistently target `document.body` (`Tour` was still locking `documentElement` directly)
  - `BottomSheet` content is scrollable at any drag/snap position instead of only once mostly open, and a nested sheet's parent now un-recedes in sync with the child's own close animation instead of waiting for it to fully finish
  - `Dialog`'s `teleportTo` now correctly wins over `container` when both are set
  - `v-scroll-mask` accepts `orientation: 'x' | 'y' | 'both'` (previously vertical-only, so binding it on a horizontally-scrolling row was a silent no-op), and its edge fade is more visible
  - `Message`'s dismiss button hit target is larger

## 0.1.6

### Patch Changes

- [`6f27012`](https://github.com/Mini-Sylar/vael-ui/commit/6f270128548985db7d892321408ef0aebbd4cca6) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - **Breaking:** replace `confirmDialog()` and `useConfirmAction()` (added in the previous release) with a single `confirmAction()`. The old pair required either hand-rolling your own overlay wiring (`useConfirmAction`) or being locked into a centered `Dialog` (`confirmDialog`); `confirmAction()` picks its presentation with a discriminated union on `surface`, `'dialog'` (default, centered) or `'popover'` (anchored to a `triggerEl`, required in that branch). Both branches pass every other prop straight through to the underlying `Dialog`/`Popover` (`position`, `size`, `side`, `align`, `closeOnOutside`, `ui`, etc.), so per-call customization (a taller dialog, a wider popover) needs no new API surface. `onConfirm` is awaited before closing: the confirm button stays in its loading state until it settles, closing only on success; a rejection leaves the surface open and fires `onError` instead of closing out from under a failed action. `useConfirmAction` and `confirmDialog` are removed with no compatibility shim, since the API was flagged unstable in the release that introduced it.

  Add `usePopoverService` (`openPopover`, `usePopoverRef`, `usePopoverQueue`) and `PopoverHost`, the anchored-surface counterpart to the existing `useDialogService`/`DialogHost`. `openPopover(Component, options)` mounts any component inside a `Popover` anchored to `options.triggerEl`, returning `{ result, close, panelEl }` the same shape `openDialog` returns — `result` settles with whatever the opened component's `usePopoverRef().close(result)` passes. `confirmAction({ surface: 'popover' })` is built on this primitive; reach for `openPopover` directly for anything beyond a plain confirm (a custom form in a popover, for example). Requires mounting `<PopoverHost/>` once at the app root, alongside `<DialogHost/>`.

  Fix confirm-flow popovers being permanently stuck invisible (`visibility: hidden`, positioning never computed). The shared `useFloatingPosition` composable only recomputes on a false-to-true transition of its `active` flag, not on an initial truthy value; an imperatively-opened popover's `open` state starts `true` before the surface even mounts, so the transition never happened and positioning silently never ran.

## 0.1.5

### Patch Changes

- [`6e9f93b`](https://github.com/Mini-Sylar/vael-ui/commit/6e9f93b2bd3e8e1c30e63c1fd7637902eb4500d5) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Add `confirmDialog()` and `useConfirmAction()` for building async-aware confirm flows (delete confirmations, destructive-action gates) without a dedicated `AlertDialog` component. `useConfirmAction()` is presentation-agnostic — bind its `open` ref to any overlay's own `v-model:open` (`Popover`, `Dialog`, or a fully custom surface), anchored however that overlay already supports (`Popover`'s existing `#trigger` slot or `triggerEl` prop, unchanged). `confirmDialog()` is a thin convenience wrapper over the existing `openDialog()` service for the common "title + description + Cancel/Confirm" shape, still accepting a custom `body`/`footer` component for full control. Both share the same core behavior: `confirm(action)` keeps the surface open and `pending` true until `action` settles, closing only on success — a rejected action clears `pending`, sets `error`, and leaves the surface open instead of closing out from under a failed action.

  Fix `Dock`'s pointer-proximity magnification visibly juddering in Safari. The live per-item `transform` was written every `pointermove` frame while a CSS `transition` was still active on that property, so Safari was continuously retargeting an in-flight transition — Chromium mostly masked it, Safari didn't. Replaced with a small `requestAnimationFrame` spring loop (exponential decay toward each item's target scale/offset) that owns the live tracking entirely; the CSS transition now only ever governs the discrete press-shrink feedback.

  Fix `Accordion`'s `motionCss={false}` being unable to close. `useCollapse`'s settle logic was forcing the resting style to `{}` (visually open) whenever motion was disabled, regardless of the target open/closed state — so disabling the built-in transition also silently disabled closing. `motionCss={false}` now still snaps instantly to the correct open/closed resting style, just without the animated transition.

  Fix `Calendar`'s month-change slide briefly bleeding into the weekday header row — the leaving month's grid was `position: absolute` against the wrong containing block (the whole calendar body, which the weekday row also shares), landing it on top of the header text for one frame instead of at the grid's own top edge.

  Fix `SelectButton`'s sliding indicator popping in instantly with no transition on the very first selection (starting from nothing selected). The indicator's first-measurement guard was only tracking whether the component had ever measured at all, not whether it had ever shown a real selection — so the first real pick was mistaken for the initial-mount case and had its transition suppressed.

  Fix `OtpInput`'s blinking caret drawing through an already-typed digit instead of only appearing in the next empty cell, and fix a one-frame focus flash on the wrong cell when clicking back into a completed code — the browser's own default caret placement (based on the invisible input's unstyled text metrics) was landing and painting before the click handler's correction ran; both are now resolved before any paint by handling pointerdown with `preventDefault()` instead of click.

  Fix `Toolbar`'s vertical orientation not being vertically centered when only one of its three internal slot groups (start/center/end) had content — the two empty groups were still full flex participants contributing gap spacing. Toolbar now only renders a slot group when it actually has content.

  Fix `Toast` alignment (action button text centering, close-icon sizing) and `Radio`'s icon being misaligned with its label text.

  Fix `BottomSheet`'s swipe-to-dismiss being inconsistent on mobile — dragging down past the lowest snap point wasn't always registering as a dismiss gesture.

  Fix `Badge`'s count text rendering visibly offset from center.

## 0.1.4

### Patch Changes

- [`2871350`](https://github.com/Mini-Sylar/vael-ui/commit/287135049ea1e11bad2ce882815862043961a8c7) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix `Combobox`, `Select`, `TreeSelect`, and `DatePicker` silently dropping a plain `class`/`style` passed by a consumer. Each sets `inheritAttrs: false` but never forwarded those attrs onto its own visible trigger element (only onto the teleported dropdown panel, where one existed), so `<Combobox class="my-class">` (and the same on the other three) never reached the rendered DOM — any consumer relying on ordinary class-based styling (width, layout, `display: none` in a media query, etc.) had no effect. Audited every other component using `inheritAttrs: false`; the remaining ones (Popover, Tooltip, Menu, Dialog, Drawer, BottomSheet, ContextMenu) take a consumer-provided trigger via slot and have no component-owned trigger element, so they were unaffected by design, not by accident.

## 0.1.3

### Patch Changes

- [`d752420`](https://github.com/Mini-Sylar/vael-ui/commit/d7524201114b65ded8d650eccf25302c585da212) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix `Field`'s context (`disabled`, `required`, `invalid`, label `for` wiring, focus/filled tracking) not reaching wrapped controls under Vapor. `fieldKey` was defined as a fresh `Symbol()` inside `Field.vue` itself, so the Vapor build's copy of that file created a second, different Symbol instance than the one `useFieldControl` (shared, not duplicated) always injected with — the two never matched, so every control wrapped in `<Field>` silently ignored the wrapper's state under Vapor. `fieldKey` now lives in its own module that the Vapor build correctly imports instead of redefining.

## 0.1.2

### Patch Changes

- [`ddf58e9`](https://github.com/Mini-Sylar/vael-ui/commit/ddf58e961ff1c96e0a036789a93879896790aae4) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - `useTabIndicator`'s `sizing` option now defaults to `'bounds'` instead of `'transform'`. The old default scaled a 1px CSS baseline via `transform: scale()`, which flattened border-radius on the scaled axis and could round unevenly on fractional-device-pixel-ratio displays (common on Windows), producing a visibly misaligned indicator. `'bounds'` sets the indicator's real `insetInlineStart`/`inlineSize` in px instead, avoiding both issues; `'transform'` remains available as an explicit opt-in for indicators with no rounded corners on the scaled axis. `.ui-tabs-indicator`'s CSS now also transitions `inset-inline-start`/`inline-size`/`inset-block-start`/`block-size` so `'bounds'` mode animates smoothly instead of jumping.

## 0.1.1

### Patch Changes

- [`8ab032f`](https://github.com/Mini-Sylar/vael-ui/commit/8ab032f0eb90b98fb86522112f3021044204213a) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix Chip padding inconsistency, Tabs/SelectButton sliding indicator missing a re-measure after webfonts finish loading (fixes indicator sizing drift on first paint), and vertically off-center label text in Tag, Button, Badge, and Toolbar's overflow trigger (adds `text-box-trim` optical centering in supporting browsers, with the previous approximation kept as the fallback).

## 0.1.0

### Minor Changes

- [`5f9da6f`](https://github.com/Mini-Sylar/vael-ui/commit/5f9da6f9b3d75fda3e11e1df6b5d10cc3a96e8b4) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Design consistency pass across sized components, plus a new `ButtonGroup` component and `clearable` support for `CascadeSelect`/`TreeSelect`.

  **New**

  - `ButtonGroup`: a purely visual wrapper that joins adjacent `Button`s into one segmented unit — shared borders, only the outer corners rounded. Supports `horizontal`/`vertical` orientation. Unlike `Toolbar`, it does not manage roving tabindex — each button keeps its own place in the native Tab order, since a row of independent actions isn't a command bar.
  - `clearable` prop added to `CascadeSelect` and `TreeSelect`, matching the existing `Select`/`Combobox` behavior. Required rebuilding both triggers from a native `<button>` to `role="combobox"` div (a native button can't legally contain the nested clear button).
  - `SpeedDial` is now included in the `vael-ui/vapor` build. It was simply missing from the Vapor export list, not excluded for a technical reason.

  **Fixed**

  - `SelectButton`'s sliding indicator was landing 1px off from the selected option whenever the track had a border, since `useTabIndicator`'s `bounds` sizing mode computed insets from `getBoundingClientRect()` (border-box) but CSS resolves an absolutely-positioned child's `inset-inline-start` against the padding box. Fixed generically in the composable — benefits every consumer (`SelectButton`, `MenuList`).
  - Vertical `Toolbar` icon buttons were left-aligned instead of centered: `align-items: stretch` doesn't apply to children with an explicit `inline-size` (icon buttons), and per flexbox falls back to start-alignment instead of centering.
  - `Combobox`'s `clearable` button never appeared for typed-but-unselected query text — it only checked the committed selection, not the query itself.
  - Clear buttons (`Select`/`Combobox`/`CascadeSelect`/`TreeSelect`) and the `Menu`/`CascadeSelect` submenu chevron now mount with a proper enter/leave transition (grows in from zero width, not just opacity) instead of popping the layout.
  - `PullToRefresh`: a fast, short flick now commits even when it doesn't reach the full pull threshold (previously distance-only, unlike every other gesture-driven component in the library). Text selection during an active pull/drag is now suppressed on `PullToRefresh` and `BottomSheet`'s content-drag path.
  - `BottomSheet`'s drag handle hit area was ~24px tall, under the library's own 40px minimum; now 40px.
  - `InputNumber`'s stepper buttons were 18×12px with no border-radius at all. Column mode now stretches to fill the input's real height; split mode is circular and scales with `size`, matching `Select`'s own end-of-input icon-button convention.

  **Consistency**

  Border-radius now scales with `size` (`sm`/`md`/`lg`) the way `Button` already did, closing the gap on: `Input`, `Select`, `Combobox`, `CascadeSelect`, `TreeSelect`, `Avatar` (`square` shape), `OtpInput`, `Textarea`, `Tag`, `Checkbox`. Icon/chevron sizing was similarly unified — the `Menu`/`Select`/`Combobox`/`CascadeSelect` chevrons and clear buttons, and `SplitButton`'s trigger chevron, now scale with their trigger's own font-size instead of staying a fixed pixel size regardless of `size`.

## 0.0.7

### Patch Changes

- [`59bf949`](https://github.com/Mini-Sylar/vael-ui/commit/59bf949c8645a7e0c5cd6328ed62a0bce23b53a6) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - - **Button text centering**: Added `line-height: 1` to `.ui-button` for proper optical centering of text content
  - **Removed tap highlight**: Added `-webkit-tap-highlight-color: transparent` globally to remove the blue tap flash on mobile devices
  - **Standardized press scale**: Changed button, menu item, and datatable sort button `:active` scale from 0.97 to 0.96 per design standards
  - **Accessibility**: Added `@media (prefers-reduced-motion: reduce)` support to disable press scale feedback for motion-sensitive users
  - **Docs**: Added font size slider to theme toolbar (12-18px range) with localStorage persistence

## 0.0.6

### Patch Changes

- [`6026e0d`](https://github.com/Mini-Sylar/vael-ui/commit/6026e0da1b407c49a61acd682a2aace77d91230e) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Cap large surfaces (Card, Dialog, Popover, Menu, Select panel, DataTable, FileUpload dropzone, Dock) to a new `--ui-radius-surface` token (`min(var(--ui-radius), 1rem)`) instead of the raw `--ui-radius`, so an aggressive radius preset like Pill (`999px`) no longer turns large rectangular surfaces into stadium shapes. Small controls keep using the uncapped `--ui-radius`.

  `--ui-radius-surface` is now redeclared on every element (via a universal selector) instead of once at `:root`, so it recomputes correctly under a scoped `ConfigProvider` theme or a Teleported root that re-applies `--ui-radius` — previously it froze at `:root`'s value and ignored those overrides.

## 0.0.5

### Patch Changes

- [`1519048`](https://github.com/Mini-Sylar/vael-ui/commit/151904876e70eb80c554ee94135c3f5f04b3bf92) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Add `Drawer`, an edge-only companion to `Dialog` for side/top/bottom panels (navigation drawers, filter panels, and similar). It's a thin wrapper around the same `Dialog` engine (layer stack, focus trap, scroll lock, `forceMount`/`beforeClose` for custom motion) with a `side` prop restricted to `'left' | 'right' | 'top' | 'bottom'` — reach for `Dialog` directly for a centered panel, and `BottomSheet` when the bottom edge also needs to be drag-dismissible.

  Also:

  - Fix `SelectButton`'s sliding indicator staying parked on the last-selected option after `allowEmpty` deselects, instead of hiding.
  - Fix `Select`'s dropdown panel truncating option labels at small trigger sizes (it was pinned to the trigger's exact width instead of using it as a floor).
  - Add an `InputNumber` `stepperPosition="split"` variant (one button in `#start`, one in `#end`, alongside the existing `#end`-only default).
  - Fix `Toolbar` items that collapsed into the overflow menu before ever being measured while visible permanently failing to re-expand even once there was room.
  - Minify the built JS and CSS output (previously only the JS side was covered) and stop bundling `vue-component-type-helpers` as a runtime dependency, shrinking the published package.
  - Fix several server-side rendering crashes (`window`/`document is not defined`) for apps using SSR or static site generation: `OtpInput` disposed a `document` listener unconditionally on unmount, and `Dial`/`Knob`/`Slider`/`Resizable`/`SwipeToReveal`/`DataTable`'s column resize/`TooltipHost`/`Dock` all attached `window`/`document` listeners eagerly at setup instead of deferring to the client. Export the new `ssrWindow`/`ssrDocument` helpers (`undefined` on the server) for consumers writing their own SSR-safe listeners the same way.

## 0.0.4

### Patch Changes

- [`4383385`](https://github.com/Mini-Sylar/vael-ui/commit/438338579b0a61f089a7ebc125dff10513c50f28) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - `vael-ui/vapor` now ships all 57 public components (was 38) — `DialogHost`,
  `BottomSheet`, `CascadeSelect`, `Combobox`, `ContextMenu`, `DatePicker`,
  `FileUpload`, `InputNumber`, `MenuList`, `Message`, `Pagination`, `Radio`,
  `Select`, `SplitButton`, `Toaster`, `Toolbar`, `Tree`, `TreeSelect`, and
  `AccordionItem` were previously missing from the Vapor build entirely.

  Two real bugs surfaced and fixed along the way:

  - `useDialogQueue`/`DynamicDialogEntry` (needed by `DialogHost`) and
    `useNumberFormat` (needed by `InputNumber`) weren't exported from the
    main package, so the Vapor generator couldn't resolve them — both are
    now public.
  - The Vapor generator's import-rewriting only matched single-level `../`
    relative imports, silently leaving `internal/*.vue` components' (one
    directory deeper) `../../composables/...` imports unrewritten, which
    broke the build the moment one was included (`SelectListBody.vue`, used
    by `Select`/`Combobox`).

## 0.0.3

### Patch Changes

- [`0826c21`](https://github.com/Mini-Sylar/vael-ui/commit/0826c2146423a6d091821eaa8cef0f487d58c5aa) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix: `vTooltipVapor`/`vScrollMaskVapor` crashed with `TypeError: value is
not a function` on bare usage with no bound value (`<div v-scroll-mask>`,
  the primary documented pattern for that directive) — Vapor's compiler
  passes no `value` argument at all for a directive with no value
  expression, not a no-op getter. Both now guard with `value?.()`.

  Also: `app.directive('tooltip', vTooltip)` now type-checks cleanly on a
  Vapor app with no cast needed on the consumer's side — added a second,
  VDOM-shaped overload signature (never actually invoked at runtime, Vapor
  always calls the real one) purely so TypeScript accepts it. `vue` is now
  pinned to `3.6.0-rc.1` across the whole workspace (was mixed 3.5.x/3.6.x),
  which the overload fix also depended on.

## 0.0.2

### Patch Changes

- [`888efc8`](https://github.com/Mini-Sylar/vael-ui/commit/888efc8646c4df57b5f28ad6c6b008af05c0f29b) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Add `useColorScheme()` composable for dark/light/system mode (persistence,
  DOM attribute application, live OS-preference updates — no forced UI).

  Register `v-tooltip`/`v-scroll-mask` on Vue's `GlobalDirectives` interface
  so Volar/vue-tsc resolves them when registered globally
  (`app.directive('tooltip', vTooltip)`), not just via a local `<script
setup>` import.

  Document directive setup (including the global-registration requirement)
  and Vue Vapor support in the README.

- [`7287f70`](https://github.com/Mini-Sylar/vael-ui/commit/7287f70a265a119a37db100d3c0edbf463e67d09) Thanks [@Mini-Sylar](https://github.com/Mini-Sylar)! - Fix: `vTooltip`/`vScrollMask` weren't exported from `vael-ui/vapor` at all —
  a Vapor-only app had no way to register them. Now exported under their
  plain names (`vTooltip`, `vScrollMask`, the Vapor-compiled functions),
  usable the same way as the main `vael-ui` entry: locally imported in
  `<script setup>`, or globally via `app.directive('tooltip', vTooltip)` on a
  `createVaporApp()` instance — verified global registration genuinely works
  for Vapor apps too (falls back to the same runtime directive resolution
  VDOM uses).
