import { inject } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'
import type { UiPartValue } from './classes'

export interface UiTheme {
  /** Any valid CSS color (hex, rgb(), hsl(), oklch(), a named color…). */
  primary?: string
  danger?: string
  /** Overrides the single `--ui-radius` token every component size derives from. */
  radius?: string
  /** Component text size. Unset, components follow the root (`html`) font size. */
  fontSize?: string
  /** App-wide default `ui` part-class/style overrides — same shape as each component's own `ui` prop. */
  button?: {
    ui?: Partial<{
      root: UiPartValue
      leading: UiPartValue
      trailing: UiPartValue
      content: UiPartValue
      label: UiPartValue
      badge: UiPartValue
    }>
  }
  buttonGroup?: { ui?: Partial<{ root: UiPartValue }> }
  splitButton?: {
    ui?: Partial<{
      root: UiPartValue
      main: UiPartValue
      trigger: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      footer: UiPartValue
      chevron: UiPartValue
    }>
  }
  loader?: { ui?: Partial<{ root: UiPartValue }> }
  skeleton?: { ui?: Partial<{ root: UiPartValue; bone: UiPartValue }> }
  badge?: { ui?: Partial<{ root: UiPartValue }> }
  tag?: { ui?: Partial<{ root: UiPartValue; icon: UiPartValue; label: UiPartValue }> }
  kbd?: { ui?: Partial<{ root: UiPartValue }> }
  animatedNumber?: { ui?: Partial<{ root: UiPartValue }> }
  animatedText?: { ui?: Partial<{ root: UiPartValue }> }
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
      maximize: UiPartValue
      close: UiPartValue
    }>
  }
  separator?: { ui?: Partial<{ root: UiPartValue; line: UiPartValue; text: UiPartValue }> }
  progress?: {
    ui?: Partial<{
      root: UiPartValue
      track: UiPartValue
      fill: UiPartValue
      legend: UiPartValue
      legendItem: UiPartValue
    }>
  }
  message?: {
    ui?: Partial<{
      root: UiPartValue
      icon: UiPartValue
      content: UiPartValue
      title: UiPartValue
      description: UiPartValue
      actions: UiPartValue
      close: UiPartValue
    }>
  }
  field?: {
    ui?: Partial<{
      root: UiPartValue
      label: UiPartValue
      control: UiPartValue
      group: UiPartValue
      prepend: UiPartValue
      append: UiPartValue
      description: UiPartValue
      error: UiPartValue
    }>
  }
  input?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      start: UiPartValue
      end: UiPartValue
      clear: UiPartValue
    }>
  }
  inputNumber?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      increment: UiPartValue
      decrement: UiPartValue
    }>
  }
  editable?: {
    ui?: Partial<{
      root: UiPartValue
      preview: UiPartValue
      edit: UiPartValue
      input: UiPartValue
      actions: UiPartValue
    }>
  }
  colorPicker?: {
    ui?: Partial<{
      root: UiPartValue
      swatch: UiPartValue
      panel: UiPartValue
      value: UiPartValue
      presets: UiPartValue
      preset: UiPartValue
    }>
  }
  otpInput?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      cell: UiPartValue
      separator: UiPartValue
    }>
  }
  passwordInput?: {
    ui?: Partial<{
      root: UiPartValue
      frame: UiPartValue
      input: UiPartValue
      toggle: UiPartValue
      hint: UiPartValue
      hintList: UiPartValue
      hintItem: UiPartValue
      hintIcon: UiPartValue
    }>
  }
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
  tabs?: { ui?: Partial<{ list: UiPartValue; item: UiPartValue; indicator: UiPartValue }> }
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
  breadcrumb?: { ui?: Partial<{ root: UiPartValue; list: UiPartValue; icon: UiPartValue }> }
  breadcrumbItem?: {
    ui?: Partial<{ item: UiPartValue; link: UiPartValue; current: UiPartValue }>
  }
  breadcrumbSeparator?: { ui?: Partial<{ root: UiPartValue; icon: UiPartValue }> }
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
      chevron: UiPartValue
    }>
  }
  collapsible?: {
    ui?: Partial<{ root: UiPartValue; trigger: UiPartValue; panel: UiPartValue; body: UiPartValue }>
  }
  bottomSheet?: {
    ui?: Partial<{
      overlay: UiPartValue
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
      arrow: UiPartValue
    }>
  }
  popover?: { ui?: Partial<{ positioner: UiPartValue; panel: UiPartValue }> }
  menu?: {
    ui?: Partial<{
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      footer: UiPartValue
      icon: UiPartValue
      chevron: UiPartValue
    }>
  }
  menuList?: {
    ui?: Partial<{
      root: UiPartValue
      item: UiPartValue
      separator: UiPartValue
      icon: UiPartValue
    }>
  }
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
      header: UiPartValue
      filter: UiPartValue
      footer: UiPartValue
      start: UiPartValue
      end: UiPartValue
      clear: UiPartValue
      chevron: UiPartValue
      filterIcon: UiPartValue
    }>
  }
  select?: {
    ui?: Partial<{
      trigger: UiPartValue
      value: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      option: UiPartValue
      group: UiPartValue
      groupLabel: UiPartValue
      empty: UiPartValue
      footer: UiPartValue
      start: UiPartValue
      end: UiPartValue
      clear: UiPartValue
      chevron: UiPartValue
      filterIcon: UiPartValue
    }>
  }
  combobox?: {
    ui?: Partial<{
      root: UiPartValue
      input: UiPartValue
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      list: UiPartValue
      option: UiPartValue
      group: UiPartValue
      groupLabel: UiPartValue
      empty: UiPartValue
      footer: UiPartValue
      clear: UiPartValue
      chevron: UiPartValue
      createIcon: UiPartValue
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
      header: UiPartValue
      filter: UiPartValue
      list: UiPartValue
      node: UiPartValue
      empty: UiPartValue
      footer: UiPartValue
      start: UiPartValue
      end: UiPartValue
      clear: UiPartValue
      chevron: UiPartValue
    }>
  }
  tree?: {
    ui?: Partial<{
      list: UiPartValue
      node: UiPartValue
      filter: UiPartValue
      empty: UiPartValue
      chevron: UiPartValue
      label: UiPartValue
      filterIcon: UiPartValue
    }>
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
      time: UiPartValue
      footer: UiPartValue
      icon: UiPartValue
    }>
  }
  /** Forwarded straight into the wrapped `<Menu>`'s own `ui` prop — same positioner/panel keys, themeable separately from plain `theme.menu`. */
  contextMenu?: {
    ui?: Partial<{
      positioner: UiPartValue
      panel: UiPartValue
      header: UiPartValue
      footer: UiPartValue
    }>
  }
  speedDial?: {
    ui?: Partial<{
      root: UiPartValue
      trigger: UiPartValue
      action: UiPartValue
      icon: UiPartValue
    }>
  }
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
      footer: UiPartValue
      icon: UiPartValue
    }>
  }
  tour?: {
    ui?: Partial<{ spotlight: UiPartValue; positioner: UiPartValue; panel: UiPartValue }>
  }
  sortable?: {
    ui?: Partial<{ root: UiPartValue; item: UiPartValue; handle: UiPartValue }>
  }
  rating?: { ui?: Partial<{ root: UiPartValue; item: UiPartValue }> }
  timeline?: {
    ui?: Partial<{
      root: UiPartValue
      item: UiPartValue
      opposite: UiPartValue
      marker: UiPartValue
      connector: UiPartValue
      content: UiPartValue
    }>
  }
  toaster?: {
    ui?: Partial<{
      root: UiPartValue
      toast: UiPartValue
      icon: UiPartValue
      content: UiPartValue
      title: UiPartValue
      description: UiPartValue
      action: UiPartValue
      close: UiPartValue
    }>
  }
  dataTable?: {
    ui?: Partial<{
      root: UiPartValue
      toolbar: UiPartValue
      table: UiPartValue
      thead: UiPartValue
      th: UiPartValue
      sortButton: UiPartValue
      sortChevron: UiPartValue
      grip: UiPartValue
      resizeHandle: UiPartValue
      tbody: UiPartValue
      tr: UiPartValue
      td: UiPartValue
      expansionRow: UiPartValue
      expansionContent: UiPartValue
      expandChevron: UiPartValue
      footer: UiPartValue
    }>
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

// A channel as written: a number, a percentage of `full`, or `none`.
const channel = (raw: string | undefined, full: number) =>
  !raw || raw === 'none'
    ? 0
    : raw.endsWith('%')
      ? (Number.parseFloat(raw) / 100) * full
      : Number(raw)
const toByte = (linear: number) => {
  const c = Math.min(1, Math.max(0, linear))
  return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
}
function fromOklab(l: number, a: number, b: number): [number, number, number] {
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    toByte(4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    toByte(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    toByte(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  ]
}
function fromHsl(h: number, sat: number, light: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => 255 * (light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

/**
 * A CSS colour's sRGB channels, parsed the same way on the server and in the browser (hex, `rgb()`,
 * `hsl()`, `oklch()`, `oklab()`), so the contrast text server-renders as it hydrates. Anything else
 * (a colour name) goes through a canvas in the browser.
 */
export function resolveRgb(color: string): [number, number, number] {
  const value = color.trim().toLowerCase()
  const hex = /^#([\da-f]{3,8})$/.exec(value)?.[1]
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ]
  }
  const fn = /^(rgba?|hsla?|oklch|oklab)\(([^)]*)\)$/.exec(value)
  if (fn) {
    const [a, b, c] = fn[2]!.split(/[\s,/]+/).filter(Boolean)
    if (fn[1]!.startsWith('rgb')) return [channel(a, 255), channel(b, 255), channel(c, 255)]
    if (fn[1]!.startsWith('hsl'))
      return fromHsl(Number.parseFloat(a!) || 0, channel(b, 1), channel(c, 1))
    const l = channel(a, 1)
    if (fn[1] === 'oklab') return fromOklab(l, channel(b, 0.4), channel(c, 0.4))
    const chroma = channel(b, 0.4)
    const hue = ((Number.parseFloat(c ?? '0') || 0) * Math.PI) / 180
    return fromOklab(l, chroma * Math.cos(hue), chroma * Math.sin(hue))
  }
  if (typeof document === 'undefined') return [128, 128, 128]
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return [128, 128, 128]
  ctx.fillStyle = color
  return /^#[\da-f]{6}$/i.test(ctx.fillStyle) ? resolveRgb(ctx.fillStyle) : [128, 128, 128]
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
  // A seeded danger fills buttons as-is; the dark preset's own darker fill
  // (--ui-danger-solid) is only for the default light-red danger.
  const solid = (hover: string) =>
    token === 'danger' ? [`--ui-danger-solid: ${seed};`, `--ui-danger-solid-hover: ${hover};`] : []
  const lightHover = `color-mix(in oklch, ${seed} 85%, black)`
  const darkHover = `color-mix(in oklch, ${seed} 85%, white)`
  return {
    root: [
      `--ui-${token}: ${seed};`,
      `--ui-${token}-contrast: ${contrast};`,
      // Light surfaces: darken on hover. The seed itself never flips between
      // schemes (brand hue stays constant) — only the hover mix direction does.
      `--ui-${token}-hover: ${lightHover};`,
      ...solid(lightHover),
    ],
    // Re-declaring seed + contrast (not just -hover) matters: the dark
    // preset's attribute selector has higher specificity than plain `:root`,
    // so without repeating the seed here dark mode would fall back to the
    // library default regardless of the `:root` override.
    dark: [
      `--ui-${token}: ${seed};`,
      `--ui-${token}-contrast: ${contrast};`,
      `--ui-${token}-hover: ${darkHover};`,
      ...solid(darkHover),
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
  if (theme.fontSize) {
    root.push(`font-size: ${theme.fontSize};`)
    root.push(`--ui-font-size: ${theme.fontSize};`)
  }

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
