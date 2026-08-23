<template>
  <section class="demo">
    <h3>Joined actions</h3>
    <p class="note">Each button is still independently clickable and independently disableable.</p>
    <div class="row">
      <ButtonGroup aria-label="Message actions">
        <Button variant="outline" @click="archived = !archived">{{
          archived ? 'Archived' : 'Archive'
        }}</Button>
        <Button variant="outline" @click="reported = !reported">{{
          reported ? 'Reported' : 'Report'
        }}</Button>
        <Button variant="outline" disabled>Snooze</Button>
      </ButtonGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'

const archived = shallowRef(false)
const reported = shallowRef(false)
</script>
