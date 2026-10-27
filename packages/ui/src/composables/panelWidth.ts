/** A dropdown panel's width: `'trigger'` to follow its field, or a width in px or any CSS length. */
export type PanelWidth = 'trigger' | number | string

/** The panel's style for a set width: exactly that, past its usual floor, but never wider than the
 * screen. None for `'trigger'` or unset, which its CSS sizes. */
export function panelWidthStyle(width: PanelWidth | undefined): Record<string, string> | undefined {
  if (width == null || width === 'trigger') return undefined
  const size = `min(${typeof width === 'number' ? `${width}px` : width}, calc(100vw - 1rem))`
  return { inlineSize: size, minInlineSize: size }
}
