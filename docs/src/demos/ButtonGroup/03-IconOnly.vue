<template>
  <section class="demo">
    <h3>Icon-only</h3>
    <p class="note">A compact zoom control, no labels needed once the icons are unambiguous.</p>
    <div class="row">
      <ButtonGroup aria-label="Zoom">
        <Button variant="outline" size="sm" icon aria-label="Zoom out" @click="zoom--">
          <PhMinus weight="bold" />
        </Button>
        <Button variant="outline" size="sm" @click="zoom = 100"> {{ zoom }}% </Button>
        <Button variant="outline" size="sm" icon aria-label="Zoom in" @click="zoom++">
          <PhPlus weight="bold" />
        </Button>
      </ButtonGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'
import { PhMinus, PhPlus } from '@phosphor-icons/vue'

const zoom = shallowRef(100)
</script>
