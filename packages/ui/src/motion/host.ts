// What a component's shell and a motion engine (CSS or runtime) agree on. Types only.
import type { ShallowRef } from 'vue'
import type { ResolvedMotion } from './context'
import type { MotionPhase } from './types'

/** What a component's shell hands an engine. */
export interface RunnerHost {
  name: string
  mainPart: string
  resolved: () => ResolvedMotion
  /** Parts and root, remembered past Vue nulling the refs on unmount. */
  parts: () => Record<string, Element | null | undefined>
  root: () => Element | null | undefined
  phase: ShallowRef<MotionPhase>
  /** The element `morph: 'trigger'` grows from: the one that opened the component. */
  trigger?: () => Element | null | undefined
  onAfterEnter?: () => void
  onAfterLeave?: () => void
}

export interface Runner {
  enter: (el: Element, done: () => void) => void
  leave: (el: Element, done: () => void) => void
  cancel: () => void
  /** The component is going away: undo anything left on other elements. */
  dispose?: () => void
}
