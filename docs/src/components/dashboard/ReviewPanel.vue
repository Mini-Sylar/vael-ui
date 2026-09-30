<template>
  <!-- A Drawer inside the dashboard on wide screens, a BottomSheet on phones. -->
  <component
    :is="phone ? BottomSheet : Drawer"
    v-model:open="open"
    :title="title"
    v-bind="phone ? {} : { side: 'right', container: shell }"
    class="review-panel"
    data-dash-overlay
  >
    <div v-if="pull" class="review-body">
      <div class="review-meta">
        <Avatar :name="people[pull.author]" size="sm" class="review-avatar" />
        <span>
          <b>{{ people[pull.author].split(' ')[0] }}</b>
          <span class="review-muted"> wants to merge into </span>
          <code>main</code>
        </span>
      </div>
      <div class="review-labels">
        <Chip v-for="label in pull.labels" :key="label" size="sm" :label="label" />
      </div>
      <Message variant="success" title="All checks passed">
        {{ pull.checks.length }} of {{ pull.checks.length }} checks, vdom and Vapor.
      </Message>
      <ol class="review-thread">
        <li v-for="c in THREAD" :key="c.who">
          <Avatar :name="people[c.who]" size="sm" class="review-avatar" />
          <div>
            <b>{{ people[c.who].split(' ')[0] }}</b>
            <p>{{ c.text }}</p>
          </div>
        </li>
      </ol>
      <Textarea v-model="comment" placeholder="Leave a comment" :rows="2" class="review-comment" />
      <div class="review-actions">
        <Checkbox v-model="squash" label="Squash and merge" size="sm" />
        <Button size="sm" class="review-merge" @click="merge">
          <template #leading><PhGitMerge :size="14" /></template>
          Approve and merge
        </Button>
      </div>
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed, inject, shallowRef } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import {
  Avatar,
  BottomSheet,
  Button,
  Checkbox,
  Chip,
  Drawer,
  Message,
  Textarea,
  toast,
} from 'vael-ui'
import { PhGitMerge } from '@phosphor-icons/vue'
import { mergePull, people } from './repoData'
import type { PullRequest } from './repoData'
import { dashboardShellKey } from './dashboardNavigate'

const props = defineProps<{ pull: PullRequest | null }>()
const open = defineModel<boolean>('open', { default: false })

const shell = inject(dashboardShellKey, undefined)
const phone = useMediaQuery('(max-width: 640px)')
const title = computed(() => (props.pull ? `#${props.pull.id} ${props.pull.title}` : ''))

const comment = shallowRef('')
const squash = shallowRef(true)

const THREAD = [
  { who: 'EB' as const, text: 'Clean. The instant grow reads much better than the tween.' },
  { who: 'MO' as const, text: 'Checked the vertical dock too, no clipping. Ship it.' },
]

function merge() {
  const pull = props.pull
  if (!pull) return
  mergePull(pull.id)
  open.value = false
  comment.value = ''
  toast.success(`#${pull.id} merged into main.`)
}
</script>

<style scoped>
.review-body {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  font-size: 0.8125rem;
}
.review-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.review-meta b,
.review-thread b {
  font-weight: 500;
}
.review-meta code {
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
}
.review-muted {
  color: var(--ui-text-muted);
}
.review-avatar.ui-avatar {
  inline-size: 1.5rem;
  block-size: 1.5rem;
  font-size: 0.5625rem;
  flex: none;
}
.review-labels {
  display: flex;
  gap: 0.25rem;
}
.review-thread {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.review-thread li {
  display: flex;
  gap: 0.625rem;
}
.review-thread p {
  margin: 0.125rem 0 0;
  color: var(--ui-text-muted);
  line-height: 1.5;
}
.review-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}
</style>
