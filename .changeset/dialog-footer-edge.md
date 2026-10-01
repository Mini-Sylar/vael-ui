---
'vael-ui': patch
---

## Fixes

- **Dialog:** with a footer, the end of the body is no longer cut off. Focus rings, hover-grown controls (like a Slider thumb) and shadows at the bottom of the body were clipped because the scrolling body had no bottom padding. The body now keeps a little padding and the footer gives up the same amount, so the visible spacing is unchanged.
