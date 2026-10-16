import { afterEach, expect, test, vi } from 'vitest'
import { preventFocusZoom } from '../src/composables/preventFocusZoom'

const viewport = () => document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
function setViewport(content: string | null) {
  viewport()?.remove()
  if (content === null) return
  const meta = document.createElement('meta')
  meta.name = 'viewport'
  meta.content = content
  document.head.append(meta)
}
// Only iOS WebKit supports -webkit-touch-callout; Chromium here stands in for iOS when stubbed.
function asIOS() {
  const real = CSS.supports.bind(CSS)
  vi.spyOn(CSS, 'supports').mockImplementation(((property: string, value?: string) =>
    property === '-webkit-touch-callout' ? true : real(property, value!)) as typeof CSS.supports)
}

afterEach(() => vi.restoreAllMocks())

test('does nothing off iOS', () => {
  setViewport('width=device-width, initial-scale=1')
  expect(preventFocusZoom()).toBe(false)
  expect(viewport()!.content).toBe('width=device-width, initial-scale=1')
})

test('on iOS, adds maximum-scale=1 and keeps the rest', () => {
  asIOS()
  setViewport('width=device-width, initial-scale=1, viewport-fit=cover')
  expect(preventFocusZoom()).toBe(true)
  expect(viewport()!.content).toBe(
    'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1',
  )
})

test('on iOS, replaces an existing maximum-scale, and calling it twice changes nothing more', () => {
  asIOS()
  setViewport('width=device-width, maximum-scale=5, initial-scale=1')
  preventFocusZoom()
  preventFocusZoom()
  expect(viewport()!.content).toBe('width=device-width, initial-scale=1, maximum-scale=1')
})

test('detects an iPhone by its user agent when CSS.supports does not report the property', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
  )
  setViewport('width=device-width, initial-scale=1')
  expect(preventFocusZoom()).toBe(true)
  expect(viewport()!.content).toBe('width=device-width, initial-scale=1, maximum-scale=1')
})

test('detects an iPad in desktop mode: a Mac with a touch screen', () => {
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
  vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(5)
  setViewport('width=device-width, initial-scale=1')
  expect(preventFocusZoom()).toBe(true)
})

test('on iOS, creates the viewport tag if the page has none', () => {
  asIOS()
  setViewport(null)
  preventFocusZoom()
  expect(viewport()!.content).toBe('width=device-width, initial-scale=1, maximum-scale=1')
})
