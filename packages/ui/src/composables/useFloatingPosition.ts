import { shallowRef, toValue, watch, onScopeDispose } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'
import { autoUpdate, computePosition, flip, offset, shift, size } from '@floating-ui/dom'
import type { Placement, Side } from '@floating-ui/dom'

export type Align = 'start' | 'center' | 'end'

export interface UseFloatingPositionOptions {
  referenceEl: Ref<HTMLElement | null>
  floatingEl: Ref<HTMLElement | null>
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

  async function update() {
    const reference = options.referenceEl.value
    const floating = options.floatingEl.value
    if (!reference || !floating) return

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
        // altBoundary: true — the floating element is teleported (usually to
        // <body>), so it shares no offset parent with the reference. Without
        // this, flip/shift resolve clipping ancestors from the REFERENCE's
        // position instead, meaning any scrollable container the reference
        // happens to sit inside (a card, a panel) gets treated as the
        // boundary the floating element must stay within — even though it's
        // rendered miles away from that container and the real viewport has
        // plenty of room. See floating-ui's own docs on this exact case:
        // https://floating-ui.com/docs/detectOverflow#altboundary
        flip({ altBoundary: true }),
        shift({ altBoundary: true, padding: 8 }),
        size({
          padding: 8,
          apply({ availableHeight, rects }) {
            maxHeight.value = availableHeight
            anchorInlineSize = matchWidth ? `${rects.reference.width}px` : undefined
          },
        }),
      ],
    })

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
  watch(
    () => [toValue(options.active), options.referenceEl.value] as const,
    ([isActive, reference], previous) => {
      const wasActive = previous?.[0] ?? false
      stopAutoUpdate?.()
      stopAutoUpdate = undefined
      // Reset on (re)open, but not on reference swap while active (avoid blink)
      if (!isActive || !wasActive) {
        positionerStyle.value = { ...HIDDEN_STYLE }
        maxHeight.value = null
      }
      const floating = options.floatingEl.value
      if (!isActive || !reference || !floating) return
      stopAutoUpdate = autoUpdate(reference, floating, update)
    },
    { flush: 'post' },
  )

  onScopeDispose(() => stopAutoUpdate?.())

  return { positionerStyle, placement, transformOrigin, maxHeight, update }
}
