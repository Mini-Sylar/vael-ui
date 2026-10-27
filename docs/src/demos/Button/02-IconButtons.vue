<template>
  <section class="demo">
    <h3>
      Icon buttons: <code>#leading</code>, <code>#trailing</code> and icon-only with
      <code>icon</code>
    </h3>
    <p class="note">
      An icon-only button needs an <code>aria-label</code>, since it has no text for screen readers
      to read.
    </p>
    <div class="row">
      <Button>
        <template #leading>
          <PhPlus weight="bold" />
        </template>
        New task
      </Button>
      <Button variant="outline">
        Continue
        <template #trailing>
          <PhArrowRight weight="bold" />
        </template>
      </Button>
      <Button icon variant="secondary" aria-label="Settings">
        <PhGear weight="bold" />
      </Button>
      <Button icon variant="danger" aria-label="Delete task">
        <PhTrash weight="bold" />
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from 'vael-ui'
import { PhArrowRight, PhGear, PhPlus, PhTrash } from '@phosphor-icons/vue'
</script>
