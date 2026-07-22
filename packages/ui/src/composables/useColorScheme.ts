import { onMounted, onScopeDispose, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'

export type ColorSchemeMode = 'system' | 'light' | 'dark'

export interface UseColorSchemeOptions {
  initial?: ColorSchemeMode
  /** Structural, like ConfigProvider's `i18n` — swap in cookies, a store, whatever. Defaults to no persistence. */
  persist?: {
    get: () => string | null
    set: (mode: ColorSchemeMode | null) => void
  }
}

export interface UseColorSchemeReturn {
  mode: ShallowRef<ColorSchemeMode>
  resolvedMode: ShallowRef<'light' | 'dark'>
  setMode: (mode: ColorSchemeMode) => void
}

export function useColorScheme(options: UseColorSchemeOptions = {}): UseColorSchemeReturn {
  const query =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-color-scheme: dark)')

  const mode = shallowRef<ColorSchemeMode>(options.initial ?? 'system')
  const resolvedMode = shallowRef<'light' | 'dark'>(query?.matches ? 'dark' : 'light')

  function apply() {
    if (mode.value === 'system') {
      delete document.documentElement.dataset.theme
      resolvedMode.value = query?.matches ? 'dark' : 'light'
    } else {
      document.documentElement.dataset.theme = mode.value
      resolvedMode.value = mode.value
    }
  }

  function setMode(next: ColorSchemeMode) {
    mode.value = next
    options.persist?.set(next === 'system' ? null : next)
    apply()
  }

  onMounted(() => {
    const saved = options.persist?.get()
    if (saved === 'light' || saved === 'dark') mode.value = saved
    apply()

    const onChange = () => apply()
    query?.addEventListener('change', onChange)
    onScopeDispose(() => query?.removeEventListener('change', onChange))
  })

  return { mode, resolvedMode, setMode }
}
