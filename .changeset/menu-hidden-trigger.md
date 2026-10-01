---
'vael-ui': patch
---

## Fixes

- **Menu / Popover:** a trigger that was hidden when the menu mounted (for example inside a closed BottomSheet) no longer makes the open panel jitter. The panel anchored to the Button's hidden loading spinner instead of the Button, and repositioned on every frame as the spinner rotated. It now anchors to the trigger itself and stays put.
