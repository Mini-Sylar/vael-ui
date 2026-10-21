// Where a component's motion comes from: built-in < style role < style's component key < the instance's `motion`.
import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type {
  MotionHook,
  MotionStyle,
  MotionTiming,
  MotionValues,
  Spring,
  TargetMotion,
} from './types'

/** @internal The nearest ConfigProvider's motion style. */
export const motionStyleKey: InjectionKey<ComputedRef<MotionStyle | undefined>> =
  Symbol('ui-motion-style')

/** @internal */
export function useMotionStyle(): ComputedRef<MotionStyle | undefined> | undefined {
  return inject(motionStyleKey, undefined)
}

/** @internal A full style, as opposed to `false`, `true` or the older `{ spring }`. */
export function isMotionStyle(value: unknown): value is MotionStyle {
  return typeof value === 'object' && value !== null && 'version' in value
}

type Parts = Record<string, MotionValues>

const TIMING_KEYS = ['spring', 'duration', 'easing'] as const

/** @internal Merges targets, nearest last. Timing comes whole from the nearest source that sets any of it. */
export function mergeTargets(...sources: (TargetMotion | undefined)[]): TargetMotion {
  const merged: Record<string, unknown> = {}
  for (const source of sources) {
    if (!source) continue
    if (TIMING_KEYS.some((key) => key in source)) for (const key of TIMING_KEYS) delete merged[key]
    Object.assign(merged, source)
  }
  return merged as TargetMotion
}
type AnyHook = MotionHook<string, never>

export interface ResolvedMotion {
  /** Instant: `false` on the instance or a provider. */
  off: boolean
  /** Whether the runtime drives it; otherwise the component's own CSS motion runs unchanged. */
  custom: boolean
  timing: MotionTiming
  spring?: Spring
  initial: Parts
  exit: Parts
  targets: Record<string, TargetMotion>
  content?: TargetMotion
  presets: Record<string, TargetMotion>
  enter?: AnyHook
  leave?: AnyHook
  exitOrder: 'together' | 'reverse'
  reducedHooks: 'skip' | 'run'
}

type Instance = Record<string, unknown> | boolean | undefined
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function timingOf(source: Record<string, unknown> | undefined): MotionTiming | undefined {
  if (!source) return undefined
  if (source.spring !== undefined) return { spring: source.spring as Spring }
  if (source.duration !== undefined || source.easing !== undefined)
    return { duration: source.duration as never, easing: source.easing as never }
  return undefined
}

/** @internal Resolves one component's motion, key by key: the nearest definition wins. */
export function resolveMotion(input: {
  role: keyof MotionStyle
  key: keyof MotionStyle
  mainPart: string
  defaults: Parts
  instance: Instance
  style: MotionStyle | undefined
  providerOff: boolean
}): ResolvedMotion {
  const { role, key, mainPart, defaults, instance, style, providerOff } = input
  const own = isObject(instance) ? instance : undefined
  const roleStyle = isObject(style?.[role]) ? (style![role] as Record<string, unknown>) : undefined
  const keyStyle = isObject(style?.[key]) ? (style![key] as Record<string, unknown>) : undefined

  const parts = (field: 'initial' | 'exit', base: Parts): Parts => {
    const fromRole = isObject(roleStyle?.[field])
      ? { [mainPart]: roleStyle![field] as MotionValues }
      : {}
    return {
      ...base,
      ...fromRole,
      ...(keyStyle?.[field] as Parts | undefined),
      ...(own?.[field] as Parts | undefined),
    }
  }
  const targets: Record<string, TargetMotion> = {
    ...(keyStyle?.targets as Record<string, TargetMotion> | undefined),
  }
  for (const [name, value] of Object.entries((own?.targets as Record<string, TargetMotion>) ?? {}))
    targets[name] = mergeTargets(targets[name], value)

  return {
    off: instance === false || providerOff,
    custom: !!own || !!roleStyle || !!keyStyle || !!style,
    timing: timingOf(own) ?? timingOf(keyStyle) ?? timingOf(roleStyle) ?? {},
    spring: style?.spring,
    initial: parts('initial', defaults),
    exit: parts('exit', {}),
    targets,
    content: style?.content,
    presets: style?.presets ?? {},
    enter: (own?.enter ?? keyStyle?.enter) as AnyHook | undefined,
    leave: (own?.leave ?? keyStyle?.leave) as AnyHook | undefined,
    exitOrder:
      ((own?.exitOrder ?? keyStyle?.exitOrder ?? roleStyle?.exitOrder) as 'together' | 'reverse') ??
      'together',
    reducedHooks: (own?.reducedMotion as 'skip' | 'run') ?? 'skip',
  }
}
