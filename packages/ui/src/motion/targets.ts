// Your elements, grouped by name, each with its motion merged: style content < component key <
// instance < v-animate's own value (or the style preset it names). Shared by both engines.
import { mergeTargets } from './context'
import type { ResolvedMotion } from './context'
import type { PresenceEntry } from './presence'
import { valuesAt } from './playable'
import type { MotionValues, MotionWhere, TargetMotion } from './types'
import { motionWarn } from './warn'

export interface TargetGroup {
  name: string
  els: Element[]
  /** The name's motion: its `stagger` and `after` are the group's. */
  motion: TargetMotion
  /** Each element's own, beside `els`: its `initial`, `exit`, `delay` and timing. */
  each: TargetMotion[]
}

export function targetsOf(
  entries: PresenceEntry[],
  motion: ResolvedMotion,
  /** One joining an open component: `appear: 'later'` plays now. */
  joining = false,
): TargetGroup[] {
  const groups = new Map<string, TargetGroup>()
  for (const entry of entries) {
    let own = typeof entry.motion === 'string' ? motion.presets[entry.motion] : entry.motion
    // `appear: 'later'`: not with the component's opening.
    if ((own as { appear?: unknown } | undefined)?.appear === 'later' && !joining)
      own = { ...own, initial: undefined }
    if (typeof entry.motion === 'string' && !own)
      if (process.env.NODE_ENV !== 'production')
        motionWarn(`v-animate preset '${entry.motion}' isn't in the style's presets.`)
    const base = mergeTargets(motion.content, motion.targets[entry.name])
    const group = groups.get(entry.name) ?? { name: entry.name, els: [], motion: base, each: [] }
    group.els.push(entry.el)
    group.each.push(mergeTargets(base, own))
    group.motion = mergeTargets(group.motion, own)
    groups.set(entry.name, group)
  }
  return [...groups.values()]
}

/** Where an element leaves to: its `exit`, `otherwise` without one, nowhere for `exit: false`. */
export const exitOf = (
  t: TargetMotion,
  where: MotionWhere,
  otherwise: MotionValues,
): MotionValues => (t.exit === false ? {} : (valuesAt(t.exit, where) ?? otherwise))
