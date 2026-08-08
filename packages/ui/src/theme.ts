import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { UiPartValue } from './classes'

export interface UiTheme {
  /** Any valid CSS color (hex, rgb(), hsl(), oklch(), a named color…). */
  primary?: string
  danger?: string
  /** Overrides the single `--ui-radius` token every component size derives from. */
  radius?: string
  /** App-wide default `ui` part-class/style overrides — same shape as each component's own `ui` prop. */
  button?: { ui?: Partial<{ root: UiPartValue; badge: UiPartValue }> }
  buttonGroup?: { ui?: Partial<{ root: UiPartValue }> }
  splitButton?: {
    ui?: Partial<{
      root: UiPartValue
      main: UiPartValue
      trigger: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
    }>
  }
  loader?: { ui?: Partial<{ root: UiPartValue }> }
  skeleton?: { ui?: Partial<{ root: UiPartValue }> }
  badge?: { ui?: Partial<{ root: UiPartValue }> }
  tag?: { ui?: Partial<{ root: UiPartValue; icon: UiPartValue }> }
  kbd?: { ui?: Partial<{ root: UiPartValue }> }
  avatar?: {
    ui?: Partial<{
      root: UiPartValue
      image: UiPartValue
      fallback: UiPartValue
      badge: UiPartValue
    }>
  }
  avatarGroup?: { ui?: Partial<{ root: UiPartValue; overflow: UiPartValue }> }
  card?: {
    ui?: Partial<{
      root: UiPartValue
      header: UiPartValue
      title: UiPartValue
      description: UiPartValue
      body: UiPartValue
      footer: UiPartValue
    }>
  }
  dialog?: {
    ui?: Partial<{
      overlay: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      title: UiPartValue
      description: UiPartValue
      body: UiPartValue
      footer: UiPartValue
    }>
  }
  separator?: { ui?: Partial<{ root: UiPartValue; line: UiPartValue; text: UiPartValue }> }
  progress?: { ui?: Partial<{ root: UiPartValue; track: UiPartValue; fill: UiPartValue }> }
  message?: {
    ui?: Partial<{
      root: UiPartValue
      icon: UiPartValue
      content: UiPartValue
      title: UiPartValue
      description: UiPartValue
      close: UiPartValue
    }>
  }
  field?: {
    ui?: Partial<{
      root: UiPartValue
      label: UiPartValue
      control: UiPartValue
      description: UiPartValue
      error: UiPartValue
    }>
  }
  input?: {
    ui?: Partial<{ root: UiPartValue; input: UiPartValue; start: UiPartValue; end: UiPartValue }>
  }
  inputNumber?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      increment: UiPartValue
      decrement: UiPartValue
    }>
  }
  otpInput?: { ui?: Partial<{ root: UiPartValue; input: UiPartValue; cell: UiPartValue }> }
  textarea?: {
    ui?: Partial<{
      root: UiPartValue
      textarea: UiPartValue
      start: UiPartValue
      end: UiPartValue
      bottomStart: UiPartValue
      bottomEnd: UiPartValue
    }>
  }
  checkbox?: { ui?: Partial<{ root: UiPartValue; box: UiPartValue; label: UiPartValue }> }
  switch?: {
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; thumb: UiPartValue; label: UiPartValue }>
  }
  radioGroup?: { ui?: Partial<{ root: UiPartValue }> }
  radio?: {
    ui?: Partial<{
      root: UiPartValue
      control: UiPartValue
      label: UiPartValue
      description: UiPartValue
    }>
  }
  selectButton?: {
    ui?: Partial<{ root: UiPartValue; option: UiPartValue; indicator: UiPartValue }>
  }
  tabs?: { ui?: Partial<{ list: UiPartValue }> }
  stepper?: {
    ui?: Partial<{
      root: UiPartValue
      step: UiPartValue
      trigger: UiPartValue
      circle: UiPartValue
      content: UiPartValue
      label: UiPartValue
      description: UiPartValue
      connector: UiPartValue
    }>
  }
  breadcrumb?: { ui?: Partial<{ root: UiPartValue; list: UiPartValue }> }
  breadcrumbItem?: {
    ui?: Partial<{ item: UiPartValue; link: UiPartValue; current: UiPartValue }>
  }
  breadcrumbSeparator?: { ui?: Partial<{ root: UiPartValue }> }
  toolbar?: {
    ui?: Partial<{ root: UiPartValue; group: UiPartValue; overflowTrigger: UiPartValue }>
  }
  accordion?: { ui?: Partial<{ root: UiPartValue }> }
  accordionItem?: {
    ui?: Partial<{
      item: UiPartValue
      header: UiPartValue
      trigger: UiPartValue
      panel: UiPartValue
      body: UiPartValue
    }>
  }
  collapsible?: { ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; panel: UiPartValue }> }
  bottomSheet?: {
    ui?: Partial<{
      panel: UiPartValue
      handleZone: UiPartValue
      handle: UiPartValue
      header: UiPartValue
      title: UiPartValue
      close: UiPartValue
      content: UiPartValue
    }>
  }
  pullToRefresh?: {
    ui?: Partial<{
      root: UiPartValue
      zone: UiPartValue
      indicator: UiPartValue
      bubble: UiPartValue
      label: UiPartValue
    }>
  }
  popover?: { ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }> }
  menu?: { ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }> }
  menuList?: { ui?: Partial<{ root: UiPartValue; item: UiPartValue; separator: UiPartValue }> }
  tooltip?: { ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }> }
  knob?: {
    ui?: Partial<{
      root: UiPartValue
      dial: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      indicator: UiPartValue
    }>
  }
  dial?: {
    ui?: Partial<{
      root: UiPartValue
      dial: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      ticks: UiPartValue
      face: UiPartValue
    }>
  }
  cascadeSelect?: {
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
    }>
  }
  select?: {
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      list: UiPartValue
      option: UiPartValue
      empty: UiPartValue
    }>
  }
  combobox?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      list: UiPartValue
      option: UiPartValue
      empty: UiPartValue
    }>
  }
  slider?: {
    ui?: Partial<{ root: UiPartValue; track: UiPartValue; fill: UiPartValue; thumb: UiPartValue }>
  }
  chip?: { ui?: Partial<{ root: UiPartValue; label: UiPartValue; remove: UiPartValue }> }
  fileUpload?: {
    ui?: Partial<{
      root: UiPartValue
      dropzone: UiPartValue
      browse: UiPartValue
      list: UiPartValue
      item: UiPartValue
      remove: UiPartValue
    }>
  }
  pagination?: {
    ui?: Partial<{
      root: UiPartValue
      list: UiPartValue
      button: UiPartValue
      ellipsis: UiPartValue
      sizeSelect: UiPartValue
    }>
  }
  resizable?: { ui?: Partial<{ root: UiPartValue; handle: UiPartValue }> }
  scrollArea?: { ui?: Partial<{ root: UiPartValue; viewport: UiPartValue }> }
  treeSelect?: {
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      node: UiPartValue
      empty: UiPartValue
    }>
  }
  tree?: {
    ui?: Partial<{ list: UiPartValue; node: UiPartValue; filter: UiPartValue; empty: UiPartValue }>
  }
  dock?: { ui?: Partial<{ root: UiPartValue; item: UiPartValue }> }
  calendar?: {
    ui?: Partial<{
      root: UiPartValue
      header: UiPartValue
      navButton: UiPartValue
      label: UiPartValue
      weekdays: UiPartValue
      weekday: UiPartValue
      grid: UiPartValue
      cell: UiPartValue
    }>
  }
  datePicker?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      navButton: UiPartValue
      label: UiPartValue
      weekdays: UiPartValue
      weekday: UiPartValue
      grid: UiPartValue
      cell: UiPartValue
    }>
  }
  /** Forwarded straight into the wrapped `<Menu>`'s own `ui` prop — same positioner/panel keys, themeable separately from plain `theme.menu`. */
  contextMenu?: { ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }> }
  speedDial?: { ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; action: UiPartValue }> }
  swipeToReveal?: {
    ui?: Partial<{ root: UiPartValue; content: UiPartValue; actions: UiPartValue }>
  }
  commandPalette?: {
    ui?: Partial<{
      panel: UiPartValue
      input: UiPartValue
      list: UiPartValue
      groupLabel: UiPartValue
      item: UiPartValue
      empty: UiPartValue
    }>
  }
  tour?: {
    ui?: Partial<{ spotlight: UiPartValue; positioner: UiPartValue; panel: UiPartValue }>
  }
}

export const themeKey: InjectionKey<ComputedRef<UiTheme | undefined>> = Symbol('ui-theme')

/**
 * The nearest ConfigProvider's scope attribute value (`data-ui-theme`), if
 * it has an active theme. Components that Teleport their real root out of
 * the document flow — Dialog, Toaster — inject this and re-apply it to
 * their own Teleported root, since Teleport moves the DOM node out from
 * under the scope wrapper and breaks normal CSS inheritance.
 */
export const themeScopeKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('ui-theme-scope')

/**
 * Merges an app-wide `theme.<component>.ui` default with the component's own
 * local `ui` prop — local wins per-key, theme default fills in the rest.
 * Every component calls this instead of reading `props.ui` directly.
 */
export function useThemedUi<T extends Record<string, UiPartValue | undefined>>(
  slice: (theme: UiTheme) => { ui?: Partial<T> } | undefined,
  localUi: () => Partial<T> | undefined,
): () => Partial<T> | undefined {
  const theme = inject(themeKey, undefined)
  return () => {
    const fromTheme = theme?.value && slice(theme.value)?.ui
    const local = localUi()
    if (!fromTheme) return local
    return { ...fromTheme, ...local }
  }
}

/**
 * Resolves any CSS color string to its RGB channels by letting the browser's
 * own color engine parse it (a hidden probe element + getComputedStyle) —
 * avoids hand-rolling a parser that would only cover hex.
 */
function resolveRgb(color: string): [number, number, number] {
  if (typeof document === 'undefined') return [128, 128, 128]
  const probe = document.createElement('span')
  probe.style.color = color
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const match = rgb.match(/[\d.]+/g)
  return match ? [Number(match[0]), Number(match[1]), Number(match[2])] : [128, 128, 128]
}

/**
 * WCAG relative luminance, thresholded to pick the library's own near-black
 * or near-white text token — not pure #000/#fff, so themed contrast text
 * still matches the rest of the design system's ink color.
 */
function pickContrast(color: string): string {
  const [r, g, b] = resolveRgb(color)
  const [R, G, B] = [r, g, b].map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B
  return luminance > 0.55 ? '#18181b' : '#fafafa'
}

function seedBlock(token: 'primary' | 'danger', seed: string) {
  const contrast = pickContrast(seed)
  return {
    root: [
      `--ui-${token}: ${seed};`,
      `--ui-${token}-contrast: ${contrast};`,
      // Light surfaces: darken on hover. The seed itself never flips between
      // schemes (brand hue stays constant) — only the hover mix direction does.
      `--ui-${token}-hover: color-mix(in oklch, ${seed} 85%, black);`,
    ],
    // Re-declaring seed + contrast (not just -hover) matters: the dark
    // preset's attribute selector has higher specificity than plain `:root`,
    // so without repeating the seed here dark mode would fall back to the
    // library default regardless of the `:root` override.
    dark: [
      `--ui-${token}: ${seed};`,
      `--ui-${token}-contrast: ${contrast};`,
      `--ui-${token}-hover: color-mix(in oklch, ${seed} 85%, white);`,
    ],
  }
}

/**
 * Generates a `--ui-*` custom-property override block from seed colors. Only
 * overrides one token per color plus its two derived tokens (-hover via
 * color-mix(), -contrast via computed luminance).
 *
 * `scope` defaults to `:root` (one ConfigProvider at the app root).
 * `ConfigProvider` itself always passes a unique per-instance attribute
 * selector for nested providers, so the theme doesn't leak to the whole page.
 */
export function generateThemeCss(theme: UiTheme, scope: string = ':root'): string {
  const root: string[] = []
  const dark: string[] = []

  if (theme.primary) {
    const block = seedBlock('primary', theme.primary)
    root.push(...block.root)
    dark.push(...block.dark)
  }
  if (theme.danger) {
    const block = seedBlock('danger', theme.danger)
    root.push(...block.root)
    dark.push(...block.dark)
  }
  if (theme.radius) root.push(`--ui-radius: ${theme.radius};`)

  if (root.length === 0) return ''

  const parts = [`${scope} { ${root.join(' ')} }`]
  if (dark.length > 0) {
    // Same dual dark-mode hook as the library's own tokens. `data-theme` is
    // only ever set on `:root` (never the scoped wrapper), so the dark
    // variant checks `:root`'s attribute while applying the override to the
    // descendant scope selector: `:root[data-theme='dark'] ${scope}`.
    const isRootScope = scope === ':root'
    const mediaSelector = isRootScope
      ? `:root:not([data-theme='light'])`
      : `:root:not([data-theme='light']) ${scope}`
    const attrSelector = isRootScope
      ? `:root[data-theme='dark']`
      : `:root[data-theme='dark'] ${scope}`
    parts.push(
      `@media (prefers-color-scheme: dark) { ${mediaSelector} { ${dark.join(' ')} } }`,
      `${attrSelector} { ${dark.join(' ')} }`,
    )
  }
  return parts.join('\n')
}
