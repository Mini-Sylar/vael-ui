---
'vael-ui': patch
---

Fixes an external `class` passed to a component (e.g. `<Message class="my-class">`) silently replacing the component's own internal styling classes instead of merging with them, under `vael-ui/vapor`. 36 components (Accordion, Card, Checkbox, DataTable, Tag, Toolbar, and others) now explicitly merge fallthrough attrs instead of relying on Vapor's implicit fallthrough, which doesn't reliably merge `class` on a component that already binds its own.

Components whose root wraps content in `<Transition>` (Dialog, Popover, Message, Tooltip, and others) are not covered by this fix — that's a separate, upstream Vue 3.6 Vapor limitation in how `<Transition>` itself handles fallthrough attrs, tracked separately.

Also bumps the `vue` dependency to `3.6.0-rc.3`, which fixes `AnimatePresence`/`<Transition>` deferring exit removal through a `<Teleport>` nested inside a component (e.g. a force-mounted `Dialog`) — the imperative `beforeClose` fallback is no longer required for that case, though it remains supported.
