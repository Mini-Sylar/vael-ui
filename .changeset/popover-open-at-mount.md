---
'vael-ui': patch
---

## Fixes

- **Popover / Menu / Select and other anchored panels:** a panel that mounts with `open` already `true` (for example one rendered lazily next to its trigger) now positions itself. It used to stay hidden at the top-left corner because nothing changed after mount to start positioning.
