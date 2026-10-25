// vael-ui/motion: everything that makes things move, apart from each component's own `motion`
// prop type (`DialogMotion`), which comes with the component from 'vael-ui'. It depends on nothing
// in vael-ui outside this folder (verify-motion-boundary.mjs), so it can stand on its own one day.
export { vAnimate, vAnimateVapor } from './vAnimate'
export { animate, useAnimate } from './animate'
export type { AnimateTarget, AnimationControls } from './animate'
export { useMotion } from './useMotion'
export { useScrollProgress } from './useScrollProgress'
export type { ScrollProgressOptions } from './useScrollProgress'
export { settled } from './settled'
export { springEasing } from './springEasing'
export type { MotionOptions } from './springEasing'
export { useSpringValue, createSpring, stepSpring } from './useSpringValue'
export type {
  SpringOptions,
  SpringState,
  SpringHandle,
  UseSpringValueReturn,
} from './useSpringValue'
export { parseMotionStyle } from './parse'
export type {
  AnimateDirectiveValue,
  AnimateModifier,
  AnimateStates,
  BuiltinPreset,
  MotionPresets,
  PresetName,
  ComponentMotion,
  LinkedMotion,
  MorphFrom,
  MotionContext,
  ElementHookContext,
  AnimateOptions,
  Viewport,
  ListHookContext,
  PartElements,
  MotionEngine,
  EngineTiming,
  MotionFilter,
  MotionHook,
  MotionMoment,
  MotionPhase,
  MotionRef,
  MotionResult,
  MotionRole,
  MotionSpec,
  MotionStep,
  MotionStyle,
  MotionTiming,
  MotionValues,
  MotionWhere,
  ListContext,
  MoveContext,
  OwnMotion,
  PartValues,
  Spring,
  Stagger,
  StaggerFrom,
  SpringName,
  StateMotion,
  TargetMotion,
  Thenable,
  UiDuration,
  UiEase,
  UseMotionReturn,
} from './types'

// `v-animate` registered globally (the Nuxt module does): typed in templates.
declare module 'vue' {
  interface GlobalDirectives {
    vAnimate: typeof import('./vAnimate').vAnimate
  }
}
