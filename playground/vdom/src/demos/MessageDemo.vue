<template>
  <section class="demo">
    <h2>Message</h2>
    <p class="note">
      In-flow and stationary, not a floating layer — a crisp <code>border</code>, no
      <code>box-shadow</code>, same convention as Card. The per-variant icons come from
      <code>StatusIcon</code>, extracted out of Toaster so Toast and Message share the same visual
      vocabulary without sharing any of Toast's queue/stacking machinery.
    </p>

    <h3>Variants — role is computed from variant unless overridden</h3>
    <div class="message-stack">
      <Message title="Heads up" variant="default">
        A plain informational message. <code>role="status"</code> by default.
      </Message>
      <Message title="Saved" variant="success">Your changes were saved successfully.</Message>
      <Message title="Something went wrong" variant="error">
        The request failed. <code>role="alert"</code> by default.
      </Message>
      <Message title="Storage almost full" variant="warning">
        You're at 92% of your plan's storage. <code>role="alert"</code> by default.
      </Message>
      <Message title="New feature" variant="info">Custom domains are now available.</Message>
    </div>

    <h3><code>appearance="bare"</code> — inline, for form field validation</h3>
    <p class="note">
      No border/background/padding — icon + colored text only, sized for sitting directly under a
      field instead of standing alone as a banner.
    </p>
    <div class="field">
      <label class="field-label" for="email-field">Email</label>
      <input
        id="email-field"
        class="field-input"
        :class="{ 'field-input--invalid': !emailValid }"
      />
      <Message v-if="!emailValid" variant="error" appearance="bare">
        Enter a valid email address.
      </Message>
    </div>
    <Button size="sm" variant="outline" @click="emailValid = !emailValid">Toggle validity</Button>

    <h3>Closable, with a trailing action</h3>
    <p class="note">
      Dismissing plays the default opacity-fade exit — reopening via <code>v-model</code> doesn't
      animate back in, same "no enter" rule as the rest of this component. The gap collapses in step
      with the fade (plain CSS, no library), and the restore button waits for that to finish before
      taking its place — otherwise it pops in mid-fade and the layout jumps once Message actually
      unmounts.
    </p>
    <div class="message-stack">
      <div
        class="message-collapse"
        :class="{ 'message-collapse--collapsed': !dismissibleVisible }"
        @transitionend="onMessageCollapseEnd"
      >
        <div class="message-collapse-inner">
          <Message
            v-model:open="dismissibleVisible"
            title="Update available"
            variant="info"
            closable
          >
            <template #actions>
              <Button size="sm" variant="outline">Update</Button>
            </template>
            A new version is ready to install.
          </Message>
        </div>
      </div>
      <Button v-if="showRestoreButton" size="sm" variant="outline" @click="restoreDismissible">
        Restore dismissed message
      </Button>
    </div>

    <h3>Custom <code>#icon</code></h3>
    <div class="message-stack">
      <Message title="Starred" variant="default">
        <template #icon>
          <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
            <path
              d="M8 1.5l1.98 4.13 4.52.62-3.27 3.24.8 4.51L8 11.9l-4.03 2.1.8-4.51-3.27-3.24 4.52-.62L8 1.5z"
            />
          </svg>
        </template>
        The default StatusIcon is fully replaceable per-instance.
      </Message>
    </div>

    <h3>No default enter animation, no height collapse on exit</h3>
    <p class="note">
      Messages usually render with the page — animating them in on first paint is noise, so there's
      no <code>appear</code>. Exit is a plain opacity fade; a height collapse is a layout animation,
      deliberately outside the default (see the escape hatch below).
    </p>

    <h3>Full external control — <code>forceMount</code> + AnimatePresence collapsing the gap</h3>
    <p class="note">
      Unlike Dialog/Popover, Message never <code>Teleport</code>s, so
      <code>AnimatePresence</code> works directly here (no <code>beforeClose</code> + imperative
      WAAPI detour needed). Presence lives on the wrapping <code>motion.div</code>, not on Message's
      own <code>open</code> — the built-in dismiss button's <code>@open-change</code> only flips the
      external ref.
    </p>
    <div class="row">
      <Button
        size="sm"
        variant="outline"
        @click="deployMessagePresent = true"
        :disabled="deployMessagePresent"
      >
        Trigger deploy message
      </Button>
    </div>
    <AnimatePresence>
      <motion.div
        v-if="deployMessagePresent"
        key="deploy-message"
        :initial="{ opacity: 0, height: 0, marginTop: 0 }"
        :animate="{ opacity: 1, height: 'auto', marginTop: '0.75rem' }"
        :exit="{ opacity: 0, height: 0, marginTop: 0 }"
        :transition="{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }"
        style="overflow: hidden"
      >
        <Message
          :open="true"
          force-mount
          title="Deploy finished"
          variant="success"
          closable
          @open-change="() => (deployMessagePresent = false)"
        >
          Your build finished successfully.
        </Message>
      </motion.div>
    </AnimatePresence>

    <h3>Extreme — GSAP notification feed: stagger entrance, exit-then-FLIP, programmatic close</h3>
    <p class="note">
      Each message owns its own <code>beforeClose</code>. The real Vue unmount (removing it from the
      list) only happens once GSAP's exit tween completes — the remaining messages are then FLIPped
      into their new positions instead of snapping. "Remove newest" exercises the exact same path
      programmatically, via the exposed <code>close()</code>, not the built-in dismiss button.
    </p>
    <div class="row">
      <Button size="sm" variant="outline" @click="addFeedMessage">Add notification</Button>
      <Button size="sm" variant="outline" @click="removeNewestFeedMessage">Remove newest</Button>
    </div>
    <div ref="feedListEl" class="message-stack">
      <Message
        v-for="item in feedItems"
        :key="item.id"
        :ref="(instance) => registerFeedMessage(item.id, instance)"
        :title="item.title"
        variant="info"
        closable
        :before-close="(done) => onFeedBeforeClose(item.id, done)"
      >
        {{ item.body }}
      </Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef, useTemplateRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { gsap } from 'gsap'
import { Button, Message } from 'vael-ui'

const emailValid = shallowRef(false)

const dismissibleVisible = shallowRef(true)
const showRestoreButton = shallowRef(false)

function onMessageCollapseEnd(event: TransitionEvent) {
  if (event.propertyName === 'grid-template-rows' && !dismissibleVisible.value) {
    showRestoreButton.value = true
  }
}
function restoreDismissible() {
  showRestoreButton.value = false
  dismissibleVisible.value = true
}

const deployMessagePresent = shallowRef(false)

interface FeedItem {
  id: number
  title: string
  body: string
}
const feedItems = shallowRef<FeedItem[]>([])
let feedIdCounter = 0
const feedListEl = useTemplateRef<HTMLElement>('feedListEl')
const feedInstances = new Map<number, InstanceType<typeof Message>>()

function registerFeedMessage(id: number, instance: unknown) {
  if (instance) feedInstances.set(id, instance as InstanceType<typeof Message>)
  else feedInstances.delete(id)
}

function addFeedMessage() {
  const id = feedIdCounter++
  feedItems.value = [
    { id, title: `Notification #${id + 1}`, body: 'A new event just came in.' },
    ...feedItems.value,
  ]
  nextTick(() => {
    const el = feedInstances.get(id)?.el
    if (el) gsap.from(el, { opacity: 0, y: -12, duration: 0.3, ease: 'power3.out' })
  })
}

function removeNewestFeedMessage() {
  feedInstances.get(feedItems.value[0]?.id)?.close()
}

// Defer array removal until GSAP exit finishes (beforeClose's purpose)
function onFeedBeforeClose(id: number, done: () => void) {
  const el = feedInstances.get(id)?.el
  if (!el) {
    feedItems.value = feedItems.value.filter((item) => item.id !== id)
    done()
    return
  }
  const siblings = Array.from(feedListEl.value?.children ?? []).filter(
    (node) => node !== el,
  ) as HTMLElement[]
  const firstRects = new Map(siblings.map((node) => [node, node.getBoundingClientRect()]))
  gsap.to(el, {
    opacity: 0,
    x: 24,
    duration: 0.2,
    ease: 'power3.out',
    onComplete: () => {
      done()
      feedItems.value = feedItems.value.filter((item) => item.id !== id)
      feedInstances.delete(id)
      nextTick(() => {
        for (const node of siblings) {
          const first = firstRects.get(node)
          const dy = first ? first.top - node.getBoundingClientRect().top : 0
          if (dy) gsap.fromTo(node, { y: dy }, { y: 0, duration: 0.25, ease: 'power3.out' })
        }
      })
    },
  })
}
</script>

<style scoped>
.message-stack {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}

.field {
  display: grid;
  gap: 0.375rem;
  max-width: 20rem;
  margin-block-end: 0.75rem;
}
.field-label {
  font-size: 0.8125rem;
  font-weight: 500;
}
.field-input {
  padding: 0.5rem 0.625rem;
  border: 1px solid var(--ui-border-strong);
  border-radius: var(--ui-radius);
  font: inherit;
}
.field-input--invalid {
  border-color: var(--ui-danger);
}

.message-collapse {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--ui-duration-exit) var(--ui-ease-out);
}
.message-collapse--collapsed {
  grid-template-rows: 0fr;
}
.message-collapse-inner {
  overflow: hidden;
  min-height: 0;
}

@media (prefers-reduced-motion: reduce) {
  .message-collapse {
    transition: none;
  }
}
</style>
