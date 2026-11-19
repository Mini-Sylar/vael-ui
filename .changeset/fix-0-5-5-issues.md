---
'vael-ui': patch
---

## Highlights

- **v-tooltip:** `follow: true` keeps the tooltip over the pointer along a wide target, such as a timeline bar, and stops at its ends. Opened from the keyboard, it stays centred; touch keeps its long press. `Tooltip` takes the same prop.
- **v-tooltip:** `content` can be a component with `props`, for markup such as a status dot or a progress bar: `v-tooltip="{ content: ProjectTip, props: { project } }"`. It draws in the shared tooltip, so it still opens at once and glides between targets, in both builds.
- **useResizable:** it can drive a span, such as a timeline bar. `offset` is a second model for the start: a handle for the `'start'` edge moves the start and size together, and `onMovePointerdown` / `onMoveKeydown` move the whole span. One instance covers both ends: each handle names its edge, `onHandlePointerdown(event, 'start')`, and `edge` stays the default. `bounds` keeps it in range, and `flip: false` stops a handle at `min` instead of flipping the span over its other end. A handle pulled past `min` flips the span over its other end. The click a drag's release makes, or a release after Escape, doesn't reach the span.

- **useWheel:** a position you drag, throw, scroll with a mouse wheel or step with the keys along a line of items, and it comes to rest on one. It draws nothing: each item near the resting spot gets `--ui-wheel-offset` and `--ui-wheel-distance`, and your CSS or `v-animate` (with `progressOf`) turns them into a picker drum, a carousel or a pager. It loops, takes items of different widths, moves several at a time and stops flush at the end, and `onTick` fires once per item for a haptic click. Both settle on the `spring` you name, else your ConfigProvider's, else the default every component uses, with a little give for a throw and none under reduced motion.
- **usePanZoom:** pans, pinches and zooms content inside a box: an image, a map, a diagram. One finger or the mouse pans with a flick that keeps coasting, two fingers pinch around their centre, a double tap zooms in and back out, and ctrl with the wheel zooms around the cursor, and so does a trackpad pinch in Safari. It stays inside the box, gives a little at the edges, and the keys (`+`, `-`, `0`, arrows) and `zoomTo`, `zoomBy`, `panBy` and `reset` work too.
- **useDragSelect:** drag across empty space in a box and everything the band touches is selected, with the box's children as the items. Shift adds, ctrl or cmd toggles, a click on empty space clears, and Escape puts it back. Near an edge it scrolls and the band grows. `spring: true` lets the band's corner trail the pointer on a spring, and what's selected follows the band you see. A mouse or a pen draws the band at once. A touch has to press and hold first, then drag, so a swipe still scrolls.
- **useDrag:** a drag that decides on release, correct inside a scaled parent. The element follows the pointer by its own `translate`, and `onRelease` gets where the throw would land and returns where it goes, on a spring that keeps the throw's speed: a card deck, a swipe to dismiss. `handle` limits the grab to part of the element, such as a dialog's header.
- **v-animate:** a value in `animate` can be live, a getter or a ref, followed every frame without re-rendering: `rotate: () => mapRange(drag.x.value, [-300, 300], [-20, 20])`. `{ value: getter, spring }` follows it on a spring, so a stack settles after the card above it. An exit on a spring carries on at the speed the element was moving, so a card thrown with `useDrag` and removed keeps going.
- **mapRange:** turns one number into another by lining up two ranges, for linking a drag, a scroll or a slider to a look.

## More new features

- **useSpringValue, createSpring:** `set()` takes `damping` and `response` for that one move, so a throw can bounce while a button press settles with none.

- **Resizable:** `edge="both"` puts a handle on each end, and pulling one moves only that side while the far end stays put, and a pulled panel stops at its minimum and at the edge of its container. `centered` resizes from the middle instead: the handle you pull follows the pointer and the opposite edge mirrors it, so the centre stays put (also in `useResizable`). `v-model:offset` makes it a span such as a timeline bar: it positions itself from its start, a start handle moves the start and size together, the bar itself moves when dragged, and `bounds`, `scrollEl` and `@commit` work as in `useResizable`. Each handle has its own name (`messages.resizable.start` and `end`), and the `#handle` slot gets its `edge`.
- **useResizable, Resizable:** `step` snaps to a multiple on release while the drag itself stays smooth, and an arrow key moves one step.
- **useResizable:** Escape during a drag puts it back where it started.
- **useResizable:** `scrollEl` scrolls a container when the pointer nears its edge during a drag, and the drag follows. Its `scroll-padding` marks what covers it, such as a sticky column.
- **Tooltip, TooltipHost:** `--ui-tooltip-bg` and `--ui-tooltip-color` recolour the panel from its `ui` style or your CSS and keep its rounded box and motion. `v-tooltip` takes a `ui` option to style one target's tooltip.
- **Progress:** a segment takes `tooltip` for hover text (it follows the pointer on a ring), and `class` and `style` for its own fill, such as a thinner bar or a `min-inline-size` that keeps a tiny segment visible. The others give up the room.
- **useMenu:** `roving: false` keeps every item its own Tab stop while the arrow keys still move between them, for a list of links. MenuList uses it.

## Changed defaults

No API changes, but these defaults behave differently:

- **Toasts:** a toast with an `action` stays until it's dismissed, so a keyboard or screen-reader user has time to reach Undo. Set `duration` to keep a timeout.
- **Dialog, Drawer, BottomSheet:** they open on an `[autofocus]` element, else the first control in their content, instead of the maximize or × button. A dialog with `modal: false` now takes focus when it opens and gives it back when it closes.
- **confirmAction:** both surfaces are alert dialogs. The popover one is named by its title and opens with focus on Cancel.
- **Field:** an error is no longer `role="alert"`, so a failed submit with several errors doesn't read them over each other. It's still read with its control, and vael-form focuses the first invalid field.
- **MenuList:** every row is a Tab stop again, like any list of links.
- **Stagger:** `stagger: true` and the words (`'end'`, `'center'`, `'edges'`, `'random'`) stop after 7 steps, about 0.3 s, so a long list's later rows come in with the last one. A number you give goes as far as you say.

## Fixes

- **Toaster, BottomSheet, SwipeToReveal, PullToRefresh, Sortable, Tree:** a swipe or a drop is judged by how fast it was moving when you let go, not by its average. A slow drag that ends in a flick now counts as a flick, and a fast drag that stops before you let go no longer does.
- **Toaster:** a toast swiped away no longer shows again, fully opaque, where your finger let go as it leaves.
- **v-animate:** keyframe lists of different lengths each spread over the whole animation, so `rotate: [-25, 0, 25]` next to five opacity keyframes turns through 0 halfway instead of holding 25° from there.
- **v-animate:** an element switching between a `progress` look and a held one keeps only the look it has now, and a new element with a `progress` getter shows its scrubbed look on its first frame.
- **v-animate:** an `exit` function can return `false` to leave at once that time, instead of leaving back through its `initial`.

- **Tooltip, Popover, Menu, PullToRefresh:** a component of your own given to `setTriggerEl`, `triggerEl` or `scrollEl` now attaches in regular Vue. In Vapor, a component's ref holds only what it exposes (Vue 3.6 rc.15 made this strict): give it `defineExpose({ el })`, or pass a ref to an element. In development, vael-ui warns when a ref has no element. Select, TreeSelect, Calendar, Tabs, Tree, Pagination and AccordionItem expose `el` like the other components.
- **Forms:** `required` on Select, Combobox, TreeSelect, CascadeSelect, DatePicker, Rating and OtpInput now stops a plain form submit while empty and focuses the control, and sets `aria-required`. A Field's own `required` stays a hint for assistive tech and never shows the browser's bubbles.
- **FileUpload:** `name` now submits every file in the list with a plain form, picked, dropped or pasted.
- **DatePicker:** its hidden input submits what the picker shows: `YYYY-MM-DDTHH:mm` with `showTime`, `HH:mm` with `timeOnly`, `YYYY-MM` for a month view and `YYYY` for a year view. It takes your `autocomplete`, such as `bday`, and so does Combobox.
- **Combobox, Select, CascadeSelect, CommandPalette:** Enter, the arrow keys and Escape no longer pick, run or close while an input method (Chinese, Japanese and others) is composing.
- **InputNumber:** screen readers read the formatted value, such as "25%", not 0.25.
- **OtpInput:** autocorrect is off.
- **Slider, Rating:** a vertical swipe that starts on them scrolls the page again; only the slider thumb keeps every gesture.
- **Tooltip:** after Escape, moving onto the trigger's own icon no longer brings it back. A tooltip that repeats its trigger's name isn't read twice, and `v-tooltip` text names an icon-only button. A long-press tooltip stays up for 1.5 s after the finger lifts.
- **Tooltip:** the `interactive` docs now say what it does: the text can be selected and hovered. Put links and buttons in a Popover, where the keyboard can reach them.
- **Menu:** the row under the mouse takes focus, so Enter picks the row you see highlighted. Space on a checkbox row toggles it and keeps the menu open. Closing from the trigger runs `beforeClose` and `@open-change`, as Popover's now does too.
- **Menu, Select, Combobox:** typing several letters searches from the current item, so "sa" finds "Save" before "Save as".
- **ContextMenu:** a long press on Android opens it once instead of flickering, and iOS no longer shows its own callout.
- **Popover, Menu, Select:** on a touch screen, scrolling the page no longer closes them; a tap outside still does.
- **openDialog, openPopover:** after `beforeClose` or `@open-change` refuses a `close()`, a later `close()` works, and Escape no longer reports the refused result.
- **Tour:** keyboard users can Tab from the callout to the highlighted element, which screen readers no longer hide. It opens on Next, so Enter moves on instead of skipping the tour. A step is named by its title and described by its text.
- **BottomSheet, TreeSelect:** their sizing no longer depends on which stylesheet loads first. With code-split CSS, Dialog's styles could arrive last and cap the sheet, so `fullScreen` and `width="full"` stopped at 28rem wide and 85% high; TreeSelect's panel could lose its minimum width the same way.
- **vael-ui/vapor:** its types now resolve in TypeScript projects that use `node16` or `nodenext` module resolution.
- **Progress:** stacked segments shrink to fit a `gap` between them, so the last one is no longer clipped.
- **BottomSheet:** its title is a real heading, and a drag from its content that ends over the backdrop no longer leaves the sheet stuck.
- **Tabs:** with manual activation, tabbing back into the list lands on the selected tab, and only the selected panel is a Tab stop.
- **Accordion:** with `collapsible: false`, the open item's header is announced as unavailable.
- **DataTable:** text sorts naturally ("Unit 2" before "Unit 10") and ignores case. A sort is announced ("Sorted by Name, ascending"), and only the sorted column carries `aria-sort`.
- **Toolbar:** a custom focusable item, such as `role="button" tabindex="0"`, stays in arrow-key navigation.
- **Sortable, Tree:** Escape during a grab or drag cancels the move without closing a Dialog around it. The handle shows its grabbed state, and the announcements are polite.
- **SwipeToReveal:** it works right to left, an open row follows its actions when they resize, and Escape on an open row inside a Dialog closes only the row.
- **High contrast:** the selected tab, the current page in Pagination and every Loader type stay visible in Windows forced-colours mode.
- **ScrollArea:** its focus ring is no longer faded by its own scroll fade. **v-scroll-mask:** the horizontal fade runs the right way right to left.
- **v-animate:** a `layoutId` flight is no longer cut off by an ancestor with `overflow`, such as a card, a scroller or a dialog's panel. Where that would happen, a copy flies above the page and lands on the real element, even one that is still moving. A turned card keeps its size and turns as it goes, and a flight to a page behind an open modal stays in place.
- **v-animate:** an element leaving with live `width` or `height` keeps that size as it fades, instead of collapsing.
- **v-animate:** `layout` animates the first reorder of a list that was on screen while its page was still entering. It used to skip that one.
- **v-animate:** a scrubbed animation (`progress`) respects reduced motion and `motion: false`: it still fades and changes colour, but doesn't move.
- **Resizable:** `motion: false` turns its size transition off, and edge autoscroll runs at the same speed on 120 Hz screens.
- **Virtual lists:** rows of different heights no longer make the list jump when rows above the view are measured.
- **useScrollProgress, useScrollLength:** they follow rows added to a box that keeps its size, such as a fixed-height list that loads more.
- **Drawer, Dialog on a side or edge, ConfigProvider styles:** a shared style's `overlay` look (written for a centred overlay, such as a jelly one that scales and fades from `scale: '0.6 1.35'`) no longer replaces the slide of a panel that comes in from an edge. The panel keeps sliding from its edge on the style's spring. A `drawer` or `dialog` key in the style, and the component's own `motion`, still apply.
- **Drawer, Dialog on a side or edge:** a spring that overshoots (`:motion="{ initial: { panel: { x: { value: '100%', spring: 'bouncy' } } } }"`) no longer shows the page between the panel and its screen edge: the panel backs itself toward that edge in its own colour.
- **BottomSheet:** a flick that overshoots the top no longer lifts the sheet's bottom edge off the screen.
- **MenuList:** anything after the text in a `#label` slot, such as a badge or a count, sits at the row's far end.

## Performance

- **useResizable:** a drag writes the model once a frame, however many pointer events arrive, and right-clicks no longer start one.
- **PullToRefresh:** the pull moves the content with a transform instead of resizing it on every touch move, so a long list isn't laid out again each frame.
- **layout and size motion:** something animating inside a row no longer makes the list measure itself every frame.
- **Pressed states, BottomSheet:** window and viewport listeners are added only while pressed or open, so idle ones cost nothing.
- **Calendar:** it makes its date formatters once per locale, not once per day cell on every render.
- **Size:** what an app ships for one component grows by up to 3% (Tooltip about 0.7 KB gzipped for `follow` and component content, Menu 0.5 KB, Select 0.4 KB, Button 0.04 KB).
