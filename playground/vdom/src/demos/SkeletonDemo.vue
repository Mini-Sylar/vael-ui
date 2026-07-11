<template>
  <section class="demo">
    <h2>Skeleton</h2>
    <p class="note">
      Always <code>aria-hidden</code> — a skeleton is decoration, not content. Pair it with a live
      region elsewhere on the page (e.g. a visually-hidden "Loading results…" announced once, not
      per skeleton) if the loading state itself needs to be announced.
    </p>

    <h3>Variants</h3>
    <div class="row">
      <Skeleton variant="text" style="width: 12rem" />
      <Skeleton variant="circle" />
      <Skeleton variant="rect" style="width: 6rem; height: 4rem" />
    </div>

    <h3>Text block — stacked lines, last one shorter</h3>
    <div class="skeleton-lines">
      <Skeleton variant="text" />
      <Skeleton variant="text" />
      <Skeleton variant="text" style="width: 60%" />
    </div>

    <h3>Sized by real content — pass the content it stands in for as a slot</h3>
    <p class="note">
      The slotted content stays in the layout (so the skeleton box matches its real size) but never
      paints — only the pulsing background shows.
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

    <h3><code>animated=false</code> — static placeholder, no pulse</h3>
    <div class="row">
      <Skeleton variant="text" :animated="false" style="width: 12rem" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Skeleton } from 'vael-ui'
</script>

<style scoped>
.skeleton-lines {
  display: grid;
  gap: 0.5rem;
  max-width: 20rem;
}
</style>
