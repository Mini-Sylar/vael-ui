<template>
  <section class="demo">
    <h3>Types, and one setting for every spinner</h3>
    <p class="note">
      <code>type</code> picks the animation: <code>ring</code>, <code>dots</code>,
      <code>bars</code>, <code>comet</code> or <code>dither</code>. Each is pure CSS in a
      <code>1em</code> square that follows <code>currentColor</code>, so swapping one never shifts
      the layout. Set <code>loader-type</code> on <code>ConfigProvider</code> and every spinner
      inside follows it: Loader, Button’s loading state, list loading rows, loading toasts and
      PullToRefresh. A Button’s own <code>loader-type</code> wins.
    </p>
    <div class="stack">
      <div class="row types">
        <span v-for="type in types" :key="type" class="type">
          <Loader :type="type" size="1.75rem" :label="`Loading (${type})`" />
          <code>{{ type }}</code>
        </span>
      </div>
      <div class="row">
        <SelectButton
          v-model="appLoader"
          :items="types.map((t) => ({ label: t, value: t }))"
          :allow-empty="false"
          size="sm"
          aria-label="App-wide loader"
        />
      </div>
      <ConfigProvider :loader-type="appLoader">
        <div class="row">
          <Button loading>Saving</Button>
          <Button loading loader="inline" variant="outline">Uploading</Button>
          <Button loading variant="secondary" icon aria-label="Refreshing">↻</Button>
          <Button loading loader="inline" loader-type="comet" variant="ghost"
            >Always a comet</Button
          >
          <Loader size="1.25rem" label="Loading" class="accent" />
        </div>
      </ConfigProvider>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ConfigProvider, Loader, SelectButton } from 'vael-ui'
import type { LoaderType } from 'vael-ui'

const types: LoaderType[] = ['ring', 'dots', 'bars', 'comet', 'dither']
const appLoader = shallowRef<LoaderType>('dots')
</script>

<style scoped>
/* Its own stack: the last row sits inside ConfigProvider's display: contents wrapper, which
   drops the margin the shared demo spacing would give it. */
.stack {
  display: grid;
  gap: 1.25rem;
}

.types {
  gap: 1.75rem;
}

.type {
  display: inline-grid;
  justify-items: center;
  gap: 0.5rem;
  color: var(--ui-text);
}

.type code {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.accent {
  color: var(--ui-primary);
}
</style>
