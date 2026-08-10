---
'vael-ui': patch
---

Fixes `vael-ui/vapor` shipping with no CSS at all — the vapor build's generator was stripping every component's CSS import under the (incorrect) assumption a consumer would already have styles loaded some other way. It now copies each component's CSS alongside its generated source and keeps the import, the same way the main build already does.

`packages/vapor-ui`'s build also moved from Vite library mode to `tsdown`, matching the main package's build exactly, so vapor gets the same real per-component CSS code-splitting — importing a single component only downloads that component's CSS, whether via `vael-ui/vapor` or the `vapor` export condition added in 0.2.1.
