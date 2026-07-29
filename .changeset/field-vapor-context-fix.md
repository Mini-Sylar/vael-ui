---
'vael-ui': patch
---

Fix `Field`'s context (`disabled`, `required`, `invalid`, label `for` wiring, focus/filled tracking) not reaching wrapped controls under Vapor. `fieldKey` was defined as a fresh `Symbol()` inside `Field.vue` itself, so the Vapor build's copy of that file created a second, different Symbol instance than the one `useFieldControl` (shared, not duplicated) always injected with — the two never matched, so every control wrapped in `<Field>` silently ignored the wrapper's state under Vapor. `fieldKey` now lives in its own module that the Vapor build correctly imports instead of redefining.
