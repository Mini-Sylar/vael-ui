<template>
  <ButtonGroup v-model="styles" multiple aria-label="Text style">
    <Button value="bold" data-testid="bold">Bold</Button>
    <Button value="italic" data-testid="italic">Italic</Button>
  </ButtonGroup>
  <Button v-model:pressed="pinned" data-testid="pin">Pin</Button>
  <output data-testid="state">{{ styles.join(',') }}|{{ pinned }}</output>
</template>

<script setup lang="ts" vapor>
// Built dist import, not source: the group's provide and Button's inject cross the Vapor bundle.
import { ref } from 'vue'
import { Button, ButtonGroup } from 'vael-ui/vapor'

const styles = ref<(string | number)[]>(['bold'])
const pinned = ref(false)
</script>
