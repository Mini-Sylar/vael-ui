<template>
  <section class="demo">
    <h3>Extreme: tasks check off with a pen stroke</h3>
    <p class="note">
      Checkbox's <code>states.checked</code> motion pops the box, turns the tick in and wipes it
      across like a pen stroke; <code>states.unchecked</code> gives the box a small squish.
      <code>v-animate</code> strikes the task through, throws a few sparks, and pulls the strike
      back off its far end with an <code>exit</code>. "All done" checks everything in a quick
      cascade: each value's <code>delay</code> grows down the list.
    </p>
    <div class="tasks">
      <div class="task task--all">
        <Checkbox
          :model-value="allDone"
          :indeterminate="someDone"
          :motion="tick(ALL)"
          @update:model-value="toggleAll"
        >
          <span class="task-text">All done</span>
        </Checkbox>
        <span v-if="allDone" class="task-burst" aria-hidden="true">
          <span
            v-for="spark in sparks(22)"
            :key="spark.n"
            v-animate="burst(ALL)"
            class="task-spark"
            :style="spark.style"
          />
        </span>
      </div>
      <div v-for="task in tasks" :key="task.id" class="task">
        <Checkbox v-model="done" :value="task.id" :motion="tick(task.id)">
          <span class="task-text" :data-done="done.includes(task.id) || undefined">
            {{ task.label }}
            <span
              v-if="done.includes(task.id)"
              v-animate="strike(task.id)"
              class="task-strike"
              aria-hidden="true"
            />
          </span>
        </Checkbox>
        <span v-if="done.includes(task.id)" class="task-burst" aria-hidden="true">
          <span
            v-for="spark in sparks(14)"
            :key="spark.n"
            v-animate="burst(task.id)"
            class="task-spark"
            :style="spark.style"
          />
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue'
import { Checkbox, vAnimate } from 'vael-ui'
import type { CheckboxMotion } from 'vael-ui'

const tasks = [
  { id: 'brief', label: 'Read the brief' },
  { id: 'draft', label: 'Draft the release notes' },
  { id: 'review', label: 'Ask for a review' },
  { id: 'ship', label: 'Ship it' },
]
const ALL = 'all'
const done = shallowRef<string[]>(['brief'])
const allDone = computed(() => done.value.length === tasks.length)
const someDone = computed(() => done.value.length > 0 && !allDone.value)
function toggleAll(checked: boolean | unknown[]) {
  done.value = checked === true ? tasks.map((task) => task.id) : []
}

// When each box starts, in seconds: a select-all cascades down the list, a single click starts at
// once, and "All done" follows the last one. Set before the boxes update, so their motion reads it.
const wait = shallowRef<Record<string, number>>({})
// "All done" fills from empty only when nothing was done; it squishes only when it was all done.
const allFrom = shallowRef({ empty: false, full: false })
watch(done, (next, prev) => {
  const added = next.filter((id) => !prev.includes(id))
  const cascade = added.length > 1
  wait.value = Object.fromEntries([
    ...added.map((id, i) => [id, cascade ? i * 0.06 : 0]),
    [ALL, cascade ? added.length * 0.06 : 0.12],
  ])
  allFrom.value = { empty: prev.length === 0, full: prev.length === tasks.length }
})

// The page shows what's done as it is; only changes after that animate.
const ready = shallowRef(false)
onMounted(() => (ready.value = true))

// GSAP's curves as CSS easings, sampled from its formulas: elastic.out(1, period) and back.out(3).
const curve = (ease: (u: number) => number) =>
  `linear(${Array.from({ length: 61 }, (_, i) => +ease(i / 60).toFixed(4)).join(', ')})`
const elasticOut = (period: number) =>
  curve((u) =>
    u === 1 ? 1 : 2 ** (-10 * u) * Math.sin(((u - period / 4) * 2 * Math.PI) / period) + 1,
  )
const BACK_OUT = curve((u) => (u - 1) ** 2 * (4 * (u - 1) + 3) + 1)
// GSAP's power2 is a cubic, power3 a quartic.
const POWER2_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
const POWER3_OUT = 'cubic-bezier(0.165, 0.84, 0.44, 1)'
const QUAD_OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

// Each value starts `at` seconds in, after this box's wait, and holds its first value until then.
const tick = (id: string): CheckboxMotion => {
  const at = (s: number) => s + (wait.value[id] ?? 0)
  const fills = id !== ALL || allFrom.value.empty
  const turn = { duration: 450, easing: BACK_OUT, delay: at(0.06) }
  return {
    states: {
      checked: {
        control: {
          // Held at 0.78 while it waits, then straight to 1.14 and an elastic settle.
          scale: {
            value: [0.78, 1.14, 1],
            times: [0, 1 / 600, 1],
            duration: 600,
            easing: elasticOut(0.45),
            delay: at(0),
          },
          // The fill waits its turn too.
          ...(fills && {
            backgroundColor: {
              value: ['var(--ui-surface)', 'var(--ui-primary)'],
              duration: 160,
              easing: POWER2_OUT,
              delay: at(0),
            },
            borderColor: {
              value: ['var(--ui-border-strong)', 'var(--ui-primary)'],
              duration: 160,
              easing: POWER2_OUT,
              delay: at(0),
            },
          }),
        },
        indicator: {
          opacity: { value: [0, 1], duration: 160, easing: 'ease', delay: at(0.06) },
          scale: { value: [0.6, 1], ...turn },
          rotate: { value: [-12, 0], ...turn },
          // Wiped left to right across the tick's own width: drawn, the way a pen goes.
          clipPath: {
            value: ['inset(0 84% 0 0)', 'inset(0 15% 0 0)'],
            duration: 180,
            easing: QUAD_OUT,
            delay: at(0.08),
          },
        },
      },
      unchecked: {
        control:
          id !== ALL || allFrom.value.full
            ? { scale: { value: [0.9, 1], duration: 350, easing: elasticOut(0.5) } }
            : {},
      },
    },
  }
}

// Draws in from the left; leaves into its far end, as GSAP's origin-right retract does.
const leave = { duration: 220, easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)' }
const strike = (id: string) => ({
  ...(ready.value && { initial: { scale: '0 1' } }),
  exit: {
    transformOrigin: { value: 'right', duration: 0 },
    scale: { value: '0 1', ...leave },
  },
  duration: 360,
  easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  delay: 0.14 + (wait.value[id] ?? 0),
})

// Sparks rest at their outer ring, invisible; they fly out from the box and fade.
const sparks = (reach: number) =>
  Array.from({ length: 6 }, (_, n) => {
    const angle = (n / 6) * Math.PI * 2 - Math.PI / 2
    const dx = `${(Math.cos(angle) * reach).toFixed(1)}px`
    const dy = `${(Math.sin(angle) * reach).toFixed(1)}px`
    return { n, style: { '--dx': dx, '--dy': dy } }
  })
const burst = (id: string) => ({
  ...(ready.value && { initial: { x: 0, y: 0, opacity: 1, scale: 1 } }),
  duration: 450,
  easing: POWER3_OUT,
  delay: 0.1 + (wait.value[id] ?? 0),
})
</script>

<style scoped>
.tasks {
  display: grid;
  gap: 0.625rem;
  inline-size: fit-content;
  min-inline-size: 14rem;
}

.task {
  position: relative;
  inline-size: fit-content;
}

.task--all {
  inline-size: auto;
  padding-block-end: 0.625rem;
  margin-block-end: 0.125rem;
  border-block-end: 1px solid var(--ui-border);
  font-weight: 500;
}

.task-text {
  position: relative;
  transition: color 200ms ease;
}
.task-text[data-done] {
  color: var(--ui-text-muted);
}

.task-strike {
  position: absolute;
  inset-inline: -0.125rem;
  inset-block-start: 55%;
  block-size: 1.5px;
  border-radius: 1px;
  background: currentColor;
  transform-origin: left;
  pointer-events: none;
}

/* Centred on the box (1.125rem wide), on the first line. */
.task-burst {
  position: absolute;
  inset-block-start: calc(1.125rem / 2);
  inset-inline-start: calc(1.125rem / 2);
  pointer-events: none;
}

.task-spark {
  position: absolute;
  inset-block-start: -2px;
  inset-inline-start: -2px;
  inline-size: 4px;
  block-size: 4px;
  border-radius: 999px;
  background: var(--ui-primary);
  opacity: 0;
  translate: var(--dx) var(--dy);
  scale: 0.2;
}
</style>
