import { reactive } from 'vue'
import type { TreeNode } from 'vael-ui'

// The repo-flavored dashboard: a pull request moves from review to merged to
// shipped, and every page reads the same small store so the autoplay's merge
// shows up on the Overview's timeline and release card.

export const people = {
  KA: 'Kai Anderson',
  EB: 'Elena Bennett',
  PN: 'Priya Nair',
  MO: "Marcus O'Connor",
  MM: 'Mira Mitchell',
} as const
export type Person = keyof typeof people

export type CheckState = 'passed' | 'pending' | 'failed'

export interface PullRequest {
  id: number
  title: string
  author: Person
  labels: string[]
  checks: { name: string; detail: string; state: CheckState }[]
  state: 'open' | 'merged'
}

export interface ActivityEvent {
  id: string
  who?: Person
  verb: string
  pr?: number
  text: string
  label?: string
  when: string
}

const INITIAL_PULLS: PullRequest[] = [
  {
    id: 482,
    title: 'Tooltip travels between triggers',
    author: 'KA',
    labels: ['fix', 'Tooltip'],
    checks: [
      { name: 'Lint and format', detail: '14s', state: 'passed' },
      { name: 'Types', detail: '38s', state: 'passed' },
      { name: 'Tests, vdom and vapor', detail: '1,122', state: 'passed' },
    ],
    state: 'open',
  },
  {
    id: 485,
    title: 'Dock grow option',
    author: 'PN',
    labels: ['feat', 'Dock'],
    checks: [
      { name: 'Lint and format', detail: '12s', state: 'passed' },
      { name: 'Types', detail: '41s', state: 'passed' },
      { name: 'Tests, vdom and vapor', detail: 'running', state: 'pending' },
    ],
    state: 'open',
  },
  {
    id: 486,
    title: 'Calendar keeps its size across views',
    author: 'EB',
    labels: ['fix', 'Calendar'],
    checks: [
      { name: 'Lint and format', detail: '13s', state: 'passed' },
      { name: 'Types', detail: '36s', state: 'passed' },
      { name: 'Tests, vdom and vapor', detail: '1,118', state: 'passed' },
    ],
    state: 'open',
  },
  {
    id: 487,
    title: 'Vapor headline',
    author: 'MO',
    labels: ['docs'],
    checks: [
      { name: 'Lint and format', detail: '1 error', state: 'failed' },
      { name: 'Types', detail: '35s', state: 'passed' },
      { name: 'Tests, vdom and vapor', detail: 'skipped', state: 'pending' },
    ],
    state: 'open',
  },
  {
    id: 479,
    title: 'ConfigProvider keeps its subtree mounted',
    author: 'EB',
    labels: ['fix'],
    checks: [],
    state: 'merged',
  },
  {
    id: 476,
    title: 'Focus returns when overlays close',
    author: 'KA',
    labels: ['a11y'],
    checks: [],
    state: 'merged',
  },
]

const INITIAL_ACTIVITY: ActivityEvent[] = [
  {
    id: 'a1',
    who: 'EB',
    verb: 'approved',
    pr: 482,
    text: '“Clean. Ship it.”',
    when: '2m',
  },
  { id: 'a2', verb: 'Preview deployed', text: 'vael-ui-git-main', label: '1m 12s', when: '8m' },
  {
    id: 'a3',
    who: 'PN',
    verb: 'opened',
    pr: 485,
    text: 'Dock grow option',
    label: 'feat',
    when: '1h',
  },
  { id: 'a4', who: 'MO', verb: 'commented on', pr: 487, text: '“Lint is on me.”', when: '2h' },
]

/** Build, Test, Review, Ship: how far the release has got. */
export const RELEASE_STAGES = ['Build', 'Test', 'Review', 'Ship'] as const

export const repo = reactive({
  pulls: structuredClone(INITIAL_PULLS),
  activity: structuredClone(INITIAL_ACTIVITY),
  approvals: 1,
})

export function mergePull(id: number): void {
  const pull = repo.pulls.find((p) => p.id === id)
  if (!pull || pull.state === 'merged') return
  pull.state = 'merged'
  repo.approvals = 2
  repo.activity.unshift({
    id: `merge-${id}-${Date.now()}`,
    who: 'MM',
    verb: 'merged',
    pr: id,
    text: pull.title,
    label: pull.labels[0],
    when: 'now',
  })
}

export function resetRepo(): void {
  repo.pulls = structuredClone(INITIAL_PULLS)
  repo.activity = structuredClone(INITIAL_ACTIVITY)
  repo.approvals = 1
}

// 30 days of merged and opened pull requests: a steady climb with a little
// day-to-day wobble (a weekly lull), not noise.
const trend = (base: number, slope: number, wobble: number) =>
  Array.from(
    { length: 30 },
    (_, i) =>
      Math.round((base + i * slope + Math.sin(i / 2.2) * wobble - (i % 7 === 5 ? 1.2 : 0)) * 10) /
      10,
  )
export const throughput = {
  merged: trend(3.5, 0.24, 0.9),
  opened: trend(4.6, 0.19, 0.5),
}
const DAY = new Intl.DateTimeFormat('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
export const throughputDays = throughput.merged.map((_, i) => DAY.format(new Date(2026, 8, 1 + i)))

export interface RepoFile extends TreeNode {
  /** Git status: modified or untracked. */
  status?: 'M' | 'U'
  children?: RepoFile[]
}

export const fileTree: RepoFile[] = [
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'src/components',
        children: [
          {
            label: 'Button',
            value: 'src/components/Button',
            children: [
              { label: 'Button.vue', value: 'src/components/Button/Button.vue', status: 'M' },
              { label: 'Button.css', value: 'src/components/Button/Button.css' },
            ],
          },
          {
            label: 'Dock',
            value: 'src/components/Dock',
            children: [{ label: 'Dock.vue', value: 'src/components/Dock/Dock.vue', status: 'U' }],
          },
          {
            label: 'Tooltip',
            value: 'src/components/Tooltip',
            children: [
              { label: 'Tooltip.vue', value: 'src/components/Tooltip/Tooltip.vue', status: 'M' },
            ],
          },
        ],
      },
      {
        label: 'composables',
        value: 'src/composables',
        children: [
          { label: 'useTooltip.ts', value: 'src/composables/useTooltip.ts', status: 'M' },
          { label: 'usePopover.ts', value: 'src/composables/usePopover.ts' },
        ],
      },
      { label: 'index.ts', value: 'src/index.ts' },
    ],
  },
  {
    label: 'tests',
    value: 'tests',
    children: [{ label: 'tooltip.test.ts', value: 'tests/tooltip.test.ts', status: 'M' }],
  },
  { label: 'package.json', value: 'package.json' },
  { label: 'README.md', value: 'README.md' },
]

export const fileSources: Record<
  string,
  { author: Person; pr?: number; lines: number; code: string; lang: string }
> = {
  'src/components/Button/Button.vue': {
    author: 'KA',
    pr: 482,
    lines: 412,
    lang: 'vue',
    code: `<template>
  <button :class="rootPart.class" :disabled="disabled" v-tooltip="tooltip">
    <slot name="leading" />
    <slot />
    <slot name="trailing" />
  </button>
</template>`,
  },
  'src/components/Button/Button.css': {
    author: 'EB',
    lines: 318,
    lang: 'css',
    code: `.ui-button:active {
  transform: scale(0.96);
  transition: transform var(--ui-duration-press) var(--ui-ease-out);
}`,
  },
  'src/components/Tooltip/Tooltip.vue': {
    author: 'KA',
    pr: 482,
    lines: 240,
    lang: 'vue',
    code: `<Transition name="ui-tooltip" :css="!forceMount">
  <div v-if="open" ref="positioner" :data-traveling="traveling || undefined">
    <slot />
  </div>
</Transition>`,
  },
  'src/composables/useTooltip.ts': {
    author: 'KA',
    pr: 482,
    lines: 530,
    lang: 'ts',
    code: `// Grow to fit a larger label at once; only shrinking animates.
width: \`\${Math.max(from.width, targetWidth)}px\`,`,
  },
  'src/index.ts': {
    author: 'MM',
    lines: 402,
    lang: 'ts',
    code: `export { default as Button } from './components/Button/Button.vue'
export { default as Tooltip } from './components/Tooltip/Tooltip.vue'`,
  },
  'src/components/Dock/Dock.vue': {
    author: 'PN',
    pr: 485,
    lines: 236,
    lang: 'vue',
    code: `<nav class="ui-dock" :class="{ 'ui-dock--grow': grow }">
  <button v-for="item in items" :key="item.label" class="ui-dock-item">
    <component :is="item.icon" />
  </button>
</nav>`,
  },
  'src/composables/usePopover.ts': {
    author: 'EB',
    lines: 262,
    lang: 'ts',
    code: `// Focus goes back to whatever had it before opening.
function restoreFocus() {
  const target = returnFocusTo ?? triggerEl.value
  target?.focus({ preventScroll: true })
}`,
  },
  'tests/tooltip.test.ts': {
    author: 'KA',
    pr: 482,
    lines: 96,
    lang: 'ts',
    code: `test('grows to fit a longer label at once', async () => {
  await hover('Terminal')
  expect(panel.scrollWidth).toBe(panel.clientWidth)
})`,
  },
  'README.md': {
    author: 'MM',
    lines: 140,
    lang: 'md',
    code: `# vael-ui

Components that compile straight to Vapor, not around it.`,
  },
  'package.json': {
    author: 'MM',
    lines: 88,
    lang: 'json',
    code: `{
  "name": "vael-ui",
  "version": "0.4.0"
}`,
  },
}
