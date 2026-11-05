---
'vael-ui': patch
---

## Fixes

- **Toaster:** the close button's icon is centred in its button in an app that doesn't reset button padding or SVG widths. Before, the browser's default button padding left 9px for a 16px icon, so the icon sat off to the right and overflowed the button. The icon is now 0.625rem (about 9px at the default font size), so it scales with the toast, and the button zeroes its own padding.
