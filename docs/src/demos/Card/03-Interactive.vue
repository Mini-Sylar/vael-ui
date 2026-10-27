<template>
  <section class="demo">
    <h3>Interactive: <code>as="a"</code> or <code>interactive</code></h3>
    <p class="note">
      <code>as="a"</code> or <code>as="button"</code> adds hover and press feedback on its own.
      <code>interactive</code> adds the same feedback to any other tag, when the whole card acts as
      one control.
    </p>
    <div class="row">
      <Card as="a" href="https://vuejs.org" target="_blank" rel="noopener" title="Read the docs">
        <p class="panel-text">
          Opens in a new tab, hover/press feedback comes from <code>as="a"</code> alone.
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
