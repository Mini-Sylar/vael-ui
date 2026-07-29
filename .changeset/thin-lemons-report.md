---
'vael-ui': patch
---

Fix Chip padding inconsistency, Tabs/SelectButton sliding indicator missing a re-measure after webfonts finish loading (fixes indicator sizing drift on first paint), and vertically off-center label text in Tag, Button, Badge, and Toolbar's overflow trigger (adds `text-box-trim` optical centering in supporting browsers, with the previous approximation kept as the fallback).
