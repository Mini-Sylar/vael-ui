# vael-ui

A Vue 3 UI library with a real, first-class **Vue Vapor** build, plain CSS by default,
animation-agnostic when you want more. One component per primitive, no compound-component
sprawl, fully native to Vue's own APIs.

**[Docs & full component reference → vael-ui.dev](https://vael-ui.dev)**

## Vue Vapor support

[Vue Vapor](https://github.com/vuejs/core-vapor) compiles templates straight to fine-grained
reactive DOM updates instead of the classic virtual DOM (render → VNodes → diff → patch) —
smaller runtime, faster updates. vael-ui ships **both builds from the same package**: every
component is written once as a normal VDOM SFC, then compiled a second time through Vapor's
compiler into a separate entry point.

```ts
import { Button } from 'vael-ui' // classic VDOM build
import { Button } from 'vael-ui/vapor' // compiled Vapor build, same props/API
```

`playground/vapor` is a live showcase of the Vapor build with nothing else in the tree, every
mounted component there is genuinely Vapor, verified via Vue's own `__vapor` flag in
`packages/vapor-ui/tests`.

## Install

```sh
pnpm add vael-ui
```

## Usage

```ts
// main.ts
import 'vael-ui/style.css' // import before your own global/Tailwind CSS
```

```vue
<script setup lang="ts">
import { Button, ConfigProvider } from 'vael-ui'
</script>

<template>
  <ConfigProvider :theme="{ primary: '#6366f1', radius: '12px' }">
    <Button @click="save">Save</Button>
  </ConfigProvider>
</template>
```

Dark mode is CSS-only, the library responds to `<html data-theme="dark">` and, absent that,
`prefers-color-scheme`. `useColorScheme()` handles the state part (persistence, applying the
attribute, live OS-preference updates) if you want a toggle:

```ts
import { useColorScheme } from 'vael-ui'
const { mode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem('theme'),
    set: (m) => localStorage.setItem('theme', m ?? ''),
  },
})
```

Full theming/i18n/ConfigProvider setup: [Global Setup guide](https://vael-ui.dev/docs/guides/global-setup).

## Directives

`v-tooltip` and `v-scroll-mask` need global registration unless imported directly as
`vTooltip`/`vScrollMask` inside the same `<script setup>` that uses them:

```ts
import { createApp } from 'vue'
import { vTooltip, vScrollMask } from 'vael-ui'

const app = createApp(App)
app.directive('tooltip', vTooltip)
app.directive('scroll-mask', vScrollMask)
```

`v-tooltip` also needs a single `<TooltipHost />` mounted once anywhere in your app (a shared
singleton every tooltip target renders through). Skipping either step is what causes a
`Failed to resolve directive` warning, or a tooltip that silently never shows.

Vapor apps import the same names from `vael-ui/vapor` instead. Full options and the
Vapor-specific directive shape: [Animation Integration guide](https://vael-ui.dev/docs/guides/animation-integration).

## Structure

```
packages/
  ui/         the library — publishes "vael-ui" + "vael-ui/vapor" from the same dist/
              the only place any component is hand-authored
  vapor-ui/   Vapor build/test tooling: compiles the generated tree into
              packages/ui/dist/vapor, plus Vapor browser tests
  scripts/    generate-vapor.mjs — copies each listed component into
              vapor-ui/src/generated, marks it `vapor`, rewrites imports

playground/
  vdom/             every primitive in CSS / motion-v / imperative flavors
  vapor-interop/    a VDOM + Vapor mixed app
  vapor/            standalone Vapor build showcase (vael-ui/vapor only)

docs/         the vael-ui.dev site — generated component reference + guides
```

## Scripts

| Script                                            | What it does                                                                 |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm build`                                      | Builds the library (`packages/ui/dist`) and the Vapor variant (`dist/vapor`) |
| `pnpm typecheck`                                  | Builds, then `vue-tsc` over every workspace package                          |
| `pnpm test`                                       | Browser tests for the library (vitest + Playwright, real Chromium)           |
| `pnpm test:vapor` / `test:vapor-interop`          | Vapor build and interop verification                                         |
| `pnpm play` / `play:vapor` / `play:vapor-interop` | Dev servers for each playground                                              |
| `pnpm lint` / `pnpm format`                       | `oxlint` + `eslint` / `oxfmt` write                                          |
| `pnpm changeset`                                  | Describe a pending change for the next release                               |

The library depends on `vael-ui`'s **built** `dist/`, not `src/` — `pnpm play` alone silently
serves a stale build the moment you edit library source. Run `pnpm --filter vael-ui dev`
(`tsdown --watch`) alongside it, or rebuild after each change.

## Contributing

1. `pnpm install`
2. Make your change, add tests where it makes sense
3. `pnpm typecheck && pnpm test` before opening a PR
4. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) — enforced by
   a commit-msg hook
5. If your change affects the published `vael-ui` package, run `pnpm changeset`

Releases are automated: merging to `main` opens or updates a "Version Packages" PR from any
pending changesets; merging that PR publishes to npm.

## License

MIT
