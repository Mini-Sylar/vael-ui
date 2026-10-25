// The Motion guide, chapter by chapter: each section is a heading, a sentence or two, and a live
// demo from motion-demos. The words live in the locales under motionDocs.chapters.<id>.
export interface MotionChapter {
  id: string
  routeName: string
  path: string
  sections: { id: string; demo?: string }[]
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
      { id: 'scroll', demo: 'elements/02-OnScroll' },
      { id: 'replay', demo: 'elements/03-Replay' },
      { id: 'layout', demo: 'elements/04-Layout' },
      { id: 'shared', demo: 'elements/05-SharedElement' },
      { id: 'animate', demo: 'elements/08-Animate' },
      { id: 'size', demo: 'elements/06-Size' },
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
