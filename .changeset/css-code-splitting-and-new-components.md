---
'vael-ui': minor
---

Per-component CSS code-splitting, six new components (including `Tour`), large-data support for `DataTable`, a `vael-ui/resolver` for auto-importing components plus a `vael-ui/nuxt` module, container-scoped overlays, real link rows for `MenuList`/`Menu`, and broader generics across the item-based components.

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
import Components from 'unplugin-vue-components/vite'
import { VaelUiResolver } from 'vael-ui/resolver'

export default {
  plugins: [Components({ resolvers: [VaelUiResolver()] })],
}
```

Pass `{ variant: 'vapor' }` to resolve from `vael-ui/vapor` instead of the default VDOM build. No CSS side-effect wiring needed — every component already imports its own CSS internally, so resolving the component pulls its styles in for free. Zero dependency on `unplugin-vue-components` itself; the resolver is a plain, hand-typed function that structurally matches its contract.

## `vael-ui/nuxt`: a Nuxt module

Same idea as the resolver, for Nuxt apps — register the module once and every component is usable with no manual import, using Nuxt's own built-in component registration instead of `unplugin-vue-components`:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vael-ui/nuxt'],
})
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
