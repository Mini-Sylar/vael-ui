import type { MotionStyle } from 'vael-ui'

// The site's motion presets: what the header's motion menu puts on the whole docs.
export const MOTION_PRESETS = ['default', 'calm', 'snappy', 'bouncy', 'jelly', 'gooey'] as const
export type MotionPreset = (typeof MOTION_PRESETS)[number]

export const motionPresets: Record<Exclude<MotionPreset, 'default'>, MotionStyle> = {
  calm: {
    version: 1,
    spring: { damping: 1, response: 0.42 },
    overlay: { initial: { opacity: 0, y: 8 } },
    list: { initial: { opacity: 0, y: 4 }, stagger: 0.03 },
    press: { active: { scale: '0.985' } },
  },
  snappy: {
    version: 1,
    spring: { damping: 0.9, response: 0.22 },
    overlay: { initial: { opacity: 0, scale: '0.96' } },
    list: { initial: { opacity: 0, x: -10 }, stagger: 0.02 },
    press: { active: { scale: '0.95' } },
  },
  bouncy: {
    version: 1,
    spring: { damping: 0.55, response: 0.45 },
    overlay: { initial: { opacity: 0, scale: '0.85', y: 16 } },
    list: { initial: { opacity: 0, y: 14, scale: '0.9' }, stagger: 0.05 },
    press: { active: { scale: '0.9' } },
  },
  // Width and height start on opposite sides of 1, so as one overshoots the other undershoots.
  jelly: {
    version: 1,
    spring: { damping: 0.25, response: 0.4 },
    overlay: { initial: { opacity: 0, scale: '0.6 1.35', y: 30 } },
    list: {
      initial: { opacity: 0, scale: '0.3 1.8', y: -30 },
      exit: { opacity: 0, scale: '1.25 0.1' },
      stagger: 0.07,
    },
    press: { active: { scale: '0.88 0.8' } },
  },
  // Soft and blobby: things come in blurred and swell into shape.
  gooey: {
    version: 1,
    spring: { damping: 0.45, response: 0.5 },
    overlay: { initial: { opacity: 0, scale: '0.8', blur: 12 } },
    list: { initial: { opacity: 0, scale: '0.7', blur: 8 }, stagger: 0.05 },
    press: { active: { scale: '0.92' } },
  },
}
