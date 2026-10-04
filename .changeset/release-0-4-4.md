---
'vael-ui': patch
---

## Features

- **Toaster:** New `expand` prop keeps the stack open as a list, so an error that arrives between two successes stays readable. Timers keep running, and hover or focus still pauses them.
- **Toaster:** New `pinned` toast option shows a toast in its own section beside the stack, where newer toasts can't cover it: `toast.warning('Verify your email', { pinned: true })`. Pinned toasts don't count toward `maxVisible`, and the rest of the stack still collapses.

- **Toaster:** New `id` toast option. Showing a toast with an id that's already on screen updates that toast and restarts its timer instead of adding a second one, and `toast.dismiss('verify-email')` closes it by id. `toast.promise` with an `id` updates one toast from loading to its result.

## Behavior change

- **Toaster:** `ToastEntry.id` is now `number | string` (exported as `ToastId`), since it holds your own `id` when you pass one. `toast()` still returns a `number` when you don't. If your custom card slot treats `entry.id` as a number, widen that type.

## Fixes

- **Toaster:** Toasts queued past `maxVisible` no longer time out before they show: their timers start once the toast is on screen.
- **Toaster:** Switching back to the tab no longer resumes the timers while the pointer is still over the stack.
