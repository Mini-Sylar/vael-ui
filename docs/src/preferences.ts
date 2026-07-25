import { shallowRef, watch } from 'vue'

export type DemoVariant = 'vdom' | 'vapor'

const STORAGE_KEY = 'vael-ui-docs-default-variant'

export const defaultVariant = shallowRef<DemoVariant>(
  (localStorage.getItem(STORAGE_KEY) as DemoVariant | null) ?? 'vdom',
)

watch(defaultVariant, (v) => localStorage.setItem(STORAGE_KEY, v))
