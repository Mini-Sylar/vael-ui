// Toaster's swipe to dismiss, a port of vue-sonner's mechanics (constants are Sonner's). The
// press is the Toaster's own (it must capture the pointer at once); moving and letting go are here.
import type { Ref } from 'vue'
import type { ToastId } from './useToast'

const SWIPE_THRESHOLD = 45 // px
const SWIPE_VELOCITY_THRESHOLD = 0.11 // px/ms
const SWIPE_EXIT_MS = 200

export interface SwipeState {
  x: number
  y: number
  swiping: boolean
  swipeOut: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
}

export function createToastSwipe(o: {
  swipeState: Map<ToastId, SwipeState>
  pointerStart: Map<ToastId, { x: number; y: number; time: number }>
  swipeAxis: Map<ToastId, 'x' | 'y' | null>
  activeSwipeId: Ref<ToastId | null>
  bottom: () => boolean
  dismiss: (id: ToastId) => void
  /** Let go: the timers resume unless the pointer is still over the stack. */
  settle: () => void
}) {
  function allowedDirections(): Array<'left' | 'right' | 'up' | 'down'> {
    return ['left', 'right', o.bottom() ? 'down' : 'up']
  }
  function dampen(delta: number) {
    return delta / (1.5 + Math.abs(delta) / 20)
  }

  function state(id: ToastId): SwipeState {
    let s = o.swipeState.get(id)
    if (!s) {
      o.swipeState.set(id, { x: 0, y: 0, swiping: false, swipeOut: false, direction: null })
      s = o.swipeState.get(id)!
    }
    return s
  }

  function move(id: ToastId, event: PointerEvent) {
    const start = o.pointerStart.get(id)
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    let axis = o.swipeAxis.get(id)
    if (!axis && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      o.swipeAxis.set(id, axis)
    }
    if (!axis) return

    const s = state(id)
    const allowed = allowedDirections()
    if (axis === 'y') {
      const wantsDown = dy > 0
      s.y =
        (wantsDown && allowed.includes('down')) || (!wantsDown && allowed.includes('up'))
          ? dy
          : dampen(dy)
      s.x = 0
    } else {
      const wantsRight = dx > 0
      s.x =
        (wantsRight && allowed.includes('right')) || (!wantsRight && allowed.includes('left'))
          ? dx
          : dampen(dx)
      s.y = 0
    }
    s.swiping = true
  }

  function up(id: ToastId) {
    const start = o.pointerStart.get(id)
    const axis = o.swipeAxis.get(id)
    o.pointerStart.delete(id)
    o.swipeAxis.delete(id)
    o.activeSwipeId.value = null
    const s = o.swipeState.get(id)
    if (!start || !s) return

    const delta = axis === 'x' ? s.x : s.y
    const elapsed = Math.max(1, performance.now() - start.time)
    const velocity = Math.abs(delta) / elapsed

    if (axis && (Math.abs(delta) >= SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD)) {
      s.swiping = false
      s.swipeOut = true
      s.direction = axis === 'x' ? (delta > 0 ? 'right' : 'left') : delta > 0 ? 'down' : 'up'
      setTimeout(() => o.dismiss(id), SWIPE_EXIT_MS)
    } else {
      s.swiping = false
      s.x = 0
      s.y = 0
    }
    o.settle()
  }
  return { move, up }
}
