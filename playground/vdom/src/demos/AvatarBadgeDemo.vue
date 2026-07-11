<template>
  <section class="demo">
    <h2>Avatar &amp; Badge</h2>

    <h3>Avatar — image, initials fallback, broken image</h3>
    <p class="note">
      The fallback is always in the DOM as the base layer; a real <code>src</code> crossfades in on
      top once it actually finishes loading. A broken <code>src</code> keeps the initials fallback
      permanently — never a broken-image icon.
    </p>
    <div class="row">
      <Avatar src="https://i.pravatar.cc/80?img=12" name="Jane Doe" />
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" src="/definitely-missing-avatar-image.png" />
      <Avatar shape="square" name="Marie Curie" />
    </div>

    <h3>Sizes</h3>
    <div class="row">
      <Avatar size="sm" name="Jane Doe" />
      <Avatar size="md" name="Jane Doe" />
      <Avatar size="lg" name="Jane Doe" />
    </div>

    <h3>Custom fallback — default slot beats initials</h3>
    <div class="row">
      <Avatar>
        <svg viewBox="0 0 16 16" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M8 8a3 3 0 100-6 3 3 0 000 6zM2.5 14a5.5 5.5 0 0111 0"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </Avatar>
    </div>

    <h3>Badge — variants, count clamping, dot</h3>
    <p class="note">
      Badge has zero positioning props of its own (see decision 6 in the plan) — it's a plain inline
      leaf you place wherever you like, including standalone.
    </p>
    <div class="row">
      <Badge>New</Badge>
      <Badge variant="success" :count="3" />
      <Badge variant="danger" :count="128" />
      <Badge variant="warning" :count="1200" :max="999" />
      <Badge variant="info" dot />
    </div>

    <h3>Count changing — one-shot pop</h3>
    <div class="row">
      <Badge variant="primary" :count="unreadCount" />
      <Button size="sm" variant="secondary" @click="unreadCount++">Increment</Button>
    </div>

    <h3>Badge-on-Avatar — Avatar's #badge slot, not a Badge overlap prop</h3>
    <p class="note">
      <code
        >&lt;Avatar&gt;&lt;template #badge&gt;&lt;Badge dot variant="success"
        /&gt;&lt;/template&gt;&lt;/Avatar&gt;</code
      >
      — Avatar owns the positioned wrapper (<code>badgePlacement</code>), Badge stays a pure visual
      leaf with no awareness of an ancestor's positioning context.
    </p>
    <div class="row">
      <Avatar name="Jane Doe">
        <template #badge>
          <Badge dot variant="success" />
        </template>
      </Avatar>
      <Avatar name="Sam Lee" badge-placement="top-end">
        <template #badge>
          <Badge variant="danger" :count="4" />
        </template>
      </Avatar>
      <Avatar src="https://i.pravatar.cc/80?img=33" name="Alex Kim" badge-placement="bottom-start">
        <template #badge>
          <Badge dot variant="warning" />
        </template>
      </Avatar>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Avatar, Badge, Button } from 'vael-ui'

const unreadCount = shallowRef(1)
</script>
