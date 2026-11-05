---
'vael-ui': patch
---

## Fixes

- **Motion:** a `v-animate` entrance plays when its element is placed in the page after it was created, as a route coming in through `<Transition mode="out-in">` is in Vapor. Before, it was measured while still detached, counted as off-screen and shown without its entrance, and with `after` it could stay hidden. It now stays unseen until it is placed, then plays with the rest of its page.
