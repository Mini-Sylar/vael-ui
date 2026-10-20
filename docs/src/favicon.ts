// The tab icon follows the picked accent. The halftone sphere's dots take one fill from a <style>
// in the SVG, with its own dark-mode rule, so recolouring is swapping that rule. Each scheme gets
// the readable shade the page uses, so a near-white or near-black pick still shows on the tab.
import { readableAccent } from './preferences'

const FAVICON = '/favicon.svg'
let source: Promise<string> | null = null
let latest = 0

function iconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

export async function syncFavicon(color: string | null): Promise<void> {
  if (typeof document === 'undefined') return
  const link = iconLink()
  if (!link) return
  const mine = ++latest
  if (!color) {
    link.href = FAVICON
    return
  }
  source ??= fetch(FAVICON).then((response) => response.text())
  let svg: string
  try {
    svg = await source
  } catch {
    source = null
    return
  }
  // A later pick landed while the SVG loaded; it applies itself.
  if (mine !== latest) return
  const style = `.vael-favicon-dot { fill: ${readableAccent(color, false)}; }
      @media (prefers-color-scheme: dark) {
        .vael-favicon-dot { fill: ${readableAccent(color, true)}; }
      }`
  const tinted = svg.replace(/<style>[\s\S]*?<\/style>/, `<style>${style}</style>`)
  link.href = `data:image/svg+xml,${encodeURIComponent(tinted)}`
}
