import { shallowRef, type Component } from 'vue'

// `vael-ui/vapor` has no SSR entry point at all (Vue 3.6's Vapor mode has no
// server renderer, by design) — importing it eagerly crashes vite-ssg's
// prerender pass the moment the module loads, regardless of whether the
// Vapor variant ever actually renders. Deferred to a client-only dynamic
// import instead; `defaultVariant` defaults to 'vdom' with no persisted
// preference yet at SSR/first paint, so the empty map here never gets read
// before real data arrives.
let cache: Promise<Record<string, Component>> | null = null

export function useVaporComponents() {
  const components = shallowRef<Record<string, Component>>({})

  if (!import.meta.env.SSR) {
    cache ??= import('vael-ui/vapor').then((mod) => mod as unknown as Record<string, Component>)
    cache.then((mod) => (components.value = mod))
  }

  return components
}
