<template>
  <section class="demo">
    <h3>Extreme: tasks check off with a pen stroke</h3>
    <p class="note">
      Checkbox already draws its check like a pen stroke. Its <code>states.checked</code> motion
      adds a springy pop to the box and the tick, and <code>v-animate</code> strikes the task
      through and throws a few sparks, each leaving the way it came when you uncheck. "All done"
      checks everything in a quick cascade by giving each box a growing <code>delay</code>.
    </p>
    <div class="tasks">
      <div class="task task--all">
        <div class="task-main">
          <Checkbox
            :model-value="allDone"
            :indeterminate="someDone"
            :motion="pop(tasks.length)"
            @update:model-value="toggleAll"
          >
            <span class="task-text">All done</span>
          </Checkbox>
          <span v-if="allDone" class="task-burst" aria-hidden="true">
            <span
              v-for="spark in sparks(22)"
              :key="spark.n"
              v-animate="burst"
              class="task-spark"
              :style="spark.style"
            />
          </span>
        </div>
      </div>
      <div v-for="(task, i) in tasks" :key="task.id" class="task">
        <div class="task-main">
          <Checkbox v-model="done" :value="task.id" :motion="pop(i)">
            <span class="task-text" :data-done="done.includes(task.id) || undefined">
              {{ task.label }}
              <span
                v-if="done.includes(task.id)"
                v-animate="strike(i)"
                class="task-strike"
                aria-hidden="true"
              />
            </span>
          </Checkbox>
          <span v-if="done.includes(task.id)" class="task-burst" aria-hidden="true">
            <span
              v-for="spark in sparks(14)"
              :key="spark.n"
              v-animate="burst"
              class="task-spark"
              :style="spark.style"
            />
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Checkbox, vAnimate } from 'vael-ui'
import type { CheckboxMotion } from 'vael-ui'

const tasks = [
  { id: 'brief', label: 'Read the brief' },
  { id: 'draft', label: 'Draft the release notes' },
  { id: 'review', label: 'Ask for a review' },
  { id: 'ship', label: 'Ship it' },
]
const done = shallowRef<string[]>([])
const allDone = computed(() => done.value.length === tasks.length)
const someDone = computed(() => done.value.length > 0 && !allDone.value)

// A select-all cascades down the list; a single click starts at once.
const cascade = shallowRef(false)
function toggleAll(checked: boolean | unknown[]) {
  cascade.value = true
  done.value = checked === true ? tasks.map((task) => task.id) : []
  setTimeout(() => (cascade.value = false), 600)
}
const delayOf = (i: number) => (cascade.value ? i * 0.06 : 0)

// The box pops and the tick turns in with a bounce; unchecking just fades, as built in.
const pop = (i: number): CheckboxMotion => ({
  states: {
    checked: {
      control: { scale: { value: [0.8, 1], spring: { damping: 0.4, response: 0.45 } } },
      indicator: {
        rotate: { value: ['-12deg', '0deg'], spring: { damping: 0.5, response: 0.4 } },
        scale: { value: [0.6, 1], spring: { damping: 0.5, response: 0.4 } },
      },
    },
  },
  ...(cascade.value ? { delay: delayOf(i) } : {}),
})

const strike = (i: number) => ({ initial: { scale: '0 1' }, delay: 0.12 + delayOf(i) })

// Sparks rest at their outer ring, invisible; they fly out from the box and fade.
const sparks = (reach: number) =>
  Array.from({ length: 6 }, (_, n) => {
    const angle = (n / 6) * Math.PI * 2 - Math.PI / 2
    const dx = `${(Math.cos(angle) * reach).toFixed(1)}px`
    const dy = `${(Math.sin(angle) * reach).toFixed(1)}px`
    return { n, style: { '--dx': dx, '--dy': dy } }
  })
const burst = { initial: { x: 0, y: 0, opacity: 1, scale: 1 }, delay: 0.1 }
</script>

<style scoped>
.tasks {
  display: grid;
  gap: 0.625rem;
  inline-size: fit-content;
  min-inline-size: 14rem;
}

.task {
  inline-size: fit-content;
}

.task--all {
  inline-size: auto;
  padding-block-end: 0.625rem;
  margin-block-end: 0.125rem;
  border-block-end: 1px solid var(--ui-border);
  font-weight: 500;
}

.task-main {
  position: relative;
  inline-size: fit-content;
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

/* Centred on the box (1.125rem wide). */
.task-burst {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 0.5625rem;
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
