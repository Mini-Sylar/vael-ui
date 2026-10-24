// DataTable's column drag: useSortable only moves header cells. Each frame this copies their shift
// onto the body cells, and moves the dragged column's cells with the preview.
export function createColumnFollow(
  root: () => HTMLElement | null | undefined,
  head: () => HTMLElement | null | undefined,
  dragging: () => string | null,
) {
  let frame = 0
  let lastDragged: string | null = null
  const bodyCellsFor = (field: string): HTMLElement[] =>
    Array.from(
      root()?.querySelectorAll<HTMLElement>(
        `.ui-datatable-tbody .ui-datatable-td[data-column-field="${CSS.escape(field)}"]`,
      ) ?? [],
    )
  const translateX = (el: HTMLElement) => parseFloat(el.style.translate) || 0
  function follow() {
    frame = 0
    const row = head()
    if (!row) return
    const field$ = dragging()
    if (field$ !== null) lastDragged = field$
    let moving = field$ !== null
    for (const th of row.querySelectorAll<HTMLElement>('[data-column-field]')) {
      const field = th.dataset.columnField!
      const cells = bodyCellsFor(field)
      let shift = th.style.translate
      if (field === field$ && cells.length > 0) {
        // Clone mode floats a copy; element mode lifts the header itself.
        const preview = document.querySelector<HTMLElement>('[data-sortable-preview]') ?? th
        const cellLeft = cells[0]!.getBoundingClientRect().left - translateX(cells[0]!)
        const dx = preview.getBoundingClientRect().left - cellLeft
        shift = Math.abs(dx) < 0.5 ? '' : `${dx}px 0`
      }
      if (shift) moving = true
      // Lifted for the whole drag, and after the drop until the cells settle back.
      const lifted = field === lastDragged && (field === field$ || shift !== '')
      for (const cell of cells) {
        cell.style.translate = shift
        cell.toggleAttribute('data-column-dragging', lifted)
      }
    }
    if (moving) frame = requestAnimationFrame(follow)
    else lastDragged = null
  }
  return {
    start: () => void (frame ||= requestAnimationFrame(follow)),
    stop: () => cancelAnimationFrame(frame),
  }
}
