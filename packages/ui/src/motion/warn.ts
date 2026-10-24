// Dev-only warnings, named and actionable. Bundlers replace `process.env.NODE_ENV`, so production
// drops them: call sites guard with it too, so their messages don't ship either.
const said = new Set<string>()

/** Warns once per message, in development only. */
export function motionWarn(message: string): void {
  if (process.env.NODE_ENV === 'production' || said.has(message)) return
  said.add(message)
  // eslint-disable-next-line no-console -- dev-only motion warnings, stripped in production
  console.warn(`[vael-ui motion] ${message}`)
}

/** Dev only: inspection (devtools.ts), in its own chunk that production never fetches (nor ships). */
export let dev: typeof import('./devtools') | undefined
if (process.env.NODE_ENV !== 'production')
  void import('./devtools').then(
    (tools) => (dev = tools),
    () => {},
  )
