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
      { id: 'show', demo: 'elements/11-Show' },
      { id: 'scroll', demo: 'elements/02-OnScroll' },
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
      { id: 'presets', demo: 'styles/02-Presets' },
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
