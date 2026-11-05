---
'vael-ui': patch
---

## Features

- **Motion:** `animate()` takes a list of steps and plays them as one sequence: `animate([['.card', { opacity: [0, 1] }], ['.title', { y: [6, 0] }, { at: '-0.15' }]])`. Each step starts when the one before it ends. `at` moves a step: `'+0.2'` or `'-0.15'` seconds from that point, `'50%'` of the way through the previous step, a number of seconds from the start, or a named step such as `'card'` or `'card:60%'`. TypeScript suggests the names your steps declare and flags one that doesn't exist. The returned controls pause, seek, reverse and finish the whole sequence together. The types are `SequenceStep`, `SequenceStepOptions` and `SequenceAt`.
- **Motion:** `useScrollLength(container?, { axis })` gives how far a page or container can scroll, in pixels, and stays current as content and size change. Pair it with `useScrollProgress` to turn progress into pixels.
- **Motion:** `scaleZ` scales depth only, beside `scaleX` and `scaleY`; it shows under `perspective`.
- **Motion:** `stagger: 'random'` spaces the elements out in a shuffled order, a new shuffle each time the group plays.

## Fixes

- **Motion:** `pathLength: 0` hides the stroke. A round or square line cap no longer leaves a dot before a stroke draws in or after it draws out.
- **Form controls:** `@focus` and `@blur` now fire on `Checkbox`, `Switch`, `Radio`, `RadioGroup`, `Select`, `TreeSelect`, `OtpInput`, `Slider` and `SelectButton`, when focus enters or leaves the whole control. Moving between a `RadioGroup`'s radios or a range `Slider`'s thumbs is neither. Before, the listener sat on a wrapping element, which never receives a `blur`.
- **Form controls:** inside a `Field`, the Field's `id` wins over an `id` passed to the control, so its label still names the control.
- **Form controls:** a passed `aria-describedby` is merged with the Field's description and error on every control, instead of replacing them. A form library that spreads its own `id`, `aria-*` and `onBlur` on a control now works.
