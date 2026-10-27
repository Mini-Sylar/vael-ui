// The Motion guide, chapter by chapter: each section is a heading, a sentence or two, and a live
// demo from motion-demos. The words live in the locales under motionDocs.chapters.<id>.
export interface MotionChapter {
  id: string
  routeName: string
  path: string
  /** `code`: a snippet shown under the section's words, before its demo. */
  sections: { id: string; demo?: string; code?: string }[]
}

export const MOTION_CHAPTERS: MotionChapter[] = [
  {
    id: 'start',
    routeName: 'motion-start',
    path: '/motion/start',
    sections: [
      { id: 'already', demo: 'start/01-ItAlreadyMoves' },
      { id: 'one', demo: 'start/02-OneComponent' },
      { id: 'timing', demo: 'start/05-Timing' },
      { id: 'spring', demo: 'start/03-OneSpring' },
      { id: 'off', demo: 'start/04-TurnItOff' },
    ],
  },
  {
    id: 'elements',
    routeName: 'motion-elements',
    path: '/motion/elements',
    sections: [
      { id: 'appear', demo: 'elements/01-AppearAndLeave' },
      {
        id: 'names',
        code: `<!-- On its own: no name. -->
<p v-animate.rise>Saved</p>

<!-- One group: they come in one after another. -->
<li
  v-for="row in rows"
  :key="row.id"
  v-animate:rows.rise="{ stagger: true }"
>…</li>

<!-- In a component: they move with the dialog. -->
<Dialog :motion="{ targets: { rows: { initial: { y: 6 } } } }">
  <li v-for="row in rows" :key="row.id" v-animate:rows>…</li>
</Dialog>`,
      },
      { id: 'show', demo: 'elements/11-Show' },
      { id: 'scroll', demo: 'elements/02-OnScroll' },
      { id: 'grid', demo: 'elements/17-GridStagger' },
      { id: 'inView', demo: 'elements/09-InView' },
      { id: 'progress', demo: 'elements/10-ScrollProgress' },
      { id: 'replay', demo: 'elements/03-Replay' },
      { id: 'layout', demo: 'elements/04-Layout' },
      { id: 'shared', demo: 'elements/05-SharedElement' },
      {
        id: 'pages',
        demo: 'elements/15-Pages',
        code: `<script setup lang="ts">
import { vAnimate } from 'vael-ui/motion'

const page = {
  initial: { opacity: 0, y: 12 },
  exit: { opacity: 0, y: -12 },
  swap: 'wait',
} as const
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <component :is="Component" :key="route.path" v-animate:page="page" />
  </RouterView>
</template>`,
      },
      { id: 'animate', demo: 'elements/08-Animate' },
      {
        id: 'values',
        code: `v-animate="{
  initial: {
    opacity: 0,
    y: 8, // px
    rotate: -4, // degrees
    color: 'var(--ui-text-muted)',
    filter: 'blur(4px)',
    clipPath: 'inset(0 100% 0 0)',
    '--glow': 0,
  },
}"`,
      },
      { id: 'turn', demo: 'elements/13-Turn' },
      { id: 'draw', demo: 'elements/12-Draw' },
      { id: 'size', demo: 'elements/06-Size' },
      { id: 'fromCode', demo: 'elements/14-FromCode' },
      { id: 'tween', demo: 'elements/16-Tween' },
      { id: 'drag' },
      { id: 'own', demo: 'elements/07-YourComponent' },
    ],
  },
  {
    id: 'states',
    routeName: 'motion-states',
    path: '/motion/states',
    sections: [
      { id: 'press', demo: 'states/01-Press' },
      { id: 'shake', demo: 'states/02-Shake' },
      { id: 'toggle', demo: 'states/03-Toggle' },
      { id: 'keyframes', demo: 'states/06-Keyframes' },
      { id: 'each', demo: 'states/07-EachOne' },
      { id: 'again', demo: 'states/08-Again' },
      { id: 'lists', demo: 'states/04-List' },
      { id: 'toasts', demo: 'states/05-ToastStates' },
    ],
  },
  {
    id: 'overlays',
    routeName: 'motion-overlays',
    path: '/motion/overlays',
    sections: [
      { id: 'morph', demo: 'overlays/01-Morph' },
      { id: 'morphAny', demo: 'overlays/02-MorphFromAny' },
      {
        id: 'surface',
        code: `<Popover
  open-on-trigger-click
  :motion="{ morph: 'trigger', surface: { filter: 'url(#goo)' } }"
>`,
      },
      { id: 'recede', demo: 'overlays/03-Recede' },
      { id: 'inner', demo: 'overlays/04-InnerParts' },
      { id: 'swap', demo: 'overlays/05-Swap' },
      { id: 'guard', demo: 'overlays/06-Guard' },
    ],
  },
  {
    id: 'choreography',
    routeName: 'motion-choreography',
    path: '/motion/choreography',
    sections: [
      { id: 'after', demo: 'choreography/01-After' },
      { id: 'moments' },
      { id: 'steps', demo: 'choreography/02-Steps' },
      { id: 'own', demo: 'choreography/03-OwnTimeline' },
    ],
  },
  {
    id: 'callbacks',
    routeName: 'motion-callbacks',
    path: '/motion/callbacks',
    sections: [
      { id: 'enterLeave', demo: 'callbacks/01-EnterLeave' },
      { id: 'states', demo: 'callbacks/02-States' },
      { id: 'overlays', demo: 'callbacks/03-Overlays' },
      { id: 'swap', demo: 'callbacks/04-Swap' },
      { id: 'lists', demo: 'callbacks/05-Lists' },
      { id: 'move', demo: 'callbacks/06-Move' },
      { id: 'repeat', demo: 'callbacks/07-Repeat' },
      { id: 'hooks', demo: 'callbacks/08-Hooks' },
    ],
  },
  {
    id: 'styles',
    routeName: 'motion-styles',
    path: '/motion/styles',
    sections: [
      { id: 'style', demo: 'styles/01-Style' },
      {
        id: 'components',
        code: `<script setup lang="ts">
import { ConfigProvider } from 'vael-ui'
import type { MotionStyle } from 'vael-ui/motion'

const style: MotionStyle = {
  version: 1,
  spring: 'smooth',
  dialog: { initial: { panel: { opacity: 0, y: 12, scale: '0.96' } } },
  drawer: { spring: 'gentle' },
  toaster: { states: { error: { toast: { x: [0, -6, 6, 0] } } } },
  button: { states: { active: { root: { scale: '0.97' } } } },
}
</script>

<template>
  <ConfigProvider :motion="style">
    <RouterView />
  </ConfigProvider>
</template>`,
      },
      {
        id: 'presets',
        demo: 'styles/02-Presets',
        code: `const style: MotionStyle = {
  version: 1,
  presets: {
    // Yours: v-animate.wiggle anywhere inside.
    wiggle: { initial: { opacity: 0, rotate: -6 }, spring: 'bouncy' },
    // A built-in name: changes .rise inside.
    rise: { initial: { opacity: 0, y: 16 } },
  },
}

// motion.d.ts: the names autocomplete, and a typo fails vue-tsc.
import 'vael-ui/motion'
declare module 'vael-ui/motion' {
  interface MotionPresets {
    wiggle: true
  }
}`,
      },
      {
        id: 'filters',
        code: `const style: MotionStyle = {
  version: 1,
  filters: { goo: { blur: 8, contrast: [18, -7] } },
}
// Then, on any element inside: filter: url(#goo)`,
      },
      { id: 'parse', demo: 'styles/03-Parse' },
    ],
  },
  {
    id: 'server',
    routeName: 'motion-server',
    path: '/motion/server',
    sections: [
      { id: 'paint' },
      { id: 'stagger' },
      { id: 'later' },
      { id: 'open' },
      { id: 'setup' },
    ],
  },
]

/**
 * The options each section teaches, by `chapter.section`: shown by its heading, so a page can be
 * scanned for `morph`, and turned around into the All options index.
 */
export const SECTION_OPTIONS: Record<string, string[]> = {
  'start.one': ['motion'],
  'start.timing': ['duration', 'easing'],
  'start.spring': ['spring'],
  'start.off': ['motion: false'],
  'elements.appear': ['initial', 'exit'],
  'elements.names': ['v-animate:name'],
  'elements.show': ['v-show'],
  'elements.scroll': ['when', 'viewport'],
  'elements.grid': ['stagger'],
  'elements.inView': ['inView', 'viewport'],
  'elements.progress': ['progress', 'useScrollProgress'],
  'elements.replay': ['replay', 'appear'],
  'elements.layout': ['layout'],
  'elements.shared': ['layoutId'],
  'elements.pages': ['swap'],
  'elements.animate': ['animate'],
  'elements.turn': ['rotateX', 'rotateY', 'perspective'],
  'elements.draw': ['pathLength', 'pathOffset'],
  'elements.size': ['.size'],
  'elements.fromCode': ['animate()', 'useAnimate'],
  'elements.tween': ['useTween'],
  'elements.drag': ['v-draggable'],
  'elements.own': ['useMotion'],
  'states.press': ['states', 'hover', 'active', 'focus'],
  'states.shake': ['states'],
  'states.keyframes': ['times', 'repeat', 'repeatType'],
  'states.again': ['replay'],
  'states.lists': ['leaving'],
  'overlays.morph': ['morph'],
  'overlays.morphAny': ['morph'],
  'overlays.surface': ['surface'],
  'overlays.recede': ['linked'],
  'overlays.inner': ['stagger', 'exitOrder'],
  'overlays.swap': ['swap', 'resize'],
  'overlays.guard': ['before-close'],
  'choreography.after': ['after', 'targets', 'select'],
  'choreography.steps': ['steps'],
  'choreography.own': ['enter', 'leave'],
  'callbacks.enterLeave': ['onAfterEnter', 'onAfterLeave', 'onStart'],
  'callbacks.swap': ['onAfterSwap'],
  'callbacks.move': ['onAfterMove'],
  'callbacks.repeat': ['onRepeat'],
  'callbacks.hooks': ['reducedMotion'],
  'styles.style': ['ConfigProvider'],
  'styles.components': ['dialog', 'drawer', 'toaster'],
  'styles.presets': ['presets', 'MotionPresets'],
  'styles.filters': ['filters'],
  'styles.parse': ['parseMotionStyle'],
}

/** The All options page's groups, by what you're trying to do; any option not listed lands in `other`. */
export const OPTION_GROUPS: { id: string; options: string[] }[] = [
  { id: 'timing', options: ['motion', 'motion: false', 'spring', 'duration', 'easing'] },
  {
    id: 'presence',
    options: ['initial', 'exit', 'appear', 'replay', 'v-show', 'swap', 'before-close'],
  },
  {
    id: 'moving',
    options: ['animate', 'layout', 'layoutId', '.size', 'progress', 'useScrollProgress'],
  },
  { id: 'states', options: ['states', 'hover', 'active', 'focus', 'inView', 'when', 'viewport'] },
  {
    id: 'together',
    options: ['v-animate:name', 'stagger', 'after', 'steps', 'targets', 'select', 'leaving'],
  },
  { id: 'overlays', options: ['morph', 'surface', 'linked', 'exitOrder', 'resize'] },
  {
    id: 'values',
    options: [
      'rotateX',
      'rotateY',
      'perspective',
      'pathLength',
      'pathOffset',
      'times',
      'repeat',
      'repeatType',
    ],
  },
  {
    id: 'callbacks',
    options: ['onStart', 'onAfterEnter', 'onAfterLeave', 'onAfterSwap', 'onAfterMove', 'onRepeat'],
  },
  {
    id: 'code',
    options: [
      'animate()',
      'useAnimate',
      'useTween',
      'useMotion',
      'enter',
      'leave',
      'reducedMotion',
      'v-draggable',
    ],
  },
  {
    id: 'app',
    options: [
      'ConfigProvider',
      'dialog',
      'drawer',
      'toaster',
      'presets',
      'MotionPresets',
      'filters',
      'parseMotionStyle',
    ],
  },
]
