---
'vael-ui': patch
---

Cap large surfaces (Card, Dialog, Popover, Menu, Select panel, DataTable, FileUpload dropzone, Dock) to a new `--ui-radius-surface` token (`min(var(--ui-radius), 1rem)`) instead of the raw `--ui-radius`, so an aggressive radius preset like Pill (`999px`) no longer turns large rectangular surfaces into stadium shapes. Small controls keep using the uncapped `--ui-radius`.
