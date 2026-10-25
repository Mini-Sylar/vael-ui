// Type test: the motion API's names and shapes, checked by vue-tsc with the rest of the tests.
import type {
  AnimateDirectiveValue,
  ButtonMotion,
  ProgressMotion,
  TimelineMotion,
  ToasterMotion,
} from '../../src/motion/types'

// Every component takes a stagger for its repeated parts and its lists, in words or seconds.
export const progress: ProgressMotion = { initial: { fill: { scale: '0 1' } }, stagger: true }
export const timeline: TimelineMotion = { stagger: 'end' }
export const toaster: ToasterMotion = { stagger: 0.05 }
// @ts-expect-error not a stagger word
export const wrong: TimelineMotion = { stagger: 'middle' }

// A spring by name, or as numbers, eases one step of keyframes.
export const pop: ButtonMotion = {
  states: {
    active: {
      root: {
        scale: {
          value: ['1', '1.15', '1'],
          times: [0, 0.1, 1],
          easing: ['linear', 'bouncy'],
          duration: 600,
        },
      },
    },
  },
}
export const numbers: ButtonMotion = {
  states: {
    active: {
      root: {
        scale: {
          value: ['1', '1.1', '1'],
          easing: ['out', { damping: 0.4, response: 0.3 }],
          duration: 500,
        },
      },
    },
  },
}

export const later: AnimateDirectiveValue = { initial: { opacity: 0 }, appear: 'later' }
