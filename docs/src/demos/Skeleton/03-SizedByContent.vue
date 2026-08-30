<template>
  <section class="demo">
    <h3>Sized by real content, pass the content it stands in for as a slot</h3>
    <p class="note">
      The slotted content stays in the layout (so the skeleton box matches its real size) but never
      paints, only the pulsing background shows.
    </p>
    <div class="row">
      <Skeleton variant="rect">
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
          <rect width="80" height="80" rx="8" fill="currentColor" opacity="0.15" />
          <path
            d="M24 52l12-14 10 11 8-9 12 12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="30" cy="30" r="5" fill="currentColor" opacity="0.5" />
        </svg>
      </Skeleton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>
