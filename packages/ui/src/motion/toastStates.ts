// Toaster's `states`, loaded only when they're set: each toast gets a state player, and moving into
// a variant plays that state on its parts. Its first variant only sets held values.
import { createStatePlayer } from './states'
import type { StateSpec } from './states'
import type { Spring, ToasterMotion } from './types'

interface Toast {
  id: string | number
  variant: string
}

export function createToastStates() {
  const players = new Map<Toast['id'], ReturnType<typeof createStatePlayer>>()
  return {
    sync(
      toasts: Toast[],
      cards: Map<Toast['id'], HTMLElement>,
      motion: Exclude<ToasterMotion, boolean>,
      styleSpring: Spring | undefined,
    ) {
      const spec = motion.states as StateSpec | undefined
      if (!spec) return
      const names = new Set(Object.values(spec).flatMap((byPart) => Object.keys(byPart ?? {})))
      const live = new Set<Toast['id']>()
      for (const toast of toasts) {
        live.add(toast.id)
        const card = cards.get(toast.id)
        if (!card) continue
        let player = players.get(toast.id)
        const first = !player
        if (!player) players.set(toast.id, (player = createStatePlayer()))
        const part = (name: string) =>
          name === 'toast' ? card : card.querySelector(`.ui-toast-${name}`)
        player.update({
          flags: { [toast.variant]: true },
          spec,
          parts: Object.fromEntries([...names].map((name) => [name, part(name)])),
          timing: motion.spring
            ? {}
            : ({ duration: motion.duration, easing: motion.easing } as never),
          spring: (motion.spring as Spring | undefined) ?? styleSpring,
          instant: first,
        })
      }
      for (const [id, player] of players)
        if (!live.has(id)) {
          player.dispose()
          players.delete(id)
        }
    },
    dispose() {
      for (const player of players.values()) player.dispose()
      players.clear()
    },
  }
}

export type ToastStates = ReturnType<typeof createToastStates>
