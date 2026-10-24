/**
 * @internal A view leaving while the next comes in (`swap: 'sync'`) steps out of the flow, so the
 * new one sets the size. Run in the leave hook itself: once the new view is in, both share the
 * space and measure wrong.
 */
export function stepOut(el: Element): void {
  if (!(el instanceof HTMLElement)) return
  const parent = el.parentElement
  if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative'
  // Its computed size, not offsetWidth: under content-box that would add the padding again and
  // widen it, sliding anything right-aligned across. Its height too: one its parent stretched
  // would otherwise pack its rows at the top.
  const { width, height } = getComputedStyle(el)
  Object.assign(el.style, {
    position: 'absolute',
    top: `${el.offsetTop}px`,
    left: `${el.offsetLeft}px`,
    width,
    height,
    margin: '0',
  })
}
