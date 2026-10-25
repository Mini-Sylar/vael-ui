// Shared by the vdom and Vapor builds, never public: each module ships as its own file, so both
// builds use one copy (its state included), without being exported from the package.
export { useComponentMotion } from './motion/useComponentMotion'
export { useStateMotion } from './motion/useStateMotion'
export { useSwapMotion } from './motion/useSwapMotion'
export { flingTiming } from './motion/fling'
export {
  isMotionStyle,
  mergeTargets,
  motionStyleKey,
  resolveMotion,
  useMotionStyle,
} from './motion/context'
export { useScrollState } from './composables/useScrollState'
