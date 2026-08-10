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
