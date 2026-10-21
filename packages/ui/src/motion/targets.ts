// Your elements, grouped by name, each with its motion merged: style content < component key <
// instance < v-animate's own value (or the style preset it names). Shared by both engines.
import { mergeTargets } from './context'
import type { ResolvedMotion } from './context'
import type { PresenceEntry } from './presence'
import type { TargetMotion } from './types'
import { motionWarn } from './warn'

export interface TargetGroup {
  name: string
  els: Element[]
  motion: TargetMotion
}

export function targetsOf(entries: PresenceEntry[], motion: ResolvedMotion): TargetGroup[] {
  const byName = new Map<string, Element[]>()
  for (const entry of entries) byName.set(entry.name, [...(byName.get(entry.name) ?? []), entry.el])
  const merged = new Map<string, TargetMotion>()
  for (const entry of entries) {
    const own = typeof entry.motion === 'string' ? motion.presets[entry.motion] : entry.motion
    if (typeof entry.motion === 'string' && !own)
      motionWarn(`v-animate preset '${entry.motion}' isn't in the style's presets.`)
    merged.set(
      entry.name,
      mergeTargets(motion.content, motion.targets[entry.name], merged.get(entry.name), own),
    )
  }
  return [...byName].map(([name, els]) => ({ name, els, motion: merged.get(name) ?? {} }))
}
