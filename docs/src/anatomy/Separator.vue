<!-- Separator with every part: a label between its two lines, splitting two ways to sign in. -->
<template>
  <div data-specimen class="specimen">
    <Button variant="outline" block>Continue with Google</Button>
    <Separator>or</Separator>
    <Input placeholder="Email" aria-label="Email" />
  </div>
</template>

<script setup lang="ts">
import { Button, Input, Separator } from 'vael-ui'
</script>

<style scoped>
.specimen {
  display: grid;
  gap: 1rem;
  inline-size: min(20rem, 100%);
}
</style>
