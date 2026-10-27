import { shallowRef, watch } from 'vue'

export type DemoVariant = 'vdom' | 'vapor'

const STORAGE_KEY = 'vael-ui-docs-default-variant'

const storedVariant =
  typeof localStorage === 'undefined'
    ? null
    : (localStorage.getItem(STORAGE_KEY) as DemoVariant | null)

export const defaultVariant = shallowRef<DemoVariant>(storedVariant ?? 'vdom')

watch(defaultVariant, (v) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, v)
})

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun'
export const packageManagers: PackageManager[] = ['npm', 'pnpm', 'yarn', 'bun']

const PM_STORAGE_KEY = 'vael-ui-docs-package-manager'

const storedPackageManager =
  typeof localStorage === 'undefined'
    ? null
    : (localStorage.getItem(PM_STORAGE_KEY) as PackageManager | null)

export const packageManager = shallowRef<PackageManager>(storedPackageManager ?? 'npm')

watch(packageManager, (v) => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(PM_STORAGE_KEY, v)
})

// No accent by default: the library's own black/white palette is the starting
// point, and a picked color is an opt-in accent. Shared so the header's theme
// popover and the home page's swatches stay in sync.
const PRIMARY_STORAGE_KEY = 'vael-ui-docs-primary'

function initialPrimaryColor(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const saved = localStorage.getItem(PRIMARY_STORAGE_KEY)
    return saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : null
  } catch {
    return null
  }
}

export const primaryColor = shallowRef<string | null>(initialPrimaryColor())

watch(primaryColor, (color) => {
  if (typeof localStorage === 'undefined') return
  if (color) localStorage.setItem(PRIMARY_STORAGE_KEY, color)
  else localStorage.removeItem(PRIMARY_STORAGE_KEY)
})

// A picked accent can be unusable against the page (white in light mode, near-black in dark):
// buttons and links would vanish. Below a 3:1 contrast with the surface, the accent is pulled
// toward readable, darker on light, lighter on dark, and that shade is what the page gets.
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}
function mix(hex: string, toward: number, amount: number): string {
  const part = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16)
    return Math.round(c + (toward - c) * amount)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${part(1)}${part(3)}${part(5)}`
}
export function readableAccent(hex: string, dark: boolean): string {
  const surface = dark ? 0.004 : 1
  const contrast = (color: string) => {
    const l = luminance(color)
    return (Math.max(l, surface) + 0.05) / (Math.min(l, surface) + 0.05)
  }
  let color = hex
  for (let step = 0.1; step <= 1 && contrast(color) < 3; step += 0.1) {
    color = mix(hex, dark ? 255 : 0, step)
  }
  return color
}
