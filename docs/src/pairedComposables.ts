import type { MetaRow } from './types'

// Headless composables that each drive one component. ComponentPage.vue shows
// them under that component's API, so they don't get a composables sidebar
// entry of their own (see the header of composablesTaxonomy.ts).
export interface PairedComposable {
  /** Section heading and anchor. */
  name: string
  /** Real named exports for the import line. Defaults to `name`. */
  installNames?: string[]
  description: string
  /** A Vue SFC, or plain TypeScript when it doesn't start with `<`. */
  exampleCode?: string
  params: MetaRow[]
  returns: MetaRow[]
}

export const pairedComposables: Record<string, PairedComposable[]> = {
  Tabs: [
    {
      name: 'useTabs',
      installNames: ['useTabs'],
      description:
        'The keyboard engine behind `<Tabs>`: selection, roving focus and arrow key navigation from the APG tabs pattern. It renders nothing. You render the `role="tab"` elements and bind `onKeydown` on the list. `<Tabs>` adds the markup, ids, panel wiring and the sliding indicators on top. Use the composable when your tabs need markup the `#item` slot can\'t give you.',
      exampleCode: `<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useTabs } from 'vael-ui'

const tabs = ['general', 'billing', 'team'] as const
const active = shallowRef<(typeof tabs)[number]>('general')
const listEl = useTemplateRef<HTMLElement>('list')
const { select, onKeydown } = useTabs(active, { items: tabs, listEl })
</script>

<template>
  <div ref="list" role="tablist" @keydown="onKeydown">
    <button
      v-for="tab in tabs"
      :key="tab"
      role="tab"
      :data-tab-value="tab"
      :aria-selected="active === tab"
      :tabindex="active === tab ? 0 : -1"
      @click="select(tab)"
    >
      {{ tab }}
    </button>
  </div>
</template>`,
      params: [
        {
          name: 'active',
          type: 'Ref<T>',
          description:
            'First argument. The selected item. `select()` and the arrow keys write to it.',
        },
        {
          name: 'items',
          type: 'MaybeRefOrGetter<readonly T[]>',
          description:
            'Every tab, in order. Items should be strings or numbers: a tab element is matched by `data-tab-value="String(item)"`, then by its position among the `role="tab"` elements.',
        },
        {
          name: 'listEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The tab list. Its `role="tab"` descendants are the tabs. A tab with `disabled` or `aria-disabled="true"` is skipped.',
        },
        {
          name: 'orientation',
          type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
          description:
            'Horizontal tabs move with Left and Right arrows, vertical tabs with Up and Down. Default `horizontal`.',
        },
        {
          name: 'activation',
          type: "MaybeRefOrGetter<'automatic' | 'manual'>",
          description:
            'Default `automatic`: the arrow keys select as they move focus. `manual`: the arrow keys only move focus, and Enter or Space selects the focused tab. Use `manual` when switching tabs is expensive, such as a tab that loads data.',
        },
        {
          name: 'onChange',
          type: '(item: T) => void',
          description: 'Fires when the selection changes, by click or keyboard.',
        },
      ],
      returns: [
        {
          name: 'select',
          type: '(item: T) => void',
          description:
            "Selects `item` and calls `onChange`. Does nothing when `item` is already selected. Bind it to each tab's click.",
        },
        {
          name: 'onKeydown',
          type: '(event: KeyboardEvent) => void',
          description:
            'Bind it on the list. Arrow keys move to the next enabled tab and wrap around the ends. Home and End jump to the first and last enabled tab. Focus follows after the next render.',
        },
        {
          name: 'focused',
          type: 'Ref<T>',
          description:
            'The tab that holds keyboard focus. It differs from `active` only in `manual` mode, where you give it `tabindex="0"` instead of the selected tab.',
        },
      ],
    },
  ],

  Menu: [
    {
      name: 'useMenu',
      installNames: ['useMenu'],
      description:
        'The keyboard engine behind `<Menu>`, `<MenuList>` and the SpeedDial actions: roving focus, wrapping arrow keys, Home and End, and typeahead. It finds items by `role="menuitem"`, `menuitemcheckbox`, `menuitemradio` or a `data-menu-item` attribute, and skips disabled ones. It also listens for clicks on the list, so you don\'t bind `@click` on each item. Enter and Space click the focused item, so its own click handlers run once. The composable never closes anything: `onSelect` tells you an item fired, and you decide what happens next.',
      exampleCode: `<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue'
import { useMenu } from 'vael-ui'

const listEl = useTemplateRef<HTMLElement>('list')
const { onKeydown, initRoving } = useMenu({
  listEl,
  onSelect: (itemEl) => console.log('run', itemEl.dataset.action),
})
// An always-visible list needs one Tab stop without taking focus on mount.
onMounted(initRoving)
</script>

<template>
  <div ref="list" role="menu" aria-label="File" @keydown="onKeydown">
    <button role="menuitem" data-action="copy">Copy</button>
    <button role="menuitem" data-action="rename">Rename</button>
    <button role="menuitem" data-action="delete" disabled>Delete</button>
  </div>
</template>`,
      params: [
        {
          name: 'listEl',
          type: 'Ref<HTMLElement | null>',
          description: 'The menu. Its matching descendants are the items.',
        },
        {
          name: 'onSelect',
          type: '(itemEl: HTMLElement) => void',
          description:
            "Fires when an enabled item is activated, by click or by Enter or Space while it has focus. It doesn't fire for submenu triggers. `<Menu>` closes here unless the item carries `data-keep-open`.",
        },
        {
          name: 'onExpand',
          type: '(itemEl: HTMLElement) => void',
          description:
            'Fires instead of `onSelect` when the activated item has `aria-haspopup="menu"`. ArrowRight on such an item clicks it, so it lands here too. `<Menu>` opens the nested submenu.',
        },
        {
          name: 'onCollapse',
          type: '() => void',
          description:
            'Fires on ArrowLeft. Wire it only when this list is a submenu, to close it and return focus to the parent row. Without it, ArrowLeft does nothing.',
        },
      ],
      returns: [
        {
          name: 'onKeydown',
          type: '(event: KeyboardEvent) => void',
          description:
            "Bind it on the list. Up and Down wrap around, Home and End jump to the ends, and printable keys run a typeahead over each item's text. The typeahead buffer resets after 500 ms.",
        },
        {
          name: 'focusFirst',
          type: '() => void',
          description:
            'Gives the first enabled item `tabindex="0"` and focuses it. Call it when a popup menu opens.',
        },
        {
          name: 'focusItem',
          type: '(el: HTMLElement | undefined) => void',
          description:
            "Makes `el` the Tab stop and focuses it, such as a submenu's parent row after the submenu closes.",
        },
        {
          name: 'initRoving',
          type: '() => void',
          description:
            'Gives the first enabled item `tabindex="0"` without focusing it. Call it once on mount for a list that is always on screen, like `<MenuList>`.',
        },
      ],
    },
  ],

  Select: [
    {
      name: 'useListbox',
      installNames: ['useListbox'],
      description:
        'The active option and keyboard engine behind `<Select>` and `<Combobox>`. Focus stays on the trigger or input, and the active option travels through `aria-activedescendant`. The composable only tracks an index: it renders nothing and reads no DOM. `<Select>` adds the popover, filtering, virtualization and the option markup. Use it to build a listbox of your own with the same keyboard behaviour.',
      exampleCode: `<script setup lang="ts">
import { shallowRef, useId } from 'vue'
import { useListbox } from 'vael-ui'

const fruits = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana', disabled: true },
  { label: 'Cherry', value: 'cherry' },
]
const picked = shallowRef<string>()
const listboxId = useId()
const { activeIndex, activeId, onKeydown, setActive, optionId } = useListbox({
  items: fruits,
  getLabel: (fruit) => fruit.label,
  isDisabled: (fruit) => !!fruit.disabled,
  onSelect: (fruit) => (picked.value = fruit.value),
  listboxId,
})
</script>

<template>
  <div
    tabindex="0"
    role="combobox"
    aria-expanded="true"
    :aria-controls="listboxId"
    :aria-activedescendant="activeId"
    @keydown="onKeydown"
  >
    {{ picked ?? 'Pick a fruit' }}
  </div>
  <ul :id="listboxId" role="listbox">
    <li
      v-for="(fruit, index) in fruits"
      :id="optionId(index)"
      :key="fruit.value"
      role="option"
      :aria-selected="picked === fruit.value"
      :aria-disabled="fruit.disabled"
      :data-active="index === activeIndex || undefined"
      @pointermove="setActive(index)"
    >
      {{ fruit.label }}
    </li>
  </ul>
</template>`,
      params: [
        {
          name: 'items',
          type: 'MaybeRefOrGetter<readonly T[]>',
          description:
            'The visible options, in order. Pass the filtered list when you filter, as `<Combobox>` does.',
        },
        {
          name: 'getLabel',
          type: '(item: T) => string',
          description: 'The text typeahead matches against.',
        },
        {
          name: 'isDisabled',
          type: '(item: T) => boolean',
          description:
            'Disabled options are skipped by the arrow keys and typeahead, and Enter ignores them.',
        },
        {
          name: 'onSelect',
          type: '(item: T, index: number) => void',
          description: 'Required. Fires when Enter commits the active option.',
        },
        {
          name: 'onActiveChange',
          type: '(index: number) => void',
          description:
            'Fires before `activeIndex` changes. A virtualized list scrolls the row into the DOM here, so `aria-activedescendant` never points at a missing id.',
        },
        {
          name: 'listboxId',
          type: 'string',
          description: "Required. The listbox element's id. Option ids derive from it.",
        },
      ],
      returns: [
        {
          name: 'activeIndex',
          type: 'Ref<number>',
          description:
            "The active option's index, or `-1` for none. Reset it to `-1` yourself when the list closes.",
        },
        {
          name: 'activeId',
          type: 'ComputedRef<string | undefined>',
          description:
            "The active option's id. Bind it as `aria-activedescendant` on the focused element.",
        },
        {
          name: 'onKeydown',
          type: '(event: KeyboardEvent) => void',
          description:
            "Bind it on the focused element. Up and Down move between enabled options and wrap; with no active option, Down starts at the first and Up at the last. Home and End jump to the ends. Enter selects. Printable keys run a typeahead that resets after 500 ms. Space isn't handled, so a text input keeps it.",
        },
        {
          name: 'setActive',
          type: '(index: number) => void',
          description:
            'Makes `index` active, for a pointer moving over the options. Calls `onActiveChange` first.',
        },
        {
          name: 'optionId',
          type: '(index: number) => string',
          description: 'The id to put on the option at `index`: `${listboxId}-opt-${index}`.',
        },
      ],
    },
  ],

  Toolbar: [
    {
      name: 'useToolbar',
      installNames: ['useToolbar'],
      description:
        "The engine behind `<Toolbar>`: one Tab stop for the whole toolbar, arrow keys between its controls (APG toolbar pattern), and Priority+ overflow. Controls are the list's buttons, links, inputs, selects, textareas and anything with a non-negative `tabindex`. Mark controls that may collapse with `data-toolbar-overflow`; when the toolbar runs out of room, they hide from the end backward and land in `collapsedItems`. `<Toolbar>` adds the groups, the hover highlight and a `…` Menu built from the collapsed controls' labels. Use the composable to give your own toolbar markup the same behaviour.",
      exampleCode: `<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useToolbar } from 'vael-ui'

const toolbarEl = useTemplateRef<HTMLElement>('toolbar')
const { onKeydown, collapsedItems, hasOverflow } = useToolbar(toolbarEl)
</script>

<template>
  <div ref="toolbar" role="toolbar" aria-label="Formatting" class="toolbar" @keydown="onKeydown">
    <button>Bold</button>
    <button>Italic</button>
    <button data-toolbar-overflow>Strikethrough</button>
    <button data-toolbar-overflow>Code</button>
    <button v-if="hasOverflow" data-toolbar-ellipsis aria-label="More">…</button>
  </div>
  <p>{{ collapsedItems.length }} hidden</p>
</template>

<style scoped>
.toolbar { display: flex; overflow: hidden; }
.toolbar > * { flex-shrink: 0; }
</style>`,
      params: [
        {
          name: 'listEl',
          type: 'Ref<HTMLElement | null>',
          description:
            "First argument. The toolbar element. Overflow compares the sum of its direct children's sizes, plus its `gap`, with its own client size, so give the children `flex-shrink: 0`.",
        },
        {
          name: 'orientation',
          type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
          description:
            'Horizontal toolbars use Left and Right arrows and measure width; vertical ones use Up and Down and measure height. Default `horizontal`.',
        },
      ],
      returns: [
        {
          name: 'onKeydown',
          type: '(event: KeyboardEvent) => void',
          description:
            "Bind it on the toolbar. Arrow keys move to the next enabled control and wrap; Home and End jump to the ends. It ignores an event a child already handled with `preventDefault()`, so a text input's own arrow keys win.",
        },
        {
          name: 'collapsedItems',
          type: 'Ref<HTMLElement[]>',
          description:
            'The `data-toolbar-overflow` controls hidden right now, in DOM order. A hidden control gets `data-toolbar-collapsed` and inline `visibility: hidden; position: absolute`, and leaves the arrow key order. Call `el.click()` from your overflow menu to run its handlers.',
        },
        {
          name: 'hasOverflow',
          type: 'ComputedRef<boolean>',
          description:
            'True while anything is collapsed. Render your `…` trigger only then, and mark it `data-toolbar-ellipsis` so its size is reserved when controls come back.',
        },
        {
          name: 'hasOverflowCandidates',
          type: 'ComputedRef<boolean>',
          description:
            'True whenever the toolbar has any `data-toolbar-overflow` control, collapsed or not. Use it to turn on `overflow: hidden`, so nothing spills out before the next measurement.',
        },
      ],
    },
  ],

  Collapsible: [
    {
      name: 'useCollapse',
      installNames: ['useCollapse'],
      description:
        'The height animation behind `<Collapsible>` and `<AccordionItem>`. It animates a panel between `0px` and its content height through inline `block-size`, and the timing comes from your CSS transition. Once open and settled, the inline style is removed, so the panel follows later content changes. Content that grows while the panel opens retargets the animation instead of being clipped. Use it to collapse any element of your own; `<Collapsible>` adds the trigger, ARIA wiring and `data-state`.',
      exampleCode: `<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useCollapse } from 'vael-ui'

const open = shallowRef(false)
const panelEl = useTemplateRef<HTMLElement>('panel')
const { style, state } = useCollapse(open, { el: panelEl })
</script>

<template>
  <button :aria-expanded="open" @click="open = !open">Details</button>
  <div ref="panel" class="panel" :style="style" :data-state="state">
    <p>Shipping takes 3 to 5 days.</p>
  </div>
</template>

<style scoped>
.panel { transition: block-size 200ms ease-out; }
</style>`,
      params: [
        {
          name: 'open',
          type: 'Ref<boolean>',
          description:
            "First argument. Every change starts a transition from the panel's current height.",
        },
        {
          name: 'el',
          type: 'Ref<HTMLElement | null>',
          description:
            'The panel. It needs a `block-size` transition in your CSS. Without one, it opens and closes at once.',
        },
        {
          name: 'motion',
          type: '() => boolean',
          description:
            'Return `false` to turn off the built-in animation. By default that hands the height over to you: no inline styles at all, open or closed, so your own tween is never cut off. `state` still reports `open` and `closed`.',
        },
        {
          name: 'handOff',
          type: '() => boolean',
          description:
            'Only matters while `motion` returns `false`. Default `true` hands the height over. Return `false` to keep the collapsed styles and make the change instant instead, for an app-wide "no animations" setting.',
        },
      ],
      returns: [
        {
          name: 'style',
          type: 'Ref<Record<string, string>>',
          description:
            'Bind it on the panel. Closed: `block-size: 0px`, `overflow: hidden`, `visibility: hidden`. Moving: a pinned `block-size` in px. Open and settled: empty.',
        },
        {
          name: 'state',
          type: "Ref<'open' | 'closed' | 'opening' | 'closing'>",
          description:
            'Where the panel is. It settles on `transitionend` for `block-size`, or after the longest transition duration plus delay and a 50 ms buffer, whichever comes first.',
        },
      ],
    },
  ],

  Tooltip: [
    {
      name: 'useTooltip',
      installNames: ['useTooltip'],
      description:
        "The headless tooltip behind `<Tooltip>`: open and close delays, a warm group in which the next tooltip opens at once and glides from the last one, hover onto the tooltip, Escape, and touch long-press. It positions through `useFloatingPosition` and listens on the trigger for you. It doesn't render or set `aria-describedby`. `<Tooltip>` adds the panel, the teleport, the ARIA wiring and the glide styles. Use it to attach the same behaviour to markup of your own.",
      exampleCode: `<script setup lang="ts">
import { shallowRef, useId, useTemplateRef } from 'vue'
import { useTooltip } from 'vael-ui'

const open = shallowRef(false)
const tipId = useId()
const triggerEl = useTemplateRef<HTMLElement>('trigger')
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const { positionerStyle, transformOrigin } = useTooltip(open, {
  triggerEl,
  positionerEl,
  side: 'bottom',
})
</script>

<template>
  <button ref="trigger" :aria-describedby="open ? tipId : undefined">Copy</button>
  <Teleport to="body">
    <div v-if="open" :id="tipId" ref="positioner" role="tooltip" :style="positionerStyle">
      <div class="tip" :style="{ transformOrigin }">Copy to clipboard</div>
    </div>
  </Teleport>
</template>`,
      params: [
        {
          name: 'open',
          type: 'Ref<boolean>',
          description: 'First argument. The tooltip writes to it as it opens and closes.',
        },
        {
          name: 'triggerEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The element the tooltip describes and anchors to. Removing it from the page closes the tooltip.',
        },
        {
          name: 'positionerEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The positioned wrapper. Hovering it keeps the tooltip open while `interactive` is on. Teleport it to the body: the style it gets is absolute, in page coordinates.',
        },
        {
          name: 'side',
          type: "MaybeRefOrGetter<'top' | 'right' | 'bottom' | 'left'>",
          description: 'Default `top`. It flips when there is no room.',
        },
        {
          name: 'align',
          type: "MaybeRefOrGetter<'start' | 'center' | 'end'>",
          description: 'Default `center`.',
        },
        {
          name: 'sideOffset',
          type: 'MaybeRefOrGetter<number>',
          description: 'Gap from the trigger, in px. Default `8`.',
        },
        {
          name: 'alignOffset',
          type: 'MaybeRefOrGetter<number>',
          description: 'Shift along the aligned edge, in px. Default `0`.',
        },
        {
          name: 'openDelay',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Delay before a cold open, in ms. Default `400`. A warm open is always instant: another tooltip is visible, or one closed less than 300 ms ago.',
        },
        {
          name: 'closeDelay',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Grace period after the pointer leaves, in ms, long enough to move onto the tooltip. Default `100`.',
        },
        {
          name: 'interactive',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `true`: hovering the tooltip itself keeps it open, so its content can be selected or clicked.',
        },
        {
          name: 'closeOnEsc',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `true`. The tooltip takes the Escape before any dialog around it, so the dialog stays open.',
        },
        {
          name: 'onOpenChange',
          type: '(value: boolean, details: TooltipOpenChangeDetails) => void',
          description:
            "Fires before every close, with `value: false`. `details.reason` is `'pointer'`, `'focus'`, `'trigger'`, `'escape'` or `'programmatic'`. Call `details.cancel()` to keep the tooltip open. It doesn't fire on open.",
        },
        {
          name: 'beforeClose',
          type: '() => BeforeClose | undefined',
          description:
            'A getter for the close guard. Return `true` to close, `false` or nothing to stay open, or a promise of either. `isClosing` is `true` while a promise is pending.',
        },
      ],
      returns: [
        {
          name: 'positionerStyle',
          type: 'Ref<Record<string, string>>',
          description:
            'Bind it on the positioner. It stays hidden until the first measurement, then sets `position`, `top`, `left`, `visibility` and a `translate` while gliding.',
        },
        {
          name: 'panelStyle',
          type: 'Ref<Record<string, string>>',
          description:
            'Custom properties for the glide between triggers: `--ui-tooltip-morph-x`, `--ui-tooltip-morph-y` (the box scale) and `--ui-tooltip-content-opacity`. Bind it on the panel if you style the morph.',
        },
        {
          name: 'placement',
          type: 'Ref<Placement>',
          description:
            "The resolved placement after flipping, such as `'top'` or `'bottom-start'`.",
        },
        {
          name: 'transformOrigin',
          type: 'Ref<string>',
          description: 'The trigger-facing origin for a scale-in animation.',
        },
        {
          name: 'isClosing',
          type: 'Ref<boolean>',
          description: '`true` while a `beforeClose` hook holds the close.',
        },
        {
          name: 'instant',
          type: 'Ref<boolean>',
          description: '`true` when this open was warm. Skip the enter animation then.',
        },
        {
          name: 'traveling / morphing / travelActive',
          type: 'Ref<boolean>',
          description:
            'Glide state. `traveling` and `morphing` are on while the position and size transitions should run; `travelActive` covers the whole glide, from the staged first frame until it settles.',
        },
        {
          name: 'show / hide',
          type: '() => void',
          description:
            '`show` opens at once, skipping `openDelay`, and revives a pending close. `hide` closes through `onOpenChange` and `beforeClose` with the `programmatic` reason.',
        },
        {
          name: 'requestClose',
          type: '(reason: TooltipCloseReason, event?: Event) => void',
          description: 'Closes with your own reason, through `onOpenChange` and `beforeClose`.',
        },
        {
          name: 'cancelClose',
          type: '() => void',
          description: 'Drops a close that a `beforeClose` hook holds, and keeps the tooltip open.',
        },
      ],
    },
    {
      name: 'useTooltipCore',
      installNames: ['useTooltipCore'],
      description:
        '`useTooltip` without its trigger hover, focus and press listeners, so one tooltip can serve many triggers through event delegation. `<TooltipHost>` and `v-tooltip` run on it. It takes the same options and returns the same values as `useTooltip`, plus the handlers below. You route events to them yourself and swap `triggerEl` as the pointer moves between targets. It still binds touch long-press, Escape and positioner hover.',
      params: [
        {
          name: 'open / options',
          type: 'Ref<boolean>, UseTooltipOptions',
          description:
            'The same as `useTooltip`. `triggerEl` can change while open: call `beginTravel()` first, and the tooltip glides to the new trigger.',
        },
      ],
      returns: [
        {
          name: 'pointerEnter / pointerLeave',
          type: '(event?: PointerEvent) => void',
          description:
            "Call on the current trigger's pointer enter and leave. Enter opens after `openDelay`, or at once when warm, and ignores touch. Leave closes after `closeDelay`.",
        },
        {
          name: 'focusEnter / focusLeave',
          type: '(event?: Event) => void',
          description:
            "Call on focus in and out. Focus opens only when the trigger matches `:focus-visible`, so a mouse click doesn't open it. Losing focus closes it.",
        },
        {
          name: 'press',
          type: '(event?: Event) => void',
          description:
            'Call on pointer down. It closes the tooltip and keeps it closed until the pointer leaves.',
        },
        {
          name: 'beginTravel',
          type: '() => void',
          description:
            'Records where the visible tooltip is, before you swap `triggerEl`, so the next position glides from there. Glides longer than 320 px, or under reduced motion, jump instead.',
        },
      ],
    },
  ],

  Popover: [
    {
      name: 'usePopover',
      installNames: ['usePopover'],
      description:
        "The headless popover behind `<Popover>`, `<Menu>`, `<Select>`, `<Combobox>`, `<DatePicker>` and `<TreeSelect>`. It positions the panel, closes on Escape and on outside pointer down or focus, joins the shared layer stack so only the topmost layer closes, and returns focus when the panel closes. It doesn't open anything or toggle on a trigger click: you own `open`. `<Popover>` adds the trigger slot, teleport, panel, z-index and animation.",
      exampleCode: `<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { usePopover } from 'vael-ui'

const open = shallowRef(false)
const triggerEl = useTemplateRef<HTMLElement>('trigger')
const positionerEl = useTemplateRef<HTMLElement>('positioner')
const { positionerStyle, close } = usePopover(open, {
  triggerEl,
  positionerEl,
  side: 'bottom',
  align: 'start',
  tabIntoPanel: true,
})
</script>

<template>
  <button ref="trigger" :aria-expanded="open" @click="open = !open">Filters</button>
  <Teleport to="body">
    <div v-if="open" ref="positioner" :style="positionerStyle">
      <label><input type="checkbox" /> In stock</label>
      <button @click="close">Done</button>
    </div>
  </Teleport>
</template>`,
      params: [
        {
          name: 'open',
          type: 'Ref<boolean>',
          description:
            'First argument. You set it to `true`; the popover sets it to `false` when it closes.',
        },
        {
          name: 'triggerEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The anchor. Pointer down on it never counts as outside, so your own click toggle works. If focus was in the panel when it closes, focus goes back to the element that had it before opening, or to the trigger.',
        },
        {
          name: 'positionerEl',
          type: 'Ref<HTMLElement | null>',
          description: 'The positioned panel wrapper. Teleport it to the body.',
        },
        {
          name: 'side',
          type: "MaybeRefOrGetter<'top' | 'right' | 'bottom' | 'left'>",
          description: 'Default `bottom`. It flips when there is no room.',
        },
        {
          name: 'align',
          type: "MaybeRefOrGetter<'start' | 'center' | 'end'>",
          description: 'Default `center`.',
        },
        {
          name: 'sideOffset / alignOffset',
          type: 'MaybeRefOrGetter<number>',
          description: 'Gap from the trigger and shift along it, in px. Defaults `8` and `0`.',
        },
        {
          name: 'matchReferenceWidth',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Makes the panel at least as wide as the trigger, as `<Select>` does. Default `false`.',
        },
        {
          name: 'maxHeightCap',
          type: 'MaybeRefOrGetter<number | undefined>',
          description: 'Caps the returned `maxHeight` in px, even when the viewport has more room.',
        },
        {
          name: 'closeOnEsc',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `true`. Only the topmost layer closes.',
        },
        {
          name: 'closeOnOutside',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `true`. Closes on pointer down or focus outside the trigger and panel, and when Tab leaves the panel.',
        },
        {
          name: 'onOpenChange',
          type: '(value: boolean, details: PopoverOpenChangeDetails) => void',
          description:
            "Fires before every close, with `value: false`. `details.reason` is `'trigger'`, `'escape'`, `'outside'` or `'programmatic'`. Call `details.cancel()` to keep it open. It doesn't fire on open.",
        },
        {
          name: 'beforeClose',
          type: '() => BeforeClose | undefined',
          description:
            'A getter for the close guard. Return `true` to close, `false` or nothing to stay open, or a promise of either. `isClosing` is `true` while a promise is pending.',
        },
        {
          name: 'scope',
          type: 'Ref<HTMLElement | null>',
          description:
            'The region this popover belongs to, for Escape ownership in the layer stack. Omit it for a page-level popover.',
        },
        {
          name: 'tabIntoPanel',
          type: 'boolean',
          description:
            'Tab from the trigger moves into the panel, and Tab past either end closes it and carries on from the trigger. Turn it on for panels that take focus. Leave it off when focus stays on the trigger, as in a combobox. Not reactive.',
        },
      ],
      returns: [
        {
          name: 'positionerStyle',
          type: 'Ref<Record<string, string>>',
          description: 'Bind it on the positioner. Hidden until the first measurement.',
        },
        {
          name: 'placement',
          type: 'Ref<Placement>',
          description: "The resolved placement after flipping, such as `'bottom-start'`.",
        },
        {
          name: 'transformOrigin',
          type: 'Ref<string>',
          description: 'The trigger-facing origin for a scale-in animation.',
        },
        {
          name: 'maxHeight',
          type: 'Ref<number | null>',
          description:
            'The room left on the chosen side, in px. Put it on a scrolling body inside the panel.',
        },
        {
          name: 'isClosing',
          type: 'Ref<boolean>',
          description: '`true` while a `beforeClose` hook holds the close.',
        },
        {
          name: 'close',
          type: '() => void',
          description:
            "Closes with the `'programmatic'` reason, through `onOpenChange` and `beforeClose`.",
        },
        {
          name: 'requestClose',
          type: '(reason: PopoverCloseReason, event?: Event) => void',
          description:
            "Closes with your own reason. `<Popover>` uses `'trigger'` for its trigger click.",
        },
        {
          name: 'cancelClose',
          type: '() => void',
          description: 'Drops a close that a `beforeClose` hook holds.',
        },
        {
          name: 'layerIndex',
          type: '() => number',
          description:
            "This popover's position in the shared layer stack, or `-1` while closed. `<Popover>` adds it to `--ui-z-dialog`, so later layers stack on top.",
        },
      ],
    },
  ],

  Dialog: [
    {
      name: 'useDialog',
      installNames: ['useDialog'],
      description:
        "The headless modal behaviour behind `<Dialog>`: a cancelable close, Escape through the shared layer stack, a Tab focus trap, scroll lock, initial focus and focus return, and optional back-button dismiss. It doesn't render an overlay or listen for outside clicks: call `requestClose('outside', event)` from your own overlay. `<Dialog>` adds the teleport, overlay, panel, title ids and animations. `<Drawer>` and `<BottomSheet>` are built on `<Dialog>`.",
      exampleCode: `<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import { useDialog } from 'vael-ui'

const open = shallowRef(false)
const panelEl = useTemplateRef<HTMLElement>('panel')
const wrapperEl = useTemplateRef<HTMLElement>('wrapper')
const { close, requestClose } = useDialog(open, { panelEl, wrapperEl })
</script>

<template>
  <button @click="open = true">Edit profile</button>
  <Teleport to="body">
    <div v-if="open" ref="wrapper" class="wrapper">
      <div class="overlay" @click="requestClose('outside', $event)" />
      <div ref="panel" role="dialog" aria-modal="true" aria-label="Edit profile" tabindex="-1">
        <input placeholder="Name" />
        <button @click="close">Save</button>
      </div>
    </div>
  </Teleport>
</template>`,
      params: [
        {
          name: 'open',
          type: 'Ref<boolean>',
          description:
            'First argument. You set it to `true`; the dialog sets it to `false` when it closes.',
        },
        {
          name: 'panelEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The dialog panel. Focus is trapped inside it, and it takes focus itself when it holds nothing focusable.',
        },
        {
          name: 'wrapperEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The outermost teleported node, holding the overlay and the panel. The layer stack and `inert` treat it as the dialog, so the overlay stays clickable. Falls back to `panelEl`.',
        },
        {
          name: 'container',
          type: 'MaybeRefOrGetter<HTMLElement | string | null>',
          description:
            'Scopes the dialog to one element or selector: the scroll lock, modality and `inert` apply only inside it, and the rest of the page stays usable. A static container gets `position: relative`. Omit it for a page-level dialog.',
        },
        {
          name: 'scrollTarget',
          type: 'MaybeRefOrGetter<HTMLElement | string | null>',
          description:
            'The element whose scrolling locks while open. Defaults to `container`, then `document.body`.',
        },
        {
          name: 'closeOnEsc',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `true`. Escape closes the topmost layer only.',
        },
        {
          name: 'onOpenChange',
          type: '(value: boolean, details: DialogOpenChangeDetails) => void',
          description:
            "Fires before every close, with `value: false`. `details.reason` is `'trigger'`, `'escape'`, `'outside'`, `'history'` or `'programmatic'`. Call `details.cancel()` to keep it open. It doesn't fire on open.",
        },
        {
          name: 'beforeClose',
          type: '() => BeforeClose | undefined',
          description:
            'A getter for the close guard. Return `true` to close, `false` or nothing to stay open, or a promise of either. `isClosing` is `true` while a promise is pending.',
        },
        {
          name: 'initialFocus',
          type: '() => HTMLElement | null | undefined',
          description:
            "The element to focus on open. Return nothing to fall back to the panel's first focusable element, then the panel.",
        },
        {
          name: 'modal',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `true`. `false` skips the scroll lock, the Tab trap and the focus moves; Escape and layer stacking still work. Read once per open.',
        },
        {
          name: 'closeOnHistoryBack',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            "Default `false`. Pushes a history entry on open, so the back button or back gesture closes the dialog with the `'history'` reason instead of leaving the page. Any other close removes the entry again.",
        },
        {
          name: 'holdScrollUntilExit',
          type: 'boolean',
          description:
            "Default `false`. Keeps the scroll lock after the close until you call `releaseScroll()`, so a returning scrollbar doesn't shift the panel during its exit. It releases on its own after 1000 ms.",
        },
      ],
      returns: [
        {
          name: 'isClosing',
          type: 'Ref<boolean>',
          description: '`true` while a `beforeClose` hook holds the close.',
        },
        {
          name: 'close',
          type: '() => void',
          description:
            "Closes with the `'programmatic'` reason, through `onOpenChange` and `beforeClose`.",
        },
        {
          name: 'requestClose',
          type: '(reason: DialogCloseReason, event?: Event) => void',
          description:
            "Closes with your own reason: `'outside'` from an overlay click, `'trigger'` from a close button.",
        },
        {
          name: 'cancelClose',
          type: '() => void',
          description: 'Drops a close that a `beforeClose` hook holds.',
        },
        {
          name: 'container / scrollTarget',
          type: 'Ref<HTMLElement | null>',
          description:
            'The resolved elements, or `null`. Teleport into `container` when it is set.',
        },
        {
          name: 'contained',
          type: 'ComputedRef<boolean>',
          description:
            'True when `container` resolved to an element. Position the dialog `absolute` instead of `fixed` then.',
        },
        {
          name: 'layerIndex',
          type: '() => number',
          description:
            "This dialog's position in the shared layer stack, or `-1` while closed. Add it to your z-index so a dialog opened later stacks on top.",
        },
        {
          name: 'releaseScroll',
          type: '() => void',
          description:
            "Ends the lock that `holdScrollUntilExit` keeps. Call it when your exit animation ends, such as a Transition's `@after-leave`. Does nothing while open.",
        },
      ],
    },
  ],

  DataTable: [
    {
      name: 'useDataTableContext',
      installNames: ['useDataTableContext', 'provideDataTableContext'],
      description:
        "Reaches the nearest `<DataTable>`'s sort and selection state from a component rendered inside it, such as a custom cell. A slot function can't call a composable, so put the call in a small component and render that from a `<Column>`'s `#cell` or `#header` slot. `<DataTable>` provides the context with `provideDataTableContext()`, and `<Column>` registers itself through it. `useDataTableContext()` throws outside a DataTable.",
      exampleCode: `<!-- StarCell.vue -->
<script setup lang="ts">
import { useDataTableContext } from 'vael-ui'

interface Person { id: number; name: string }
const props = defineProps<{ row: Person }>()
const table = useDataTableContext<Person>()
</script>

<template>
  <button :aria-pressed="table.isSelected(props.row)" @click="table.toggleSelect(props.row)">
    {{ table.isSelected(props.row) ? 'Starred' : 'Star' }}
  </button>
</template>

<!-- In the table -->
<DataTable :data="people" row-key="id" @update:selection="onSelection">
  <Column field="name" label="Name" />
  <Column field="id" label="">
    <template #cell="{ row }"><StarCell :row="row" /></template>
  </Column>
</DataTable>`,
      params: [
        {
          name: 'provideDataTableContext(ctx)',
          type: '(ctx: DataTableContext<T>) => void',
          description:
            'What `<DataTable>` calls in its setup. Call it yourself only to render a cell component outside a table, in a test or a story, with a stub context.',
        },
      ],
      returns: [
        {
          name: 'sort',
          type: "Ref<{ field: keyof T | null; dir: 'asc' | 'desc' | null }>",
          description: "The table's `v-model:sort`. Writing it sorts the table.",
        },
        {
          name: 'toggleSort',
          type: '(field: keyof T) => void',
          description:
            'Cycles a column the way its header button does: a new field sorts ascending, then descending, then unsorted.',
        },
        {
          name: 'selected',
          type: 'Ref<Set<string | number>>',
          description:
            'The keys of the selected rows. Read it, and change the selection with `toggleSelect` so the table emits `update:selection`.',
        },
        {
          name: 'toggleSelect',
          type: '(row: T) => void',
          description:
            'Selects or deselects `row` and emits `update:selection` with the selected rows. With `single`, it replaces the selection.',
        },
        {
          name: 'isSelected',
          type: '(row: T) => boolean',
          description: 'Whether `row` is selected.',
        },
        {
          name: 'getRowKey',
          type: '(row: T) => string | number',
          description: "The row's key, from the table's `row-key`.",
        },
        {
          name: 'registerColumn / unregisterColumn',
          type: '(col: RegisteredColumn<T>) => void',
          description: "`<Column>` uses these to join and leave the table. You don't need them.",
        },
      ],
    },
  ],

  Slider: [
    {
      name: 'useSlider',
      installNames: ['useSlider'],
      description:
        "The headless engine behind `<Slider>`. It maps pointer and keyboard input onto a number or a `[start, end]` tuple, snaps to `step` and keeps two thumbs from crossing. It writes no inline style on the thumbs or the fill. Instead, `rootStyle` sets two 0 to 1 fractions, `--ui-slider-p0` and `--ui-slider-p1`, and your CSS places everything from them. `<Slider>` adds the markup, ARIA, labels and the focus ring. Use the composable when you need a track a component can't give you, such as a scrubber or a custom range picker.",
      exampleCode: `<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useSlider } from 'vael-ui'

const volume = ref(40)
const trackEl = useTemplateRef<HTMLElement>('track')
const { rootStyle, onTrackPointerdown, onThumbPointerdown, onThumbKeydown } = useSlider(volume, {
  trackEl,
  step: 5,
})
</script>

<template>
  <div class="volume" :style="rootStyle">
    <div ref="track" class="volume-track" @pointerdown="onTrackPointerdown">
      <span
        class="volume-thumb"
        role="slider"
        tabindex="0"
        aria-label="Volume"
        :aria-valuenow="volume"
        aria-valuemin="0"
        aria-valuemax="100"
        @pointerdown.stop="onThumbPointerdown(0, $event)"
        @keydown="onThumbKeydown(0, $event)"
      />
    </div>
  </div>
</template>

<style>
/* Without touch-action: none, a touch drag scrolls the page instead. */
.volume-track { position: relative; block-size: 4px; touch-action: none; }
.volume-thumb {
  position: absolute;
  inset-inline-start: calc(var(--ui-slider-p0) * 100%);
  translate: -50% 0;
}
</style>`,
      params: [
        {
          name: 'model',
          type: 'Ref<number | [number, number]>',
          description:
            'First argument. The value the slider writes to. A tuple turns on range mode with two thumbs that can touch but never cross.',
        },
        {
          name: 'trackEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The track. Pointer positions map against its rect, so the value follows the pointer 1:1 along it.',
        },
        {
          name: 'thumbEls',
          type: 'Ref<HTMLElement[] | null>',
          description:
            'The thumbs in index order. When you pass them, a drag or a track press focuses the thumb it moves.',
        },
        {
          name: 'min',
          type: 'MaybeRefOrGetter<number>',
          description: 'Default `0`.',
        },
        {
          name: 'max',
          type: 'MaybeRefOrGetter<number>',
          description: 'Default `100`.',
        },
        {
          name: 'step',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Default `1`. Every value snaps to it, counted from `min`. Arrow keys move one step, Page Up and Page Down move ten.',
        },
        {
          name: 'orientation',
          type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
          description: "Default `'horizontal'`. A vertical track counts up from its bottom edge.",
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `false`. Ignores every pointer and key handler while `true`.',
        },
        {
          name: 'onCommit',
          type: '() => void',
          description:
            'Fires once per settled interaction: on pointer release, or after each key press. `model` updates on every drag frame, so defer an expensive side effect, such as a save request, to here. `<Slider>` re-emits it as `change`, like a native range input.',
        },
      ],
      returns: [
        {
          name: 'rootStyle',
          type: 'ComputedRef<Record<string, string>>',
          description:
            'Bind it on the root. It sets `--ui-slider-p0`, the first value as a 0 to 1 fraction of the range, and `--ui-slider-p1` in range mode.',
        },
        {
          name: 'onTrackPointerdown',
          type: '(event: PointerEvent) => void',
          description:
            'Bind it on the track. It jumps the nearest thumb to the press and keeps dragging it until release.',
        },
        {
          name: 'onThumbPointerdown',
          type: '(index: number, event: PointerEvent) => void',
          description:
            'Bind it on each thumb with `.stop`, so the track handler does not run as well.',
        },
        {
          name: 'onThumbKeydown',
          type: '(index: number, event: KeyboardEvent) => void',
          description:
            'Bind it on each thumb. Handles the arrow keys, Page Up, Page Down, Home and End.',
        },
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description: '`true` from pointer down until release.',
        },
        {
          name: 'activeThumb',
          type: 'Ref<number | null>',
          description: 'The index of the thumb a pointer is dragging, or `null` when idle.',
        },
      ],
    },
  ],

  Knob: [
    {
      name: 'useKnob',
      installNames: ['useKnob', 'KNOB_SWEEP_START_DEG', 'KNOB_SWEEP_DEG', 'KNOB_SWEEP_END_DEG'],
      description:
        "The headless engine behind `<Knob>`: a value on a 270° sweep, from −135° to +135° with the gap at the bottom. Dragging reads the pointer's angle around the dial's centre, so the value follows your finger round the circle instead of a straight-line distance. Arrow keys step, Page Up and Page Down jump 10 steps, Home and End go to the bounds. It renders nothing: bind `rootStyle` on your root and draw the dial from `--ui-knob-angle` and `--ui-knob-fraction`. The `KNOB_SWEEP_*` constants give the arc in degrees, for drawing a track that matches.",
      exampleCode: `<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useKnob } from 'vael-ui'

const volume = ref(40)
const dialEl = useTemplateRef<HTMLElement>('dial')
const { rootStyle, onDialPointerdown, onDialKeydown } = useKnob(volume, {
  dialEl,
  min: 0,
  max: 100,
  onCommit: () => console.log('saved', volume.value),
})
</script>

<template>
  <div
    ref="dial"
    class="my-knob"
    role="slider"
    tabindex="0"
    aria-label="Volume"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="volume"
    :style="rootStyle"
    @pointerdown="onDialPointerdown"
    @keydown="onDialKeydown"
  >
    <span class="my-knob-pointer" />
  </div>
</template>

<style>
.my-knob-pointer {
  rotate: var(--ui-knob-angle);
}
</style>`,
      params: [
        {
          name: 'model',
          type: 'Ref<number>',
          description:
            'The value. Set on every drag frame and key press, clamped and snapped to `step`.',
        },
        {
          name: 'dialEl',
          type: 'Ref<HTMLElement | null>',
          description: 'The round element. Pointer angles are measured around its centre.',
        },
        {
          name: 'min / max',
          type: 'MaybeRefOrGetter<number>',
          description: 'Default `0` and `100`. The sweep always spans this whole range.',
        },
        {
          name: 'step',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Default `1`. Values snap to it, without float drift such as 0.30000000000000004.',
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Ignores pointer and keyboard input.',
        },
        {
          name: 'onCommit',
          type: '() => void',
          description:
            'Fires once per settled interaction: on release, or after each key press. `<Knob>` re-emits it as `change`.',
        },
      ],
      returns: [
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description: 'True from pointer down to release.',
        },
        {
          name: 'rootStyle',
          type: 'ComputedRef<Record<string, string>>',
          description:
            "Bind on your root: `--ui-knob-angle` (−135deg to 135deg) and `--ui-knob-fraction` (0 to 1). Draw the pointer's rotation and the fill arc from them in CSS.",
        },
        {
          name: 'onDialPointerdown',
          type: '(event: PointerEvent) => void',
          description:
            'Bind on the dial. It tracks the drag on the window until release, so leaving the dial mid-drag keeps it going.',
        },
        {
          name: 'onDialKeydown',
          type: '(event: KeyboardEvent) => void',
          description: 'Bind on the focusable element: arrows, Page Up, Page Down, Home and End.',
        },
      ],
    },
  ],
  Dial: [
    {
      name: 'useDial',
      installNames: ['useDial', 'DIAL_DEFAULT_DEGREES_PER_STEP'],
      description:
        "The headless engine behind `<Dial>`: a value you turn like a jog wheel, with no fixed sweep. Each `degreesPerStep` of rotation (15° by default, a mouse wheel's detent) is one `step`. Leave `min` and `max` unset for a value that keeps counting in either direction, or set either one to clamp that end. The dial's own rotation keeps following the pointer even when the value stops at a bound, so it never stalls under your finger. It renders nothing: bind `rootStyle` and draw from `--ui-dial-rotation` and, when both bounds are set, `--ui-dial-fraction`.",
      exampleCode: `<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { useDial } from 'vael-ui'

const zoom = ref(100)
const dialEl = useTemplateRef<HTMLElement>('dial')
const { rootStyle, onDialPointerdown, onDialKeydown } = useDial(zoom, {
  dialEl,
  min: 10,
  step: 5,
})
</script>

<template>
  <div
    ref="dial"
    class="my-dial"
    role="slider"
    tabindex="0"
    aria-label="Zoom"
    :aria-valuenow="zoom"
    :style="rootStyle"
    @pointerdown="onDialPointerdown"
    @keydown="onDialKeydown"
  >
    <span class="my-dial-notch" />
  </div>
</template>

<style>
.my-dial-notch {
  rotate: var(--ui-dial-rotation);
}
</style>`,
      params: [
        {
          name: 'model',
          type: 'Ref<number>',
          description:
            'The value. Changes by `step` for every `degreesPerStep` of rotation, and on key presses.',
        },
        {
          name: 'dialEl',
          type: 'Ref<HTMLElement | null>',
          description: 'The round element. Pointer angles are measured around its centre.',
        },
        {
          name: 'min / max',
          type: 'MaybeRefOrGetter<number | undefined>',
          description: 'Unset by default, so the value is unbounded. Each side clamps on its own.',
        },
        { name: 'step', type: 'MaybeRefOrGetter<number>', description: 'Default `1`.' },
        {
          name: 'degreesPerStep',
          type: 'MaybeRefOrGetter<number | undefined>',
          description: 'Default `DIAL_DEFAULT_DEGREES_PER_STEP` (15). Lower turns faster.',
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Ignores pointer and keyboard input.',
        },
        {
          name: 'onCommit',
          type: '() => void',
          description:
            'Fires once per settled interaction: on release, or after each key press. `<Dial>` re-emits it as `change`.',
        },
      ],
      returns: [
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description: 'True from pointer down to release.',
        },
        {
          name: 'rootStyle',
          type: 'ComputedRef<Record<string, string>>',
          description:
            "Bind on your root: `--ui-dial-rotation`, the dial's own rotation in degrees, which keeps counting past 360°, and `--ui-dial-fraction` (0 to 1) when both bounds are set.",
        },
        {
          name: 'fraction',
          type: 'ComputedRef<number | undefined>',
          description:
            'Progress from 0 to 1, or `undefined` when the range is open on either side.',
        },
        {
          name: 'onDialPointerdown',
          type: '(event: PointerEvent) => void',
          description: 'Bind on the dial. It tracks the drag on the window until release.',
        },
        {
          name: 'onDialKeydown',
          type: '(event: KeyboardEvent) => void',
          description: 'Bind on the focusable element.',
        },
      ],
    },
  ],
  Resizable: [
    {
      name: 'useResizable',
      installNames: ['useResizable'],
      description:
        "The headless drag and keyboard engine behind `<Resizable>`. It turns a handle's pointer drag into a size in px on your ref. Mid drag, the size stretches past `min` and `max` with rubber-band resistance, then settles back within them on release. Arrow keys resize by 16 px, and Home and End jump to `min` and `max`. `<Resizable>` adds the panel, the separator role and its ARIA values. Use the composable when the handle and the panel live apart in your own layout.",
      exampleCode: `<script setup lang="ts">
import { ref } from 'vue'
import { useResizable } from 'vael-ui'

const width = ref(240)
const { isDragging, onHandlePointerdown, onHandleKeydown } = useResizable(width, {
  min: 160,
  max: 480,
})
</script>

<template>
  <aside class="sidebar" :style="{ inlineSize: \`\${width}px\` }">
    <nav>...</nav>
    <div
      class="sidebar-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      tabindex="0"
      :aria-valuenow="Math.round(width)"
      aria-valuemin="160"
      aria-valuemax="480"
      :data-active="isDragging || undefined"
      @pointerdown="onHandlePointerdown"
      @keydown="onHandleKeydown"
    />
  </aside>
</template>`,
      params: [
        {
          name: 'model',
          type: 'Ref<number>',
          description: 'First argument. The size in px, written on every drag frame.',
        },
        {
          name: 'min',
          type: 'MaybeRefOrGetter<number>',
          description: 'Default `0`.',
        },
        {
          name: 'max',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Default `Infinity`, no limit. End jumps the size to `max` when there is one, and does nothing without it.',
        },
        {
          name: 'direction',
          type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
          description:
            "Default `'horizontal'`, which reads `clientX` and the Left and Right arrows. `'vertical'` reads `clientY` and the Up and Down arrows.",
        },
        {
          name: 'edge',
          type: "MaybeRefOrGetter<'start' | 'end'>",
          description:
            "Default `'end'`: the handle sits on the trailing edge, so dragging right or down grows the panel. `'start'` flips it, for a handle on a right-docked panel's left border.",
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `false`. Ignores pointer and key input while `true`.',
        },
        {
          name: 'onCommit',
          type: '() => void',
          description:
            'Fires once per settled interaction: on pointer release, or after each key press. Persist the size here rather than on every drag frame.',
        },
      ],
      returns: [
        {
          name: 'onHandlePointerdown',
          type: '(event: PointerEvent) => void',
          description:
            'Bind it on the handle. Give the handle `touch-action: none`, so a touch drag resizes instead of scrolling.',
        },
        {
          name: 'onHandleKeydown',
          type: '(event: KeyboardEvent) => void',
          description:
            'Bind it on the handle, and give the handle `tabindex="0"` so it can take focus.',
        },
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description: '`true` from pointer down until release.',
        },
      ],
    },
  ],

  Dock: [
    {
      name: 'useDock',
      installNames: ['useDock'],
      description:
        'The magnification engine behind `<Dock>`. Items near the pointer grow along a smooth cosine falloff, and their neighbours spread apart to make room. It writes `transform`, or the real size in `grow` mode, straight onto each item every animation frame, so the effect costs no re-renders. A mouse magnifies on hover. A finger or pen magnifies once it slides 8 px along the dock, so a tap stays a tap. It stays at rest under `prefers-reduced-motion: reduce`. `<Dock>` adds the buttons, tooltips, roving keyboard focus and the tap bounce.',
      exampleCode: `<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useDock } from 'vael-ui'

const apps = ['Mail', 'Notes', 'Music', 'Photos']
const rootEl = useTemplateRef<HTMLElement>('root')
const { setItemEl, onPointerDown, onPointerMove, onPointerLeave } = useDock(
  rootEl,
  () => apps.length,
  { baseSize: 48, maxSize: 72 },
)
</script>

<template>
  <div
    ref="root"
    class="my-dock"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerleave="onPointerLeave"
    @pointerup="onPointerLeave"
    @pointercancel="onPointerLeave"
  >
    <button v-for="(app, i) in apps" :key="app" :ref="setItemEl(i)" class="my-dock-item">
      {{ app }}
    </button>
  </div>
</template>

<style>
/* touch-action: none lets a finger slide along the dock without scrolling the page. */
.my-dock { display: flex; gap: 8px; touch-action: none; }
.my-dock-item { inline-size: 48px; block-size: 48px; }
</style>`,
      params: [
        {
          name: 'rootEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'First argument. The dock. Item centres and its `gap` are measured against it.',
        },
        {
          name: 'itemCount',
          type: 'MaybeRefOrGetter<number>',
          description: 'Second argument. A change re-measures the items after the next render.',
        },
        {
          name: 'orientation',
          type: "MaybeRefOrGetter<'horizontal' | 'vertical'>",
          description: "Default `'horizontal'`. Sets the axis items grow and spread along.",
        },
        {
          name: 'baseSize',
          type: 'MaybeRefOrGetter<number>',
          description:
            'Default `48`. The resting item size in px that `maxSize` and `range` are designed against. Items that rest smaller, in a narrow container, magnify in proportion.',
        },
        {
          name: 'maxSize',
          type: 'MaybeRefOrGetter<number>',
          description: 'Default `76`. The item size in px directly under the pointer.',
        },
        {
          name: 'range',
          type: 'MaybeRefOrGetter<number | undefined>',
          description:
            'Default `baseSize * 3.5`. The distance in px from the pointer at which items are back to `baseSize`.',
        },
        {
          name: 'magnify',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `true`. `false` keeps every item at rest.',
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `false`. Here it only turns magnification off, the same as `magnify: false`. Blocking clicks is up to your markup.',
        },
        {
          name: 'grow',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            "Default `false`, which scales and shifts items with `transform`: the dock keeps its size and end items can reach past it. `true` sets each item's real `inline-size` and `block-size`, so the dock grows with them.",
        },
      ],
      returns: [
        {
          name: 'setItemEl',
          type: '(index: number) => (el: unknown) => void',
          description:
            'Bind it as `:ref="setItemEl(index)"` on each item. A component instance resolves to its root element.',
        },
        {
          name: 'onPointerMove',
          type: '(event: PointerEvent) => void',
          description: 'Bind it on the root `pointermove`. It retargets every item.',
        },
        {
          name: 'onPointerLeave',
          type: '() => void',
          description:
            'Bind it on the root `pointerleave`, `pointerup` and `pointercancel`. Items ease back to rest.',
        },
        {
          name: 'onPointerDown',
          type: '(event: PointerEvent) => void',
          description:
            'Bind it on the root `pointerdown`. It records where a finger or pen landed, for the 8 px slide check.',
        },
        {
          name: 'touchSlid',
          type: '() => boolean',
          description:
            '`true` once the finger or pen that is down has slid far enough to magnify. `false` means the press is a tap, so you can tell a slide from a tap on release.',
        },
        {
          name: 'remeasure',
          type: '() => void',
          description:
            'Re-measures the resting item centres. It already runs on mount, on root resize and when `itemCount` changes. Call it after a layout change none of those catch, such as a font swap.',
        },
      ],
    },
    {
      name: 'dockFalloff, dockItemSize, dockItemSizes',
      installNames: ['dockFalloff', 'dockItemSize', 'dockItemSizes'],
      description:
        'The pure, DOM-free size math `useDock` runs on every pointer move. Use them to drive your own magnification, or to preview the curve in a test or a chart. Distances are in px along the dock.',
      exampleCode: `import { dockItemSizes } from 'vael-ui'

// Four items 56 px apart, pointer over the second one.
dockItemSizes(56, [0, 56, 112, 168], { baseSize: 48, maxSize: 76, range: 168 })`,
      params: [],
      returns: [
        {
          name: 'dockFalloff(distance, range)',
          type: 'number',
          description:
            'A raised cosine from `1` at distance 0 to `0` at `range` and beyond. The sign of `distance` is ignored. Returns `0` when `range` is 0 or less.',
        },
        {
          name: 'dockItemSize(distance, options)',
          type: 'number',
          description:
            'The item size in px at `distance` from the pointer: `baseSize` plus `maxSize - baseSize` times the falloff. `options` is `{ baseSize, maxSize, range }`.',
        },
        {
          name: 'dockItemSizes(pointerPosition, centers, options)',
          type: 'number[]',
          description:
            "Every item's size at once, from the pointer position and each item's resting centre along the same axis.",
        },
      ],
    },
  ],

  SwipeToReveal: [
    {
      name: 'useSwipeReveal',
      installNames: ['useSwipeReveal'],
      description:
        "The drag engine behind `<SwipeToReveal>`. You drag a row's content sideways to uncover an actions panel on its leading or trailing edge. A press must move 8 px before it counts as a drag, and a mostly vertical move hands the gesture back to the list's scroll. On release, the row opens or closes based on how fast and how far you dragged. The component adds the action panels, their measured widths, focus handling and the `change` event.",
      exampleCode: `<script setup lang="ts">
import { ref } from 'vue'
import { useSwipeReveal } from 'vael-ui'

const open = ref(false)
const { offset, onContentPointerdown, onContentClick } = useSwipeReveal(open, {
  leadingWidth: 0,
  trailingWidth: 96,
})
</script>

<template>
  <div class="row">
    <div class="row-actions"><button>Delete</button></div>
    <div
      class="row-content"
      :style="{ transform: \`translateX(\${offset}px)\` }"
      @pointerdown="onContentPointerdown"
      @click.capture="onContentClick"
    >
      Invoice #1042
    </div>
  </div>
</template>

<style>
.row { position: relative; overflow: hidden; }
.row-actions { position: absolute; inset-block: 0; inset-inline-end: 0; inline-size: 96px; }
/* pan-y keeps vertical list scrolling native while the row takes horizontal drags. */
.row-content { position: relative; touch-action: pan-y; }
</style>`,
      params: [
        {
          name: 'open',
          type: 'Ref<boolean>',
          description:
            'First argument. Written on every settled release, `reveal()` and `close()`. Setting it yourself opens or closes the row at its default side.',
        },
        {
          name: 'leading',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `false`. Whether a leading actions panel exists to reveal.',
        },
        {
          name: 'trailing',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `true`. Whether a trailing actions panel exists to reveal.',
        },
        {
          name: 'leadingWidth',
          type: 'MaybeRefOrGetter<number>',
          description:
            "Required. The leading panel's width in px, its fully open position. A getter that reads the panel's `offsetWidth` keeps it measured.",
        },
        {
          name: 'trailingWidth',
          type: 'MaybeRefOrGetter<number>',
          description: "Required. The trailing panel's width in px.",
        },
        {
          name: 'disabled',
          type: 'MaybeRefOrGetter<boolean>',
          description: 'Default `false`. Ignores new presses while `true`.',
        },
        {
          name: 'onCommit',
          type: "(openSide: 'leading' | 'trailing' | null) => void",
          description:
            'Fires once per settled interaction with the side left open, or `null` when the row closed. `reveal()` and `close()` fire it too.',
        },
      ],
      returns: [
        {
          name: 'offset',
          type: 'Ref<number>',
          description:
            'The live signed offset in px for `translateX()`: positive shows the leading panel, negative the trailing one, `0` is closed. Past either end it stretches with rubber-band resistance.',
        },
        {
          name: 'openSide',
          type: "Ref<'leading' | 'trailing' | null>",
          description: 'The side that is open or settling open, or `null` when closed.',
        },
        {
          name: 'onContentPointerdown',
          type: '(event: PointerEvent) => void',
          description: 'Bind it on the content. Only the primary button starts tracking.',
        },
        {
          name: 'onContentClick',
          type: '(event: MouseEvent) => void',
          description:
            "Bind it as `@click.capture` on the content. It swallows the click that follows a drag, and a tap on an open row closes it instead of reaching the row's own click.",
        },
        {
          name: 'reveal',
          type: "(side?: 'leading' | 'trailing') => void",
          description:
            'Opens one side. With a single panel you can leave out `side`; with both it defaults to `trailing`. Does nothing for a side that has no panel.',
        },
        {
          name: 'close',
          type: '() => void',
          description: 'Closes the row.',
        },
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description:
            '`true` once a press passes the 8 px drag threshold, until release. A plain tap never sets it.',
        },
      ],
    },
    {
      name: 'resolveSwipeCommit',
      installNames: ['resolveSwipeCommit'],
      description:
        'The pure open or close decision `useSwipeReveal` makes on release. A flick faster than 0.11 px/ms opens when it moved toward open and closes when it moved away. A slower drag opens when more than half the panel shows. Use it to give a gesture of your own the same feel.',
      params: [
        {
          name: 'velocity',
          type: 'number',
          description:
            'Drag speed in px/ms, never negative. `useSwipeReveal` passes the distance moved divided by the time since the press.',
        },
        {
          name: 'towardOpen',
          type: 'boolean',
          description: 'Whether the drag moved toward the open side overall.',
        },
        {
          name: 'openFraction',
          type: 'number',
          description:
            "How far open the panel is at release, as a fraction of the panel's width. It can go below 0 or above 1 while rubber-banding.",
        },
      ],
      returns: [
        {
          name: 'return',
          type: 'boolean',
          description: '`true` to settle open, `false` to settle closed.',
        },
      ],
    },
  ],

  BottomSheet: [
    {
      name: 'useSheetDrag',
      installNames: ['useSheetDrag'],
      description:
        'The drag and snap engine behind `<BottomSheet>`, modeled on Vaul. The panel stays as tall as its area and only moves with `translateY`, so a drag never triggers a resize. A release settles on a snap point, steps one point for a quick short flick, or asks you to dismiss. It decides from the speed over the last 80 ms, so a slow drag that ends in a flick reads as a flick. A drag on the content only moves the sheet when the content is scrolled to the top and the drag goes down. `<BottomSheet>` adds the overlay, focus trap, enter and exit, the close flow and nested sheet detection.',
      params: [
        {
          name: 'active',
          type: 'Ref<boolean>',
          description:
            'First argument. Turning it `true` places the panel off screen, waits two frames, then slides it to `initialSnap`. Turning it `false` snaps the panel off screen at once.',
        },
        {
          name: 'panelEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The element that moves. The composable owns its `transform`, `transition` and `block-size` inline styles. It also sets `--sheet-visible-height` to the height on screen, for capping a scroll body inside.',
        },
        {
          name: 'handleEl',
          type: 'Ref<HTMLElement | null>',
          description: 'A press here always starts a drag.',
        },
        {
          name: 'contentEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The scrolling body. A press here becomes a sheet drag only when the body is at scroll top and the move is downward and mostly vertical. A mostly horizontal move is left to nested gestures, such as a swipe-to-reveal row.',
        },
        {
          name: 'snapPoints',
          type: 'MaybeRefOrGetter<SheetSnapPoint[]>',
          description:
            'Required. `{ id, height }` entries ordered from smallest to largest. `height` is a fraction of the area: `0.6` shows 60% of it.',
        },
        {
          name: 'initialSnap',
          type: 'MaybeRefOrGetter<string | undefined>',
          description: 'The `id` to open at. Default: the first snap point.',
        },
        {
          name: 'bounds',
          type: 'MaybeRefOrGetter<HTMLElement | null | undefined>',
          description:
            'An element the sheet fills instead of the viewport. Its resizes refit the panel, the same way viewport and on-screen keyboard changes do.',
        },
        {
          name: 'dismissible',
          type: 'MaybeRefOrGetter<boolean>',
          description:
            'Default `true`. `false` returns a drag past the smallest snap point to it instead of dismissing.',
        },
        {
          name: 'onDismiss',
          type: '(velocity: number) => void',
          description:
            'Required. Fires when a release decides to dismiss, with the panel left where the drag ended. Run your close flow here. `velocity` is the release speed in px/ms, positive toward closed.',
        },
      ],
      returns: [
        {
          name: 'activeSnap',
          type: 'Ref<string | null>',
          description:
            'The `id` of the snap point the sheet rests at. Read it only: writing it does not move the panel.',
        },
        {
          name: 'isDragging',
          type: 'Ref<boolean>',
          description: '`true` while the sheet follows a pointer.',
        },
        {
          name: 'reset',
          type: '() => Promise<void>',
          description:
            'Slides the panel in to `initialSnap` again. `active` turning `true` already calls it.',
        },
        {
          name: 'setReceded',
          type: '(receded: boolean) => void',
          description:
            'Scales the panel down and shifts it up 16 px while another sheet stacks on top, from its current snap point. `<BottomSheet>` calls it on the parent sheet when a nested one opens.',
        },
      ],
    },
  ],

  PullToRefresh: [
    {
      name: 'usePullToRefresh',
      installNames: ['usePullToRefresh'],
      description:
        "The gesture engine and state machine behind `<PullToRefresh>`. A downward drag at scroll top pulls a distance you render, then a release past `threshold` runs `onRefresh`. It moves through `idle`, `pulling`, `ready`, `loading` and `done`, then back to `idle`. Touch drives it through a non-passive `touchmove`, the one way to hold back the browser's own scroll and bounce. A mouse drags it through pointer events. `<PullToRefresh>` adds the pull zone, the arrow and loader indicator and the `#indicator` slot.",
      exampleCode: `<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { usePullToRefresh } from 'vael-ui'

const scrollEl = useTemplateRef<HTMLElement>('scroller')
const { state, pullDistance } = usePullToRefresh({
  scrollEl,
  onRefresh: () => fetchInbox(),
})
</script>

<template>
  <div ref="scroller" class="inbox">
    <div class="pull-zone" :style="{ blockSize: \`\${pullDistance}px\` }">
      {{ state === 'loading' ? 'Refreshing' : state === 'ready' ? 'Release to refresh' : '' }}
    </div>
    <ul>...</ul>
  </div>
</template>`,
      params: [
        {
          name: 'scrollEl',
          type: 'Ref<HTMLElement | null>',
          description:
            'The scroll container. A pull starts only when it rests at `scrollTop` 0 and the drag moves down at least 8 px. Scrolling away mid drag hands the gesture back.',
        },
        {
          name: 'onRefresh',
          type: '() => Promise<void> | void',
          description:
            'Required. Awaited while `state` is `loading`. A rejection still settles back to `idle`, and the error is swallowed, so handle it inside.',
        },
        {
          name: 'threshold',
          type: 'MaybeRefOrGetter<number | undefined>',
          description:
            'Default `60`. The pull distance in px at which a release commits. A quick flick past half of it commits too.',
        },
        {
          name: 'maxPull',
          type: 'MaybeRefOrGetter<number | undefined>',
          description:
            'Default `80`. Past this many px, the pull meets rubber-band resistance. The zone holds at this height while loading.',
        },
        {
          name: 'doneHoldMs',
          type: 'MaybeRefOrGetter<number | undefined>',
          description: 'Default `650`. How long `done` shows, in ms, before returning to `idle`.',
        },
      ],
      returns: [
        {
          name: 'state',
          type: "Ref<'idle' | 'pulling' | 'ready' | 'loading' | 'done'>",
          description: '`ready` means a release now refreshes.',
        },
        {
          name: 'pullDistance',
          type: 'Ref<number>',
          description:
            'The current pull in px, dampened past `maxPull`. Bind it to the zone height.',
        },
        {
          name: 'progress',
          type: 'ComputedRef<number>',
          description:
            'From 0 to 1, relative to `threshold`, not `maxPull`. It reaches 1 exactly where `ready` starts.',
        },
        {
          name: 'refresh',
          type: '() => Promise<void>',
          description:
            'Runs the same `loading` and `done` sequence a release does, from code. Does nothing while a refresh is already running or showing `done`.',
        },
      ],
    },
  ],
}
