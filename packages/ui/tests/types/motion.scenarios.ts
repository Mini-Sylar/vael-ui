// What people reach for, written the way they'd write it: checked by `pnpm typecheck`, never run.
// A scenario under @ts-expect-error with GAP is not expressible yet; fixing the gap makes the
// directive unused, so typecheck fails until the scenario is updated.
import type {
  AnimateDirectiveValue,
  ComponentMotion,
  DialogMotion,
  InputMotion,
  MotionStyle,
  PopoverMotion,
  ToasterMotion,
} from '../../src/motion/types'
import { useMotion } from '../../src/motion/useMotion'

declare const rowEl: { value: HTMLElement | null }
declare const gsap: { to(el: Element, vars: object): { then(f: () => void): unknown } }

// Components without motion types yet, typed as their spec would be.
type AccordionMotion = ComponentMotion<{
  parts: 'item' | 'trigger' | 'chevron' | 'panel'
  states: 'open'
}>
type DrawerMotion = ComponentMotion<{ parts: 'overlay' | 'panel' | 'body'; overlay: true }>
type ButtonMotion = ComponentMotion<{
  parts: 'root' | 'icon' | 'label'
  states: 'active' | 'hover' | 'focus' | 'loading'
}>
type SwitchMotion = ComponentMotion<{ parts: 'root' | 'track' | 'thumb'; states: 'checked' }>
type NumberMotion = ComponentMotion<{ parts: 'root' | 'digit'; value: true }>
type CardMotion = ComponentMotion<{ parts: 'root' | 'header' | 'body'; states: 'hover' }>

// 1. A field shakes when invalid (keyframes play once on entering the state).
export const shake: InputMotion = { states: { invalid: { root: { x: [0, -6, 6, -4, 4, 0] } } } }

// 2. An accordion's chevron turns with its panel (held while open).
export const chevron: AccordionMotion = { states: { open: { chevron: { rotate: '180deg' } } } }

// 3. A drawer opens and the page behind recedes.
export const recede: DrawerMotion = {
  linked: {
    page: {
      el: () => document.getElementById('app'),
      open: { scale: '0.96', borderRadius: '12px' },
    },
  },
}

// 4. A table row grows into the dialog that shows it.
export const rowToDialog: DialogMotion = { morph: { from: () => rowEl.value, hide: false } }

// 5. A success toast's icon pops; toasts come up from the bottom on a soft spring.
export const toasts: ToasterMotion = {
  spring: { damping: 0.8, response: 0.4 },
  initial: { toast: { y: 24, opacity: 0 } },
  states: { success: { icon: { scale: ['0.5', '1.2', '1'] } } },
}

// 6. A dashboard number counts up once it's scrolled into view.
export const countUp: NumberMotion = { when: 'visible' }

// 7. Press and hover feedback on a button; a card lifts on hover.
export const press: ButtonMotion = { states: { active: { root: { scale: '0.97' } } } }
export const lift: CardMotion = { states: { hover: { root: { y: -2 } } } }

// 8. A switch with a little bounce.
export const bouncy: SwitchMotion = { spring: { damping: 0.6, response: 0.3 } }

// 9. A dialog's content: summary first, then rows staggering in after it arrives.
export const chained: DialogMotion<'summary' | 'rows'> = {
  targets: {
    summary: { initial: { opacity: 0, y: 8 } },
    rows: { initial: { opacity: 0 }, stagger: 0.04, after: 'summary:60%' },
  },
}

// 10. Your own cards on a page appear one after another (v-animate).
export const cards: AnimateDirectiveValue = { initial: { opacity: 0, y: 8 }, stagger: 0.04 }

// 11. A gooey popover: a shapes-only surface through an SVG filter from the app style.
export const gooey: MotionStyle = {
  version: 1,
  filters: { goo: { blur: 10, contrast: [20, -8] } },
  overlay: { surface: { filter: 'url(#goo)' } },
}
export const gooeyPopover: PopoverMotion = { morph: 'trigger', surface: { filter: 'url(#goo)' } }

// 12. The whole app's feel in one place: snappy, no bounce, quiet exits.
export const brand: MotionStyle = {
  version: 1,
  spring: { damping: 1, response: 0.28 },
  overlay: { exit: { opacity: 0 } },
  list: { stagger: 0.03, leaving: 'pop' },
}

// 13. Hand the dialog's opening to GSAP.
export const withGsap: DialogMotion = {
  enter: (parts) => gsap.to(parts.panel, { scale: 1, opacity: 1 }),
}

// 14. Tab panels slide in from the side you moved toward. Tabs renders no panels, so the panels
// are yours: your own `dir` in the (reactive) motion getter is all it takes.
export function TabPanels(dir: { value: 1 | -1 }) {
  return useMotion('content', () => ({ initial: { root: { x: dir.value * 24, opacity: 0 } } }))
}

// 15. Months slide the way you paged: Calendar knows the direction, so the value asks for it.
type CalendarMotion = ComponentMotion<{ parts: 'root' | 'header' | 'grid' | 'cell'; swap: true }>
export const months: CalendarMotion = {
  swap: 'sync',
  initial: { grid: ({ direction }) => ({ x: direction * 24, opacity: 0 }) },
  exit: { grid: ({ direction }) => ({ x: direction * -24, opacity: 0 }) },
}

// 16. Shake a button when "copy" fails, without remounting it (it keeps focus).
export const copyFailed = (failures: number): AnimateDirectiveValue => ({
  replay: failures,
  initial: { x: [0, -4, 4, -2, 0] },
})

// 17. A multi-step dialog: the old step leaves, the next comes in, the panel eases to its height.
export const wizard: DialogMotion = { swap: 'wait' }
export const noResize: PopoverMotion = { resize: false }

// 18. Your own overlay is typed by its role: unknown keys are caught.
export function OwnSheet() {
  return useMotion<'title'>('overlay', () => ({
    initial: { root: { y: 16, opacity: 0 } },
    targets: { title: { initial: { opacity: 0 }, after: 'root:50%' } },
  }))
}
export function OwnSheetTypo() {
  // @ts-expect-error not an overlay key
  return useMotion('overlay', () => ({ stagger: 0.04 }))
}
