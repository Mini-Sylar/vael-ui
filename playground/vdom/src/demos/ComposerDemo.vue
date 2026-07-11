<template>
  <section class="demo">
    <h2>Composer — a realistic Textarea composition</h2>
    <p class="note">
      Avatar in <code>#start</code>, attach button in <code>#bottom-start</code>, char counter +
      send in <code>#bottom-end</code>. The attach button now opens a real file picker, and
      <code>useFileDrop</code> — the same headless, attachable-to-anything drag-and-drop composable
      <code>FileUpload</code> itself is built on — is attached directly to this Textarea's exposed
      <code>el</code>: drop a file anywhere on the composer, no markup change from the original
      stub.
    </p>

    <div class="composer">
      <Textarea
        ref="composerTextarea"
        v-model="draft"
        auto-grow
        :rows="1"
        :max-rows="10"
        placeholder="What's happening?"
        :maxlength="MAX_LENGTH"
        :class="{ 'composer-textarea--drag-over': isDragOver }"
      >
        <template #start>
          <Avatar :name="composerName" size="sm" />
        </template>
        <template #bottom-start>
          <Button size="sm" variant="ghost" icon aria-label="Attach a file" @click="browseFiles">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
              <path
                d="M11 4.5L5.5 10a2 2 0 1 0 2.8 2.8L14 7"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </Button>
          <span v-if="attachments.length" class="composer-attachments">
            <span
              v-for="file in attachments"
              :key="`${file.name}:${file.size}:${file.lastModified}`"
              class="composer-attachment-chip"
            >
              {{ file.name }}
              <button
                type="button"
                class="composer-attachment-remove"
                :aria-label="`Remove ${file.name}`"
                @click="removeAttachment(file)"
              >
                ×
              </button>
            </span>
          </span>
        </template>
        <template #bottom-end>
          <span class="note composer-count" :class="{ 'composer-count--over': remaining < 0 }">
            {{ remaining }}
          </span>
          <Button size="sm" :disabled="!draft.trim() || remaining < 0" @click="post">Post</Button>
        </template>
      </Textarea>
      <input
        ref="fileInputEl"
        type="file"
        multiple
        class="sr-only-file-input"
        @change="onFileInputChange"
      />
    </div>

    <ul v-if="posts.length" class="composer-feed">
      <li v-for="post in posts" :key="post.id" class="composer-feed-item">
        <Avatar :name="composerName" size="sm" />
        <p>{{ post.text }}</p>
      </li>
    </ul>

    <h3>Twitter-style reply — collapsed until focus (motion-v)</h3>
    <p class="note">
      One quiet row at rest: avatar, placeholder, dormant Reply. Focus expands it — the inline
      button collapses away while the action strip springs open below and the text area eases
      taller. Every moving piece is consumer motion-v on SLOT CONTENT; the library contributes the
      slot geometry and auto-grow, nothing else. Blur with no text collapses it back.
    </p>
    <div ref="replyRoot" class="reply-composer">
      <Textarea
        v-model="reply"
        auto-grow
        :rows="1"
        :max-rows="8"
        placeholder="Post your reply"
        class="reply-textarea"
        :class="{ 'reply-textarea--expanded': replyExpanded }"
        @focus="replyFocused = true"
        @blur="onReplyBlur"
      >
        <template #start>
          <Avatar :name="composerName" size="sm" />
        </template>
        <template #end>
          <motion.span
            :initial="false"
            :animate="replyExpanded ? { width: 0, opacity: 0 } : { width: 'auto', opacity: 1 }"
            :transition="replySpring"
            style="overflow: hidden; display: inline-flex"
          >
            <Button size="sm" disabled tabindex="-1">Reply</Button>
          </motion.span>
        </template>
        <template #bottom-start>
          <motion.div
            :initial="false"
            :animate="replyExpanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }"
            :transition="replySpring"
            style="overflow: hidden"
          >
            <div class="reply-tools">
              <Button
                v-for="tool in replyTools"
                :key="tool.label"
                size="sm"
                variant="ghost"
                icon
                :aria-label="tool.label"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
                  <path
                    :d="tool.path"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Button>
            </div>
          </motion.div>
        </template>
        <template #bottom-end>
          <motion.div
            :initial="false"
            :animate="replyExpanded ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }"
            :transition="replySpring"
            style="overflow: hidden"
          >
            <div class="reply-actions">
              <span
                class="note composer-count"
                :class="{ 'composer-count--over': replyRemaining < 0 }"
              >
                {{ replyRemaining }}
              </span>
              <Button size="sm" :disabled="!reply.trim() || replyRemaining < 0" @click="sendReply">
                Reply
              </Button>
            </div>
          </motion.div>
        </template>
      </Textarea>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef } from 'vue'
import { motion, useReducedMotion } from 'motion-v'
import { Avatar, Button, Textarea, useFileDrop } from 'vael-ui'

const MAX_LENGTH = 280
const composerName = 'Alex Lee'

const draft = shallowRef('')
const remaining = computed(() => MAX_LENGTH - draft.value.length)

interface Post {
  id: number
  text: string
}
const posts = shallowRef<Post[]>([])
let nextId = 0

const attachments = shallowRef<File[]>([])
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}
function addAttachments(files: File[]) {
  const seen = new Set(attachments.value.map(fileKey))
  const fresh = files.filter((file) => !seen.has(fileKey(file)))
  if (fresh.length > 0) attachments.value = [...attachments.value, ...fresh]
}
function removeAttachment(file: File) {
  attachments.value = attachments.value.filter((f) => f !== file)
}

// useFileDrop attached to Textarea's exposed el; needs no dedicated dropzone
const composerTextarea = useTemplateRef<InstanceType<typeof Textarea>>('composerTextarea')
const textareaFrame = computed(() => composerTextarea.value?.el ?? null)
const { isDragOver } = useFileDrop(textareaFrame, { onFiles: addAttachments })

const fileInputEl = useTemplateRef<HTMLInputElement>('fileInputEl')
function browseFiles() {
  fileInputEl.value?.click()
}
function onFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  addAttachments(Array.from(target.files ?? []))
  target.value = ''
}

function post() {
  if (!draft.value.trim() || remaining.value < 0) return
  const text = attachments.value.length
    ? `${draft.value}\n(${attachments.value.length} attachment${attachments.value.length > 1 ? 's' : ''})`
    : draft.value
  posts.value = [{ id: nextId++, text }, ...posts.value]
  draft.value = ''
  attachments.value = []
}

const reply = shallowRef('')
const replyFocused = shallowRef(false)
const replyExpanded = computed(() => replyFocused.value || reply.value.length > 0)
const replyRemaining = computed(() => MAX_LENGTH - reply.value.length)
const replyRoot = useTemplateRef<HTMLElement>('replyRoot')

const reduce = useReducedMotion()
const replySpring = computed(() =>
  reduce.value
    ? ({ duration: 0 } as const)
    : ({ type: 'spring', duration: 0.45, bounce: 0.15 } as const),
)

// Collapsing on every blur would yank the toolbar out from under a click on
// one of its own buttons — stay expanded while focus lands anywhere inside.
function onReplyBlur(event: FocusEvent) {
  if (event.relatedTarget instanceof Node && replyRoot.value?.contains(event.relatedTarget)) return
  replyFocused.value = false
}

function sendReply() {
  if (!reply.value.trim() || replyRemaining.value < 0) return
  posts.value = [{ id: nextId++, text: reply.value }, ...posts.value]
  reply.value = ''
  replyFocused.value = false
}

const replyTools = [
  { label: 'Add media', path: 'M2.5 3.5h11v9h-11zM2.5 10l3-3 3 3 2-2 3 3' },
  { label: 'Add GIF', path: 'M2.5 3.5h11v9h-11zM5.5 6.5v3M8 6.5h2M8 9.5V6.5M12 6.5v3' },
  {
    label: 'Add emoji',
    path: 'M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM5.5 9.5s1 1.25 2.5 1.25 2.5-1.25 2.5-1.25M6 6.25h.01M10 6.25h.01',
  },
]
</script>

<style scoped>
.composer {
  max-width: 28rem;
}
.composer-textarea--drag-over :deep(.ui-textarea-el) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.sr-only-file-input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.composer-attachments {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-inline-start: 0.25rem;
}
.composer-attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  background: var(--ui-muted);
  font-size: 0.75rem;
  max-inline-size: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.composer-attachment-remove {
  flex: none;
  border: none;
  background: transparent;
  color: var(--ui-text-muted);
  cursor: pointer;
  line-height: 1;
}
.composer-attachment-remove:hover {
  color: var(--ui-danger);
}
.composer-count {
  margin-inline-end: 0.5rem;
  font-variant-numeric: tabular-nums;
}
.composer-count--over {
  color: var(--ui-danger);
}
.composer-feed {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
  max-width: 28rem;
  display: grid;
  gap: 0.75rem;
}
.composer-feed-item {
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  padding-block: 0.5rem;
  border-block-start: 1px solid var(--ui-border);
}
.composer-feed-item p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
}

.reply-composer {
  max-width: 28rem;
}
/* Spacing lives inside motion-animated content to avoid dead space on collapse */
.reply-composer :deep(.ui-textarea-bottom) {
  margin-block-start: 0;
}
.reply-tools {
  display: flex;
  gap: 0.125rem;
  padding-block-start: 0.5rem;
}
.reply-actions {
  display: flex;
  align-items: center;
  padding-block-start: 0.5rem;
}
.reply-textarea :deep(.ui-textarea-el) {
  transition: min-block-size 250ms var(--ui-ease-out);
}
.reply-textarea--expanded :deep(.ui-textarea-el) {
  min-block-size: calc(3 * 1lh + 1rem);
}
@media (prefers-reduced-motion: reduce) {
  .reply-textarea :deep(.ui-textarea-el) {
    transition: none;
  }
}
</style>
