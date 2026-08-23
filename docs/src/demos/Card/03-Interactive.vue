<template>
  <section class="demo">
    <h3>Interactive, <code>as="a"</code> or the <code>interactive</code> prop</h3>
    <p class="note">
      <code>as="a"</code>/<code>as="button"</code> implies the hover/press affordance automatically;
      <code>interactive</code> adds the same feedback to a plain non-interactive tag when the whole
      card acts as a single control.
    </p>
    <div class="row">
      <Card as="a" href="https://vuejs.org" target="_blank" rel="noopener" title="Read the docs">
        <p class="panel-text">
          Opens in a new tab, hover/press feedback comes from `as="a"` alone.
        </p>
      </Card>
      <Card as="button" title="Run migration" @click="runs++">
        <p class="panel-text">Clicked {{ runs }} time{{ runs === 1 ? '' : 's' }}.</p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Card } from 'vael-ui'

const runs = shallowRef(0)
</script>
