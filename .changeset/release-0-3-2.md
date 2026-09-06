---
'vael-ui': patch
---

## Fixes

- **`PullToRefresh`:** dropping it into an existing scrollable layout no longer forces that
  layout to restructure around it — `overflow-y: auto` only applies to the root when it's the
  one actually owning the scroll (i.e. no `scrollEl` was passed). Touch handling is also more
  reliable now: `touch-action` is set from scroll position ahead of time instead of reactively
  mid-gesture, so the browser can't claim a pull-down drag before our own handler gets a chance
  to.
- **`Dialog`:** a custom `ui.panel.style` width no longer silently and permanently disables
  `maximizable` — maximizing now always wins over a consumer's own size, regardless of whether
  that size used logical or physical CSS properties.
- **`Textarea`:** providing only the `#bottom-end` slot (no `#bottom-start`) no longer renders
  it at the start position instead of the end.
- **`Tour`:** the spotlight no longer collapses to a dim rectangle in the top-left corner for
  the length of a step change before snapping onto the next target. The cutout's step-to-step
  glide is now driven frame-by-frame in JS instead of a CSS `clip-path` transition, which on a
  viewport-filling fixed layer triggered a Chromium compositor bug that mis-rasterised the whole
  overlay while the transition was running. The glide is also quicker now and its duration
  scales with travel distance, so a jump to a far target no longer drags.
- **`Menu`:** a custom `#item` slot now keeps applying inside nested submenus instead of
  silently reverting to the default row past the first level.
- **`MenuList`:** the `#item` slot now tells you whether a row is a group label via a new
  `isGroup` prop, instead of leaving you to reverse-engineer it from `item.items`.
- **`Tag`, `Pagination`:** the `icon` (`Tag`) and `button`/`ellipsis`/`sizeSelect` (`Pagination`)
  `ui` parts were declared in the props type but never actually wired to anything — passing them
  did nothing. Both now work.
- **Every component with a plain `class`/`:class` passthrough** (around 40 in total — `Card`,
  `Badge`, `Chip`, `Switch`, `Sortable`, `DataTable`, and more): a consumer's own class now
  correctly wins over the component's internal default class, matching how the `ui` prop already
  worked. Previously the internal default always came last in the merged class string, which
  silently defeated a consumer's own conflicting utility class whenever a class merger like
  `tailwind-merge` was configured.
- **Design tokens** (`--ui-primary`, `--ui-surface`, etc.) are now genuinely inside
  `@layer ui-components`, matching what the styling guide has always said — an app's own
  unlayered CSS reliably overrides a token now, regardless of import/bundle order. Previously the
  tokens were shipped unlayered too, so overriding one was really an unlayered-vs-unlayered fight
  decided by load order, not the documented "unlayered always wins" behavior.
- **Type-checking against Vue 3.6:** several composables (`useTabIndicator`, `useVirtualizer`,
  `useCollapse`, `usePopover`, `useTooltip`, and others) typed their DOM-element options as a
  plain `Ref<T>`, which no longer structurally accepts what `useTemplateRef()` actually returns
  under Vue 3.6's stricter reactivity types — even though it always worked fine at runtime. These
  now accept both.
- **The `ui` prop's `class`/`style` overrides** now accept anything a plain Vue `:class`/`:style`
  binding would — arrays, objects, and combinations of those — instead of only a plain string.

## New `ui` parts

Previously reachable only via `:deep()` and an undocumented internal class name:

- **`Button`:** `leading`, `trailing` (the icon wrappers — zero the default gap to the label
  here instead of margin-hacking the slot content), `content`, `label` (the default-slot
  wrapper and the label itself).
- **`Tag`:** `label`.
- **`Dialog`:** `maximize`, `close` (the built-in header buttons).
- **`Message`:** `actions` (the trailing action row's wrapper).
- **`Collapsible`:** `body` (the content wrapper inside the panel).

## Also

- Vue bumped to `3.6.0-rc.7`.
