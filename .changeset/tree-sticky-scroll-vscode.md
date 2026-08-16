---
'vael-ui': patch
---

Adds `expandOnRowClick`, `selectableFolders`, and `stickyScroll` to `Tree`/`TreeSelect`, plus a
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
