---
'vael-ui': patch
---

This release makes Sortable ready for task boards and long lists, lets pickers offer an empty choice, and fixes the gaps found while building a full app on 0.5.3. Nothing changes for code you already have.

**Contents:** [Highlights](#highlights) · [More new features](#more-new-features) · [Fixes](#fixes) · [Performance](#performance)

## Highlights

- **Drag cards from anywhere.** `handle="item"` makes the whole row the handle, as on a board. A press that moves drags the row; a press that doesn't clicks what's inside. Space picks a row up, Enter opens it, and on touch a short hold starts the drag so the list still scrolls.
- **Long sortable lists.** `virtualize` on Sortable renders only the rows near the screen. Dragging, autoscroll and moving rows between lists work as before.
- **Rows without a box.** `variant="plain"` draws Sortable rows as your content alone. A held row lifts onto a surface of its own.
- **An empty choice in pickers.** A Select or Combobox item's `value` can be `null`, for a choice such as “Unassigned”.
- **A month planner.** `planner` on Calendar fills its container and lets each day grow with its content. Put a Sortable in each day to drag tasks between days.
- **A column that takes the rest.** `fill` on a DataTable `Column` takes the width the other columns leave. Long values end in an ellipsis instead of widening the table.
- **Entrances that play once.** `appear: 'once'` on `v-animate` plays a list's entrance on the first load only, not each time you come back to it.

## More new features

- **Sortable:** `@drag-start` and `@drag-end` fire with the row's value.
- **Menu, MenuList, ContextMenu, SplitButton:** the `#label` slot replaces a row's text and keeps its icon, shortcut and chevron.
- **Input:** `loading` shows a spinner at the end of the field.
- **CommandPalette:** `loading` shows a spinner instead of “No results” while results load. The `#loading` slot replaces it.
- **OtpInput:** `focus()` is exposed. Called while the field is disabled, it focuses the field once it's enabled again.
- **ColorPicker:** `presets-placement="inline"` shows the presets as swatches beside the trigger.
- **v-tooltip:** `keys` shows a shortcut after the text: `v-tooltip="{ content: 'Search', keys: ['⌘', 'K'] }"`.
- **v-scroll-mask:** `.x`, `.y` and `.both` modifiers set the axis.

## Fixes

### Sizing and layout

- Fields and buttons of the same size now line up at any root font size, and a CSS reset that removes button borders no longer makes a button 2px taller than the field beside it.
- Editable's text no longer shifts when the edit opens.
- Collapsible without a `#trigger` slot no longer leaves an empty line above the panel.
- Sortable with `axis="x"` aligns cards to the top instead of stretching them.

### Sortable

- A card dragged across lists with `preview-mode="element"` stays above them, even when a list has its own `z-index` or `transform`.
- With `preview-mode="clone"`, the floating copy keeps the row's look, and the empty slot no longer takes the held style.
- A dropped card no longer shifts after it settles.
- Escape or moving focus away while an async `beforeDrop` runs cancels the drop, and a drop between lists shows as pending meanwhile.
- Clicks on content inside a handle reach that content again.
- Cards move between `v-draggable` lists again.
- A quick flick along `axis="x"` drops at the right speed.

### Editing and forms

- Editable focuses its control when opened through `v-model:editing`, lets Escape cancel before a surrounding Dialog closes, and no longer submits twice when your control handles Enter.
- ColorPicker, Editable and Rating take their label, description and disabled state from a surrounding `Field`.
- An `aria-required` you pass, such as one a form library reads from your schema, reaches the control inside a `Field` that isn't marked `required`.
- Pickers, CommandPalette and Input announce “Loading…” to screen readers while they load.
- Buttons, links and fields inside a Tree row or an interactive Card work again instead of selecting the row or card.

### Motion

- A long spring move, such as a `layoutId` move across the page, ends exactly on its target.
- `after: 'name'` waits for a `layoutId` move under that name.
- Rows that appear right after a list's entrance, such as folders a tree opens once its saved state loads, join the entrance.
- Scrolling one box no longer stops entrances elsewhere on the page.
- Reopening an overlay while it closes no longer leaves it invisible.
- Server-rendered entrances don't replay after hydration and mirror in right-to-left pages.
- `layout: 'position'` no longer moves rows back after a parent's entrance ends.
- A failed or throwing animation hook no longer stalls others, and a delayed `onStart` no longer runs after its element has left.
- Leaving list items are taken out from where they were painted.
- A motion style with a `select` the browser can't parse no longer hangs the component.
- PullToRefresh and AvatarGroup respect `motion: false`, and Badge no longer pops on first render in Vapor.

### Other

- MenuList no longer stacks the hover highlight on the current page's row.
- v-scroll-mask fades in the moment content overflows, and v-hover-indicator hides while a Sortable inside it moves a row.
- Theme colors get the same contrast text on the server and in the browser, so pages no longer flash the wrong text color. `oklch()`, `oklab()` and `hsl()` colors are covered.
- `ConfigProvider` passes `class` and other attributes to its wrapper.
- In Vapor, `v-tooltip`, `v-hover-indicator` and `v-draggable` read their modifiers.
- Placeholders such as `{count}` survive vue-i18n, so Select's `display="count"` shows the number again. English no longer warns about missing translations.
- `useVirtualizer`'s `getKey` keeps each measured height with its row when you prepend items.

## Performance

- Dragging long lists and dragging between lists no longer measure every row on every pointer move.
- Components with many animated rows open faster, and named elements that leave the page are released from memory.
- Calendar builds each day once per render.
- SwipeToReveal and floating panels do less work per frame.
