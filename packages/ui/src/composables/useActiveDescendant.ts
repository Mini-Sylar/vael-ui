import { watchPostEffect } from 'vue'

/** Keeps `aria-activedescendant` on an element current by writing it, so its owner doesn't re-render on every highlight move. */
export function useActiveDescendant(
  el: () => Element | null | undefined,
  id: () => string | undefined,
) {
  watchPostEffect(() => {
    const node = el()
    if (!node) return
    const value = id()
    if (value) node.setAttribute('aria-activedescendant', value)
    else node.removeAttribute('aria-activedescendant')
  })
}
