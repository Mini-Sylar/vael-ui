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
