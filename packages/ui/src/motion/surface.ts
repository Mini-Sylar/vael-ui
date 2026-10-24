// Popover's `surface`: the shapes behind the panel, placed as it opens and moves. Loaded only by a
// popover that sets `surface`.
// Room around the shapes for the filter to spread into before the layer's edge clips it.
const SURFACE_BLEED = 24
// The hole is a touch smaller than the trigger and the pill its size: the goo covers the trigger's
// edge, so no gap of page shows between them as an outline.
const HOLE_GROW = -1
const PILL_INSET = 0
/** Places the layer, its trigger hole, and the pill and blob, in the panel's colour. */
export function measureSurface(
  els: {
    trigger?: HTMLElement | null
    panel?: HTMLElement | null
    positioner?: HTMLElement | null
    layer?: HTMLElement | null
    pill?: HTMLElement | null
    blob?: HTMLElement | null
  },
  /** The panel's own colour, read once while it's still painted; the panel then goes clear. */
  fill: { value?: string },
) {
  const { trigger, panel, positioner, layer, pill, blob } = els
  if (!trigger || !panel || !positioner || !layer || !pill || !blob) return
  fill.value ??= getComputedStyle(panel).backgroundColor
  const panelColour = fill.value
  panel.style.setProperty('background', 'transparent')
  panel.style.setProperty('box-shadow', 'none')
  // Both in the positioner's coordinates; the panel by its layout box (a morph is moving it).
  const at = positioner.getBoundingClientRect()
  const box = trigger.getBoundingClientRect()
  const t = { x: box.left - at.left, y: box.top - at.top, w: box.width, h: box.height }
  const p = { x: panel.offsetLeft, y: panel.offsetTop, w: panel.offsetWidth, h: panel.offsetHeight }
  const left = Math.min(t.x, p.x) - SURFACE_BLEED
  const top = Math.min(t.y, p.y) - SURFACE_BLEED
  const width = Math.max(t.x + t.w, p.x + p.w) + SURFACE_BLEED - left
  const height = Math.max(t.y + t.h, p.y + p.h) + SURFACE_BLEED - top
  const radius = Math.min(
    Number.parseFloat(getComputedStyle(trigger).borderTopLeftRadius) || 0,
    t.w / 2,
    t.h / 2,
  )
  const px = (n: number) => `${n}px`
  Object.assign(layer.style, { left: px(left), top: px(top), width: px(width), height: px(height) })
  // The layer's box, with the trigger cut out of it (evenodd).
  const g = HOLE_GROW
  const x = t.x - left - g
  const y = t.y - top - g
  const w = t.w + g * 2
  const h = t.h + g * 2
  const r = radius + g
  const arc = `A${r} ${r} 0 0 1`
  const hole =
    `M${x + r} ${y}H${x + w - r}${arc} ${x + w} ${y + r}` +
    `V${y + h - r}${arc} ${x + w - r} ${y + h}H${x + r}${arc} ${x} ${y + h - r}` +
    `V${y + r}${arc} ${x + r} ${y}Z`
  layer.style.clipPath = `path(evenodd, "M0 0H${width}V${height}H0Z ${hole}")`
  const place = (shape: HTMLElement, r: typeof t, corner: string) =>
    Object.assign(shape.style, {
      left: px(r.x - left),
      top: px(r.y - top),
      width: px(r.w),
      height: px(r.h),
      borderRadius: corner,
      background: panelColour,
    })
  const i = PILL_INSET
  place(pill, { x: t.x + i, y: t.y + i, w: t.w - i * 2, h: t.h - i * 2 }, px(radius))
  place(blob, p, getComputedStyle(panel).borderTopLeftRadius)
}
