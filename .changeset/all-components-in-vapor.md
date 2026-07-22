---
'vael-ui': patch
---

`vael-ui/vapor` now ships all 57 public components (was 38) — `DialogHost`,
`BottomSheet`, `CascadeSelect`, `Combobox`, `ContextMenu`, `DatePicker`,
`FileUpload`, `InputNumber`, `MenuList`, `Message`, `Pagination`, `Radio`,
`Select`, `SplitButton`, `Toaster`, `Toolbar`, `Tree`, `TreeSelect`, and
`AccordionItem` were previously missing from the Vapor build entirely.

Two real bugs surfaced and fixed along the way:

- `useDialogQueue`/`DynamicDialogEntry` (needed by `DialogHost`) and
  `useNumberFormat` (needed by `InputNumber`) weren't exported from the
  main package, so the Vapor generator couldn't resolve them — both are
  now public.
- The Vapor generator's import-rewriting only matched single-level `../`
  relative imports, silently leaving `internal/*.vue` components' (one
  directory deeper) `../../composables/...` imports unrewritten, which
  broke the build the moment one was included (`SelectListBody.vue`, used
  by `Select`/`Combobox`).
