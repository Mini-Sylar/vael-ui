---
'vael-ui': patch
---

`vael-ui/vapor` now also re-exports composables and utilities, not just components. This also enables a `vapor` export condition on the package root — set it in your bundler and `tsconfig.json` to use `vael-ui` everywhere with no `/vapor` subpath needed. See the [Auto Import guide](https://vael-ui.dev/docs/guides/auto-import#one-import) for setup; see the [0.2.0 release notes](https://github.com/Mini-Sylar/vael-ui/releases/tag/vael-ui%400.2.0) for the original Vapor/resolver docs.
