// The built-in entrances, by name: `v-animate.rise` or `v-animate="'rise'"`. A ConfigProvider
// style's preset of the same name wins.
import type { TargetMotion } from './types'

export const BUILTIN_PRESETS = {
  fade: { initial: { opacity: 0 } },
  rise: { initial: { opacity: 0, y: 8 } },
  drop: { initial: { opacity: 0, y: -8 } },
  pop: { initial: { opacity: 0, scale: 0.9 }, spring: 'bouncy' },
  blur: { initial: { opacity: 0, blur: 4 } },
} satisfies Record<string, TargetMotion>

export type BuiltinPreset = keyof typeof BUILTIN_PRESETS
