// Dev-only warnings, named and actionable. Bundlers replace `process.env.NODE_ENV`, so production drops them.
declare const process: { env: { NODE_ENV?: string } }

function isDev(): boolean {
  try {
    return process.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
}

const said = new Set<string>()

/** Warns once per message, in development only. */
export function motionWarn(message: string): void {
  if (!isDev() || said.has(message)) return
  said.add(message)
  // eslint-disable-next-line no-console -- dev-only motion warnings, stripped in production
  console.warn(`[vael-ui motion] ${message}`)
}

/** Whether this is a development build, read once: production skips dev-only work entirely. */
export const inDev = isDev()

/** Dev only: inspection (devtools.ts), in its own chunk that production never fetches. */
export let dev: typeof import('./devtools') | undefined
if (inDev)
  void import('./devtools').then(
    (tools) => (dev = tools),
    () => {},
  )
