<template>
  <section class="demo">
    <h3>Creating into a group, without a dialog</h3>
    <p class="note">
      Type a tag that doesn't exist and pick <strong>Create</strong>. Instead of a dialog, the same
      panel asks which group it belongs in, with the likeliest one first. Arrow keys and Enter pick
      a group; Escape or Back returns to the list with your text intact. Cancelling
      <code>@create</code> keeps the panel open, so the whole flow stays where you're typing.
    </p>
    <div class="row">
      <Field label="Tag">
        <!-- In the group step Escape doesn't close the panel; it steps back to the list. -->
        <div class="create-flow" @keydown="onKeydown">
          <Combobox
            v-model:open="open"
            v-model:query="query"
            :model-value="tag"
            :items="step === 'list' ? tagGroups : groupChoices"
            :filter="step === 'list'"
            :allow-custom="step === 'list'"
            :close-on-esc="step === 'list'"
            :max-panel-height="420"
            placeholder="Find or create a tag"
            :ui="{
              panel: {
                class: `create-step create-step--${step}${stepBack ? ' create-step--back' : ''}`,
                style: { minInlineSize: '17rem' },
              },
            }"
            @update:model-value="onPick"
            @create="askForGroup"
          >
            <template v-if="step === 'group'" #header>
              <div class="step-header">
                <button type="button" class="step-back" @mousedown.prevent @click="backToList">
                  <PhCaretLeft weight="bold" aria-hidden="true" /> Back
                </button>
                <span class="step-title" :title="`Add “${pending}” to…`"
                  >Add “{{ pending }}” to…</span
                >
              </div>
            </template>
            <template #item="{ item, selected }">
              <template v-if="step === 'group'">
                <span class="dot" :style="{ background: item.color }" aria-hidden="true" />
                <span class="ui-select-option-label">{{ item.label }}</span>
                <span v-if="item.suggested" class="suggested">Suggested</span>
              </template>
              <template v-else>
                <span class="ui-select-option-label">{{ item.label }}</span>
                <span v-if="selected" class="ui-select-option-check" aria-hidden="true">✓</span>
              </template>
            </template>
          </Combobox>
        </div>
      </Field>
      <output class="panel-text">{{ summary }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, shallowRef, watch } from 'vue'
import { Combobox, Field } from 'vael-ui'
import { PhCaretLeft } from '@phosphor-icons/vue'

// One option type for both steps: tags, and the group choices that carry a colour and a hint.
interface Tag {
  label: string
  value: string
  color?: string
  suggested?: boolean
}
interface TagGroup {
  label: string
  key: string
  color: string
  items: Tag[]
}

const tagGroups = reactive<TagGroup[]>([
  {
    label: 'Design',
    key: 'design',
    color: 'oklch(0.6 0.2 330)',
    items: [
      { label: 'Illustration', value: 'illustration' },
      { label: 'Typography', value: 'typography' },
      { label: 'Motion', value: 'motion' },
    ],
  },
  {
    label: 'Engineering',
    key: 'engineering',
    color: 'oklch(0.58 0.17 255)',
    items: [
      { label: 'Frontend', value: 'frontend' },
      { label: 'Backend', value: 'backend' },
      { label: 'Infrastructure', value: 'infrastructure' },
    ],
  },
  {
    label: 'Marketing',
    key: 'marketing',
    color: 'oklch(0.66 0.15 60)',
    items: [
      { label: 'Launch', value: 'launch' },
      { label: 'Social', value: 'social' },
      { label: 'Newsletter', value: 'newsletter' },
    ],
  },
])

const tag = shallowRef<string | null>('frontend')
const open = shallowRef(false)
const query = shallowRef('')
const step = shallowRef<'list' | 'group'>('list')
const stepBack = shallowRef(false)
const pending = shallowRef('')

const groupOf = (value: string | null) =>
  tagGroups.find((group) => group.items.some((item) => item.value === value))

// The group of the tag already picked is the likeliest home for a new one, so it goes first.
const groupChoices = computed<Tag[]>(() => {
  const likely = groupOf(tag.value)
  const ordered = likely ? [likely, ...tagGroups.filter((g) => g !== likely)] : tagGroups
  return ordered.map((group) => ({
    label: group.label,
    value: `group:${group.key}`,
    color: group.color,
    suggested: group === likely,
  }))
})

function askForGroup(text: string, details: { cancel: () => void }) {
  details.cancel()
  pending.value = text
  stepBack.value = false
  step.value = 'group'
}

let clearBack: ReturnType<typeof setTimeout> | undefined
function backToList() {
  stepBack.value = true
  step.value = 'list'
  query.value = pending.value
  // Only the step change slides; rows that appear later while you type shouldn't.
  clearTimeout(clearBack)
  clearBack = setTimeout(() => (stepBack.value = false), 250)
}

function onPick(value: string | number | (string | number)[] | null) {
  if (step.value === 'group' && typeof value === 'string' && value.startsWith('group:')) {
    const group = tagGroups.find((g) => `group:${g.key}` === value)!
    const created = { label: pending.value, value: pending.value.toLowerCase() }
    group.items.push(created)
    tag.value = created.value
    step.value = 'list'
    // Combobox writes the picked row's label ("Engineering") into the input right after this.
    nextTick(() => (query.value = created.label))
    return
  }
  tag.value = value as string | null
}

function onKeydown(event: KeyboardEvent) {
  if (step.value !== 'group' || event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  backToList()
}

// Closing the panel any other way ends the flow too.
watch(open, (isOpen) => {
  if (!isOpen) step.value = 'list'
})
// Typing again means you're changing the text, so it's back to the list.
watch(query, (text) => {
  if (step.value === 'group' && text !== pending.value) {
    pending.value = ''
    step.value = 'list'
  }
})

const summary = computed(() => {
  const group = groupOf(tag.value)
  const item = group?.items.find((i) => i.value === tag.value)
  return item ? `${item.label} · ${group!.label}` : '(none)'
})
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.step-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ui-text);
}
.step-title {
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.step-back {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  border: none;
  border-radius: calc(var(--ui-radius) - 4px);
  background: none;
  color: var(--ui-text-muted);
  font: inherit;
  cursor: pointer;
  flex: none;
}
.step-back:hover {
  background: var(--ui-muted);
  color: var(--ui-text);
}
.dot {
  flex: none;
  inline-size: 0.5rem;
  block-size: 0.5rem;
  border-radius: 50%;
}
.suggested {
  margin-inline-start: auto;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
</style>

<!-- The panel is teleported, so its step motion is styled from here, outside the scoped styles. -->
<style>
/* Forward slides in from the right, back from the left: the direction you travelled. */
.create-step--group .ui-select-option {
  animation: create-step-in 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
.create-step--list.create-step--back .ui-select-option {
  animation: create-step-in-back 200ms cubic-bezier(0.23, 1, 0.32, 1);
}
@keyframes create-step-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
}
@keyframes create-step-in-back {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .create-step--group .ui-select-option,
  .create-step--list.create-step--back .ui-select-option {
    animation: none;
  }
}
</style>
