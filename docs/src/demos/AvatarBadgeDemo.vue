<template>
  <section class="demo">
    <h2>Avatar &amp; Badge</h2>

    <h3>Avatar, initials fallback and image crossfade</h3>
    <p class="note">
      The initials fallback is always in the DOM as the base layer; a real
      <code>src</code> crossfades in on top once it actually finishes loading. A broken
      <code>src</code> keeps the initials fallback permanently, never a broken-image icon. The image
      below is an inline data URI, no network request, so the crossfade is real and visible without
      any external dependency.
    </p>
    <div class="row">
      <Avatar :src="swatchDataUri" name="Ada Lovelace" />
      <Avatar name="Ada Lovelace" />
      <Avatar name="Grace Hopper" src="/definitely-missing-avatar-image.png" />
      <Avatar shape="square" name="Marie Curie" />
    </div>

    <h3>Sizes</h3>
    <div class="row">
      <Avatar size="sm" name="Ada Lovelace" />
      <Avatar size="md" name="Ada Lovelace" />
      <Avatar size="lg" name="Ada Lovelace" />
    </div>

    <h3>Custom fallback via the default slot (Phosphor icon)</h3>
    <p class="note">
      The default slot overrides the initials entirely, useful for a generic "unknown user" or a
      team/bot account that has no name to derive initials from.
    </p>
    <div class="row">
      <Avatar>
        <PhUser weight="fill" />
      </Avatar>
      <Avatar shape="square">
        <PhRobot weight="fill" />
      </Avatar>
    </div>

    <h3>Badge, notification count and dot</h3>
    <p class="note">
      Badge has zero positioning props of its own, it's a plain inline leaf. Composition with Avatar
      or Button happens through their own <code>#badge</code> slot and
      <code>badgePlacement</code> prop, Badge itself stays unaware of its ancestor's positioning
      context.
    </p>
    <div class="row">
      <Avatar name="Ada Lovelace">
        <template #badge>
          <Badge dot variant="success" />
        </template>
      </Avatar>
      <Button icon aria-label="Notifications" variant="outline">
        <template #badge>
          <Badge variant="danger" :count="unreadCount" />
        </template>
        <PhBell weight="fill" />
      </Button>
      <Button size="sm" variant="secondary" @click="unreadCount++">New notification</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Avatar, Badge, Button } from 'vael-ui'
import { PhBell, PhRobot, PhUser } from '@phosphor-icons/vue'

const unreadCount = shallowRef(3)

// Small inline SVG avatar, encoded as a data URI so the image-loading path
// demonstrates a real crossfade without any network dependency.
const swatchDataUri =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#ff7cab"/>' +
      '</linearGradient></defs>' +
      '<rect width="80" height="80" fill="url(#g)"/>' +
      '</svg>',
  )
</script>
