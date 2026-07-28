---
'vael-ui': patch
---

- **Button text centering**: Added `line-height: 1` to `.ui-button` for proper optical centering of text content
- **Removed tap highlight**: Added `-webkit-tap-highlight-color: transparent` globally to remove the blue tap flash on mobile devices
- **Standardized press scale**: Changed button, menu item, and datatable sort button `:active` scale from 0.97 to 0.96 per design standards
- **Accessibility**: Added `@media (prefers-reduced-motion: reduce)` support to disable press scale feedback for motion-sensitive users
- **Docs**: Added font size slider to theme toolbar (12-18px range) with localStorage persistence
