import { shallowRef, watch } from 'vue'

// Redesigned component pages, on by default. `?layout=current` brings back the
// old layout for comparison, and the choice sticks for the session.
const STORAGE_KEY = 'vael-ui-docs-layout-next'

function initial(): boolean {
  if (typeof window === 'undefined') return true
  const param = new URLSearchParams(window.location.search).get('layout')
  if (param === 'next') return true
  if (param === 'current') return false
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export const layoutNext = shallowRef(initial())

watch(
  layoutNext,
  (on) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch {}
  },
  { immediate: true },
)
