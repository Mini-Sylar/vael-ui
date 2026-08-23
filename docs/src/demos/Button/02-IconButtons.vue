<template>
  <section class="demo">
    <h3>Icon buttons: leading/trailing slots, and icon-only via the <code>icon</code> prop</h3>
    <p class="note">
      An icon-only button always needs an explicit <code>aria-label</code>, since there's no text
      content for assistive tech to read.
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
