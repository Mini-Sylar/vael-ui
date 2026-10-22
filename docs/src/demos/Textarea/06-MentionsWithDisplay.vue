<template>
  <section class="demo">
    <h3>Mentions with #display</h3>
    <p class="note">
      <code>#display</code> draws the text over the textarea, wrapped and scrolled exactly like it,
      so finished <code>@mentions</code> can be highlighted and the one you're typing is a real
      element a Popover can anchor to. Type <code>@</code>, pick someone with the arrow keys and
      Enter, then hover a mention: it opts into <code>pointer-events: auto</code> to take a tooltip.
      The textarea underneath still owns the caret, selection and screen reader text.
    </p>
    <Textarea
      ref="field"
      v-model="text"
      :rows="3"
      class="composer"
      placeholder="Write a note, @ to mention someone"
      aria-label="Note"
      aria-autocomplete="list"
      :aria-controls="listId"
      :aria-activedescendant="suggestions.length ? optionId(suggestions[active]!) : undefined"
      @keydown="onKeydown"
      @keyup="syncCaret"
      @click="syncCaret"
      @input="syncCaret"
    >
      <template #display="{ value, placeholder }">
        <span v-if="!value" class="ghost">{{ placeholder }}</span>
        <template v-for="(part, i) in segments(value)" :key="i">
          <span v-if="part.kind === 'mention'" v-tooltip="part.person!.role" class="mention">{{
            part.text
          }}</span>
          <span v-else-if="part.kind === 'draft'" :ref="setDraft" class="draft">{{
            part.text
          }}</span>
          <template v-else>{{ part.text }}</template>
        </template>
      </template>
    </Textarea>
    <Popover
      :open="suggestions.length > 0"
      :trigger-el="draftEl"
      :open-on-trigger-click="false"
      side="bottom"
      align="start"
      @update:open="(open: boolean) => !open && (draft = null)"
    >
      <ul :id="listId" class="people" role="listbox" aria-label="People">
        <li
          v-for="(person, i) in suggestions"
          :id="optionId(person)"
          :key="person.handle"
          role="option"
          :aria-selected="i === active"
          :data-active="i === active || undefined"
          @pointermove="active = i"
          @mousedown.prevent="pick(person)"
        >
          <strong>{{ person.name }}</strong> <span>{{ person.role }}</span>
        </li>
      </ul>
    </Popover>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, shallowRef, useId, useTemplateRef } from 'vue'
import { Popover, Textarea, vTooltip } from 'vael-ui'

interface Person {
  handle: string
  name: string
  role: string
}
const people: Person[] = [
  { handle: 'ada', name: 'Ada Lovelace', role: 'Analyst' },
  { handle: 'alan', name: 'Alan Turing', role: 'Research' },
  { handle: 'grace', name: 'Grace Hopper', role: 'Engineering' },
  { handle: 'katherine', name: 'Katherine Johnson', role: 'Navigation' },
  { handle: 'margaret', name: 'Margaret Hamilton', role: 'Flight software' },
]
const byHandle = new Map(people.map((person) => [person.handle, person]))

const text = shallowRef('Thanks @grace, can @alan review the draft?')
const field = useTemplateRef('field')
const caret = shallowRef(0)
const active = shallowRef(0)
const draftEl = shallowRef<HTMLElement | null>(null)
const setDraft = (el: unknown) => (draftEl.value = el as HTMLElement | null)

// The @word the caret is in, if any.
const draft = shallowRef<{ start: number; query: string } | null>(null)
function syncCaret() {
  const el = field.value?.textareaEl
  if (!el) return
  caret.value = el.selectionStart
  const match = /@(\w*)$/.exec(text.value.slice(0, caret.value))
  const next = match ? { start: match.index, query: match[1]!.toLowerCase() } : null
  // Keyup after an arrow lands here too: keep the highlight unless the query changed.
  if (next?.start !== draft.value?.start || next?.query !== draft.value?.query) active.value = 0
  draft.value = next
}
const listId = useId()
const optionId = (person: Person) => `${listId}-${person.handle}`
const suggestions = computed(() =>
  draft.value ? people.filter((person) => person.handle.startsWith(draft.value!.query)) : [],
)

// Screen readers hear how many people match while the list is open.
const announcement = computed(() =>
  suggestions.value.length
    ? `${suggestions.value.length} ${suggestions.value.length === 1 ? 'person' : 'people'} found, use the arrow keys to choose`
    : '',
)

interface Segment {
  text: string
  kind: 'plain' | 'mention' | 'draft'
  person?: Person
}
function segments(value: string): Segment[] {
  const out: Segment[] = []
  const draftRange = draft.value ? [draft.value.start, caret.value] : null
  let at = 0
  const push = (end: number) => end > at && out.push({ text: value.slice(at, end), kind: 'plain' })
  for (const match of value.matchAll(/@(\w+)/g)) {
    const start = match.index!
    if (draftRange && start === draftRange[0]) continue
    const person = byHandle.get(match[1]!.toLowerCase())
    if (!person) continue
    push(start)
    out.push({ text: match[0], kind: 'mention', person })
    at = start + match[0].length
  }
  if (draftRange && draftRange[0] >= at) {
    push(draftRange[0])
    out.push({ text: value.slice(draftRange[0], draftRange[1]), kind: 'draft' })
    at = draftRange[1]
  }
  push(value.length)
  return out
}

function onKeydown(event: KeyboardEvent) {
  if (!suggestions.value.length) return
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    active.value = (active.value + step + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' || event.key === 'Tab') {
    event.preventDefault()
    pick(suggestions.value[active.value]!)
  } else if (event.key === 'Escape') {
    draft.value = null
  }
}
async function pick(person: Person) {
  const el = field.value?.textareaEl
  if (!draft.value || !el) return
  const insert = `@${person.handle} `
  text.value = text.value.slice(0, draft.value.start) + insert + text.value.slice(caret.value)
  const at = draft.value.start + insert.length
  draft.value = null
  await nextTick()
  el.focus()
  el.setSelectionRange(at, at)
  syncCaret()
}
</script>

<style scoped>
.composer {
  max-inline-size: 30rem;
}
.ghost {
  color: var(--ui-text-muted);
}
.mention {
  border-radius: 4px;
  background: color-mix(in oklab, var(--ui-info) 14%, transparent);
  color: var(--ui-info-text, var(--ui-info));
  pointer-events: auto;
}
.draft {
  color: var(--ui-info-text, var(--ui-info));
}
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.people {
  display: grid;
  min-inline-size: 14rem;
  margin: 0;
  padding: 0.25rem;
  list-style: none;
}
.people li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.375rem 0.5rem;
  border-radius: calc(var(--ui-radius) - 4px);
  font-size: 0.875rem;
  cursor: pointer;
}
.people li span {
  color: var(--ui-text-muted);
}
.people li[data-active] {
  background: var(--ui-muted);
}
</style>
