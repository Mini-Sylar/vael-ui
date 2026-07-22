# vael-ui

A Vue 3 UI library with a real, first-class **Vue Vapor** build — not a compatibility shim,
every component actually compiles through Vapor's fine-grained, no-virtual-DOM runtime. Also
animation-agnostic: plain CSS by default, or bring your own animation library (motion-v,
GSAP) via exposed refs and slots. One component per primitive, no compound-component
sprawl, fully native to Vue's own APIs (`defineModel`, `defineExpose`, generic SFCs).

## Vue Vapor support

[Vue Vapor](https://github.com/vuejs/core-vapor) is Vue 3.6's new compilation mode: instead
of the virtual DOM (render function → VNodes → diff → patch), Vapor compiles templates
straight to fine-grained reactive DOM updates — no VNodes, no diffing, smaller runtime,
faster updates. It's the same shift Svelte made to compiled output, now available inside Vue.

vael-ui ships **both builds from the same package**, generated from the same source — every
component is written once as a normal VDOM SFC, then compiled a second time through Vapor's
compiler into a separate entry point:

```ts
import { Button } from 'vael-ui' // classic VDOM build
import { Button } from 'vael-ui/vapor' // compiled Vapor build, same props/API
```

Pick whichever your app runs (or mix both — Vue 3.6 supports VDOM/Vapor interop in one app),
without switching component libraries or waiting for Vapor-native alternatives to catch up
on component coverage. `playground/vapor` is a live showcase of the Vapor build with nothing
else in the tree — every mounted component there is genuinely Vapor, verified via Vue's own
`__vapor` component flag in `packages/vapor-ui/tests`.

## Install

```sh
npm install vael-ui
# or
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

Dark mode is CSS-only — the library responds to `<html data-theme="dark">` and, absent that,
`prefers-color-scheme`. It ships no toggle UI of its own; `useColorScheme()` is the composable
that gets the state part right (persistence, applying the attribute, live OS-preference
updates) so you don't hand-roll it:

```vue
<script setup lang="ts">
import { useColorScheme } from 'vael-ui'

const { mode, setMode } = useColorScheme({
  persist: {
    get: () => localStorage.getItem('theme'),
    set: (m) => localStorage.setItem('theme', m ?? ''),
  },
})
</script>

<template>
  <Button @click="setMode(mode === 'dark' ? 'light' : 'dark')">{{ mode }}</Button>
</template>
```

`persist` is optional and structurally typed like `ConfigProvider`'s `i18n` prop — swap in
cookies, a store, whatever your app already uses.

## Directives

`v-tooltip` and `v-scroll-mask` aren't global by default — Vue only auto-resolves a directive
from a plain import (no `app.directive(...)` call) when it's imported as `vTooltip`/
`vScrollMask` _inside the same `<script setup>` block_ that uses it. If you're using either
in more than one component, register them globally once instead:

```ts
// main.ts
import { createApp } from 'vue'
import { vTooltip, vScrollMask } from 'vael-ui'

const app = createApp(App)
app.directive('tooltip', vTooltip)
app.directive('scroll-mask', vScrollMask)
app.mount('#app')
```

Skipping this is what causes a `Failed to resolve directive` warning.

**`v-tooltip`** also needs a single `<TooltipHost />` mounted once, anywhere in your app (it's
a shared singleton — every `v-tooltip` target renders through it):

```vue
<script setup lang="ts">
import { Button, TooltipHost } from 'vael-ui'
</script>

<template>
  <TooltipHost />
  <Button v-tooltip="'Delete'" icon aria-label="Delete">🗑</Button>
  <Button v-tooltip.bottom="{ content: 'Settings', openDelay: 200 }" icon aria-label="Settings"
    >⚙</Button
  >
</template>
```

### In a Vapor app

`vael-ui/vapor` exports the same directives under their plain names (`vTooltip`, not
`vTooltipVapor`), so both registration styles above work the same way — just import from
`vael-ui/vapor` instead:

```ts
import { createVaporApp } from 'vue'
import { vTooltip, vScrollMask } from 'vael-ui/vapor'

const app = createVaporApp(App)
app.directive('tooltip', vTooltip)
app.directive('scroll-mask', vScrollMask)
```

Global registration genuinely works here — Vapor's compiler falls back to the same runtime
directive resolution VDOM uses whenever a directive isn't a local `<script setup>` import.

Bind a string for plain content, or an options object (`side`, `align`, `openDelay`,
`closeDelay`). Modifiers (`.top`/`.bottom`/`.left`/`.right`) set the side shorthand. Bind
`null`/`undefined` to remove the tooltip conditionally.

**`v-scroll-mask`** fades an element's top/bottom edge as it scrolls, no other setup required:

```vue
<div v-scroll-mask class="my-scrollable-list">…</div>
```

On by default; `v-scroll-mask="false"` disables it. Both directives have Vapor equivalents
(`vTooltipVapor`, `vScrollMaskVapor`) that `vael-ui/vapor` components use automatically — you
only reach for the named export yourself if you're writing your own Vapor SFCs.

## Structure

```
packages/
  ui/               the library (builds with tsdown, types via vue-tsc)
                    publishes "vael-ui" + "vael-ui/vapor" from the same dist/
                    — the only place any component is hand-authored
  vapor-ui/         Vapor build/test tooling: compiles the generated tree
                    into packages/ui/dist/vapor, plus Vapor browser tests
  scripts/          generate-vapor.mjs — copies each listed ui/src/components/
                    file into vapor-ui/src/generated, marks it `vapor`, and
                    rewrites its imports to the published vael-ui package

playground/
  vdom/             every primitive in CSS / motion-v / imperative flavors
  vapor-interop/    Vue 3.6-beta app mixing VDOM + Vapor components
  vapor/            standalone Vapor build showcase (vael-ui/vapor only)
```

## Scripts

Run from the repo root with `pnpm`:

| Script                    | What it does                                                                 |
| ------------------------- | ---------------------------------------------------------------------------- |
| `pnpm build`              | Builds the library (`packages/ui/dist`) and the Vapor variant (`dist/vapor`) |
| `pnpm typecheck`          | Builds, then `vue-tsc` over every workspace package                          |
| `pnpm test`               | Browser tests for the library (vitest + Playwright, real Chromium)           |
| `pnpm test:vapor`         | Vapor build's own browser tests                                              |
| `pnpm test:vapor-interop` | VDOM + Vapor interop verification                                            |
| `pnpm play`               | `playground/vdom` dev server                                                 |
| `pnpm play:vapor`         | `playground/vapor` dev server                                                |
| `pnpm play:vapor-interop` | `playground/vapor-interop` dev server                                        |
| `pnpm lint`               | `oxlint` + `eslint`                                                          |
| `pnpm format`             | `oxfmt` write                                                                |
| `pnpm changeset`          | Describe a pending change for the next release                               |
| `pnpm release`            | Build + publish (used by CI, not normally run by hand)                       |

The library depends on `vael-ui`'s **built** `dist/`, not `src/` — `pnpm play` alone silently
serves a stale build the moment you edit library source. Run `pnpm --filter vael-ui dev`
(`tsdown --watch`) alongside it, or `pnpm --filter vael-ui build` after each change.

## Contributing

1. `pnpm install`
2. Make your change, add tests where it makes sense
3. `pnpm typecheck && pnpm test` before opening a PR
4. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
   `fix:`, `chore:`, …) — enforced by a commit-msg hook
5. If your change affects the published `vael-ui` package, run `pnpm changeset` and describe
   it — this drives the version bump and changelog on release

Releases are automated: merging to `main` opens or updates a "Version Packages" PR from any
pending changesets; merging that PR publishes to npm.
