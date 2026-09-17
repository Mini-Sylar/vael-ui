import { shallowRef, toValue, watch, onScopeDispose } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type { ElRef } from './dom'
import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom'
import type { Placement, Side } from '@floating-ui/dom'

export type Align = 'start' | 'center' | 'end'

export interface UseFloatingPositionOptions {
  referenceEl: ElRef<HTMLElement | null>
  floatingEl: ElRef<HTMLElement | null>
  /** Positioning (and its scroll/resize tracking) only runs while true. */
  active: MaybeRefOrGetter<boolean>
  side?: MaybeRefOrGetter<Side>
  align?: MaybeRefOrGetter<Align>
  /** Gap between reference and floating element, along `side`. */
  sideOffset?: MaybeRefOrGetter<number>
  /** Shift along the alignment axis, independent of `align`. */
  alignOffset?: MaybeRefOrGetter<number>
  /** Writes the reference element's measured width into `positionerStyle` as `--ui-anchor-inline-size` (a custom property, not `inline-size` directly — the positioner still shrink-to-fits by default; only a component that opts in, like Select's panel, consumes the variable). Default false; Popover/Menu/Tooltip never pass this and are byte-for-byte unaffected. */
  matchReferenceWidth?: MaybeRefOrGetter<boolean>
  /** Caps the returned `maxHeight` at this value even when more viewport space is available — the available-space budget still wins when it's smaller. Omitted keeps today's behavior (viewport space is the only limit). */
  maxHeightCap?: MaybeRefOrGetter<number | undefined>
  /** Fires once if `referenceEl` is removed from the document while `active` — a route change under a delegated/external reference otherwise leaves `autoUpdate` repositioning against a detached node, which degenerates to a `{0,0,0,0}` rect. */
  onReferenceDisconnected?: () => void
}

// Coarse mapping for transform-origin (enough for scale/fade).
const BLOCK_ORIGIN: Record<Side, string> = {
  top: 'bottom',
  bottom: 'top',
  left: 'center',
  right: 'center',
}
const INLINE_ORIGIN: Record<Align, string> = {
  start: 'left',
  center: 'center',
  end: 'right',
}

function toPlacement(side: Side, align: Align): Placement {
  return align === 'center' ? side : (`${side}-${align}` as Placement)
}

function toTransformOrigin(placement: Placement): string {
  const [side, align = 'center'] = placement.split('-') as [Side, Align | undefined]
  const vertical = side === 'top' || side === 'bottom'
  const block = BLOCK_ORIGIN[side]
  const inline = INLINE_ORIGIN[align]
  return vertical ? `${inline} ${block}` : `${block} ${inline}`
}

// Position absolute to avoid scroll jitter; hidden until computed.
const HIDDEN_STYLE: Record<string, string> = {
  position: 'absolute',
  top: '0px',
  left: '0px',
  visibility: 'hidden',
}

export function useFloatingPosition(options: UseFloatingPositionOptions) {
  const positionerStyle = shallowRef<Record<string, string>>({ ...HIDDEN_STYLE })
  const placement = shallowRef<Placement>('bottom')
  const transformOrigin = shallowRef('center center')
  // Available space (null when no constraint)
  const maxHeight = shallowRef<number | null>(null)
  // Set only when matchReferenceWidth enabled (avoid spreading undefined)
  let anchorInlineSize: string | undefined
  // `update` is async (`computePosition` itself awaits a layout read); autoUpdate's own
  // ResizeObserver/scroll listeners routinely fire it again before an earlier call resolves — a
  // reference swap especially, which restarts the observers and typically gets several redundant
  // calls in the same burst. Without this, whichever call happens to resolve LAST wins even if an
  // EARLIER call for a newer reference resolves first, and consumers (Tooltip's warm-glide) see a
  // stream of stale/duplicate position updates instead of one settled value.
  let updateToken = 0

  async function update() {
    const reference = options.referenceEl.value
    const floating = options.floatingEl.value
    if (!reference || !floating) return
    if (!reference.isConnected) return
    const token = ++updateToken

    const side = toValue(options.side) ?? 'bottom'
    const align = toValue(options.align) ?? 'center'
    const matchWidth = toValue(options.matchReferenceWidth) ?? false
    const result = await computePosition(reference, floating, {
      placement: toPlacement(side, align),
      strategy: 'absolute',
      middleware: [
        offset({
          mainAxis: toValue(options.sideOffset) ?? 8,
          crossAxis: toValue(options.alignOffset) ?? 0,
        }),
        // No altBoundary here: it resolves the boundary from the REFERENCE's
        // clipping ancestors, so a trigger inside any scrollable panel makes
        // flip/shift/size believe there's no room anywhere.
        flip(),
        shift({ padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, rects }) {
            const cap = toValue(options.maxHeightCap)
            maxHeight.value = cap != null ? Math.min(availableHeight, cap) : availableHeight
            anchorInlineSize = matchWidth ? `${rects.reference.width}px` : undefined
          },
        }),
      ],
    })
    // A newer call already started (or the scope was disposed and `update` will never be called
    // again) — this result is stale, discard it rather than clobber a more current position.
    if (token !== updateToken) return

    positionerStyle.value = {
      position: 'absolute',
      top: `${result.y}px`,
      left: `${result.x}px`,
      visibility: 'visible',
      ...(anchorInlineSize ? { '--ui-anchor-inline-size': anchorInlineSize } : {}),
    }
    placement.value = result.placement
    transformOrigin.value = toTransformOrigin(result.placement)
  }

  let stopAutoUpdate: (() => void) | undefined
  let disconnectObserver: MutationObserver | undefined
  watch(
    () => [toValue(options.active), options.referenceEl.value] as const,
    ([isActive, reference], previous) => {
      const wasActive = previous?.[0] ?? false
      stopAutoUpdate?.()
      stopAutoUpdate = undefined
      disconnectObserver?.disconnect()
      disconnectObserver = undefined
      // Invalidate whatever `update()` call might already be in flight for the config being torn
      // down — its result, whenever it resolves, must not overwrite what's set up next.
      updateToken++
      // Reset on (re)open, but not on reference swap while active (avoid blink)
      if (!isActive || !wasActive) {
        positionerStyle.value = { ...HIDDEN_STYLE }
        maxHeight.value = null
      }
      const floating = options.floatingEl.value
      if (!isActive || !reference || !floating) return
      stopAutoUpdate = autoUpdate(reference, floating, update)
      if (options.onReferenceDisconnected && typeof MutationObserver !== 'undefined') {
        disconnectObserver = new MutationObserver(() => {
          if (reference.isConnected) return
          disconnectObserver?.disconnect()
          disconnectObserver = undefined
          options.onReferenceDisconnected?.()
        })
        disconnectObserver.observe(document.body, { childList: true, subtree: true })
      }
    },
    { flush: 'post' },
  )

  onScopeDispose(() => {
    stopAutoUpdate?.()
    disconnectObserver?.disconnect()
    // In case an `update()` call is still in flight when the scope tears down — its resolution
    // must not write to a ref nothing will ever read again.
    updateToken++
  })

  return { positionerStyle, placement, transformOrigin, maxHeight, update }
}
