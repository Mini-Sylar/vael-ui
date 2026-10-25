import type * as Motion from 'vael-ui/motion'

// What vael-ui/motion exports, as names only (llms.mjs runs this in Node, where its CSS can't load).
const MOTION = [
  'vAnimate',
  'vAnimateVapor',
  'animate',
  'useAnimate',
  'useMotion',
  'useScrollProgress',
  'settled',
  'springEasing',
  'useSpringValue',
  'createSpring',
  'stepSpring',
  'parseMotionStyle',
] as const satisfies readonly (keyof typeof Motion)[]
// vue-tsc fails here when vael-ui/motion gains an export the list above lacks.
const unlisted: Record<Exclude<keyof typeof Motion, (typeof MOTION)[number]>, never> = {}
void unlisted
const fromMotion = new Set<string>(MOTION)

/** The import lines for these names: `vael-ui`, and `vael-ui/motion` for motion's. */
export function importCode(names: readonly string[]): string {
  const motionNames = names.filter((name) => fromMotion.has(name))
  const rest = names.filter((name) => !fromMotion.has(name))
  return [
    rest.length ? `import { ${rest.join(', ')} } from 'vael-ui'` : '',
    motionNames.length ? `import { ${motionNames.join(', ')} } from 'vael-ui/motion'` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
