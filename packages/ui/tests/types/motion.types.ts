// Type tests for the motion contract: checked by `pnpm typecheck`, never run.
// Every @ts-expect-error is a mistake that must stay an error; if the types start accepting it, typecheck fails.
import type {
  DialogMotion,
  InputMotion,
  ButtonMotion,
  MessageMotion,
  MotionStyle,
  PopoverMotion,
  SeparatorMotion,
  SliderMotion,
  TabsMotion,
  ToasterMotion,
} from '../../src/motion/types'
import type { DialogProps } from '../../src/components/Dialog/Dialog.vue'

// ─── Parts come from the component's `ui` keys ──────────────────────────────
type UiKeys<T> = keyof NonNullable<T extends { ui?: infer U } ? U : never>
type DialogPartsFromUi = UiKeys<DialogProps>
export const partsMatchUi: [DialogPartsFromUi] extends [import('../../src/motion/types').DialogPart]
  ? [import('../../src/motion/types').DialogPart] extends [DialogPartsFromUi]
    ? true
    : false
  : false = true

// ─── The happy paths read naturally ─────────────────────────────────────────
export const off: DialogMotion = false
export const springy: DialogMotion = { spring: { damping: 0.85, response: 0.35 } }
export const timed: DialogMotion = {
  duration: 'var(--ui-duration-enter)',
  easing: 'var(--ui-ease-out)',
}
export const states: DialogMotion = {
  initial: {
    panel: { opacity: 0, y: 16, clipPath: 'inset(10% 0 round 12px)' },
    overlay: { opacity: 0 },
  },
  exit: { panel: { opacity: 0, scale: '0.97' } },
  exitOrder: 'reverse',
  morph: 'trigger',
}

// Targets, chaining, moments and steps.
export const chained: DialogMotion<'title' | 'chart' | 'legend' | 'footer'> = {
  targets: {
    title: { initial: { opacity: 0, y: 8 } },
    chart: { initial: { opacity: 0, scale: '0.96' }, after: 'panel' },
    legend: { initial: { opacity: 0 }, after: ['title', 'chart'] },
    footer: {
      initial: { opacity: 0, y: 24 },
      steps: [{ to: { opacity: 0.5, y: 12 } }, { after: 'chart:start' }],
    },
  },
}

// Hooks see the parts and your targets, typed.
export const gsapish: DialogMotion<'rows'> = {
  enter: ({ panel, overlay }, { targets, signal }) => {
    signal.addEventListener('abort', () => {})
    return panel.animate([{ opacity: 0 }, { opacity: 1 }], 200).finished.then(() => {
      void overlay
      void targets.rows.length
    })
  },
}

// Lists stagger and slide; indicators move.
export const toasts: ToasterMotion = {
  initial: { toast: { opacity: 0, y: -12 } },
  stagger: 0.04,
  leaving: 'hold',
  states: { error: { toast: { x: [0, -6, 6, -3, 0] } } },
}
export const tabs: TabsMotion = {
  move: ({ indicator }, { from }) => indicator.animate([{ translate: `${from.x}px 0` }, {}], 200),
}

// States: keyframes play once, plain values are held.
export const input: InputMotion = {
  states: { invalid: { root: { x: [0, -6, 6, -3, 0] } }, focus: { root: { scale: '1.01' } } },
}

// Appearance on any component; values can start when visible.
export const separator: SeparatorMotion = { initial: { line: { scale: '0 1' } } }
export const slider: SliderMotion = { when: 'visible' }

// An app-wide style.
export const gooey: MotionStyle = {
  version: 1,
  spring: { damping: 0.22, response: 0.38 },
  filters: { goo: { blur: 8, contrast: [22, -10] } },
  overlay: {
    initial: { opacity: 0, scale: '0.6 1.35' },
    morph: 'trigger',
    surface: { filter: 'url(#goo)' },
  },
  list: { initial: { opacity: 0, scale: '0.3 1.8' }, stagger: 0.07 },
  press: { active: { scale: '0.88 0.8' } },
  presets: { fadeUp: { initial: { opacity: 0, y: 8 } } },
  dialog: { exitOrder: 'together' },
}

// ─── Mistakes stay errors ───────────────────────────────────────────────────

// @ts-expect-error a part Dialog doesn't have (it's `overlay`)
export const wrongPart: DialogMotion = { initial: { backdrop: { opacity: 0 } } }

// @ts-expect-error a typo in a CSS property
export const typo: DialogMotion = { initial: { panel: { opacityy: 0 } } }

// @ts-expect-error a spring and a duration together
export const mixed: DialogMotion = { spring: { damping: 1 }, duration: 200 }

// @ts-expect-error `after` naming a target that doesn't exist
export const badAfter: DialogMotion<'title'> = { targets: { title: { after: 'titel' } } }

// @ts-expect-error a moment that isn't start/settle
export const badMoment: DialogMotion<'title'> = { targets: { title: { after: 'title:end' } } }

// @ts-expect-error list keys don't exist on an overlay
export const notAList: DialogMotion = { stagger: 0.05 }

// @ts-expect-error overlay keys don't exist on a list
export const notAnOverlay: ToasterMotion = { morph: 'trigger' }

// @ts-expect-error a state the component doesn't have
export const badState: InputMotion = { states: { success: { root: { opacity: 1 } } } }

// @ts-expect-error a style without its schema version
export const unversioned: MotionStyle = { spring: { damping: 1 } }

// @ts-expect-error a filter given as markup
export const markup: MotionStyle = { version: 1, filters: { goo: '<filter id="goo" />' } }

// Percentage moments and per-value timing.
export const percent: DialogMotion<'total' | 'end'> = {
  targets: { total: { initial: { opacity: 0 } }, end: { after: 'total:60%' } },
}
export const percentTypo: DialogMotion<'total' | 'end'> = {
  // @ts-expect-error a share needs its % sign
  targets: { total: {}, end: { after: 'total:60' } },
}
export const perValue: DialogMotion = {
  initial: { panel: { opacity: 0, y: { value: 12, spring: { damping: 0.5, response: 0.4 } } } },
}
export const perValueBoth: DialogMotion = {
  // @ts-expect-error a value takes a spring or a duration, not both
  initial: { panel: { y: { value: 12, spring: { damping: 0.5, response: 0.4 }, duration: 200 } } },
}

// Morph: the short form hides the trigger; the object form decides.
export const morphKeep: DialogMotion = { morph: { from: 'trigger', hide: false } }
export const morphFromAny: PopoverMotion = { morph: { from: () => document.body } }
export const morphStyle: MotionStyle = {
  version: 1,
  overlay: { morph: { from: 'trigger', hide: false } },
}

// @ts-expect-error the object form needs `from`
export const morphNoFrom: DialogMotion = { morph: { hide: false } }

// @ts-expect-error a shared style is data: no element getters
export const morphStyleFn: MotionStyle = { version: 1, overlay: { morph: { from: () => null } } }

// @ts-expect-error Tabs renders no panels, so there's nothing to swap
export const tabsSwap: TabsMotion = { swap: 'wait' }

// ─── Only what runs is typed ────────────────────────────────────────────────

// @ts-expect-error a Button never comes or goes, so it has no enter hook
export const buttonEnter: ButtonMotion = { enter: () => {} }

// @ts-expect-error nor an exit
export const inputExit: InputMotion = { exit: { root: { opacity: 0 } } }

// @ts-expect-error only Dialog, Drawer and BottomSheet move other elements with them
export const popoverLinked: PopoverMotion = { linked: { page: { el: () => null } } }

// @ts-expect-error list slides are the built-in spring; there's no move hook
export const listMove: ToasterMotion = { move: () => {} }

// @ts-expect-error a component can't opt out of its parent's timing
export const joinOff: DialogMotion = { join: false }

// @ts-expect-error the operating system's reduced-motion setting always applies
export const styleReduced: MotionStyle = { version: 1, reducedMotion: 'never' }

// @ts-expect-error no component reads an indicator role
export const styleIndicator: MotionStyle = { version: 1, indicator: { spring: { damping: 1 } } }

// @ts-expect-error a style is data: `linked` reads elements, so it's set on the dialog
export const styleLinked: MotionStyle = { version: 1, dialog: { linked: {} } }

// A number turns in degrees, as the runtime plays it.
export const turned: DialogMotion = { initial: { panel: { rotate: -4 } } }

// Message comes and goes; Drawer moves the page.
export const messageLeaves: MessageMotion = { exit: { root: { opacity: 0, y: -4 } } }
export const dialogLinked: DialogMotion = {
  linked: { page: { el: () => document.body, open: { scale: '0.96' } } },
}
