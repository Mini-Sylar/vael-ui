// vael-ui's easing and duration tokens by name (`out`, `pop`, `enter`), as their CSS variables.
// Anything else is CSS already and passes through.

// Bare names that are CSS already, not tokens.
const KEYWORD = /^(ease(-in|-out|-in-out)?|linear|step-(start|end)|initial|inherit|unset)$/
const TOKEN = /^[a-z]+(-[a-z]+)*$/

// A name you write means the theme's: a component given its own timing retimes its tokens for
// its transitions, and keeps the theme's beside them (--ui-theme-*) for what's inside it.
const named = (kind: string, name: string) =>
  `var(--ui-theme-${kind}-${name}, var(--ui-${kind}-${name}))`

/** An easing token by name (`out`) as its `var()`; any other easing as it is. */
export const cssEasing = (value: string): string =>
  TOKEN.test(value.trim()) && !KEYWORD.test(value.trim()) ? named('ease', value.trim()) : value

/** A duration token by name (`enter`) as its `var()`; any other string as it is. */
export const cssDuration = (value: string): string =>
  TOKEN.test(value.trim()) ? named('duration', value.trim()) : value
