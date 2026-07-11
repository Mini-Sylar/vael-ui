<template>
  <Button data-testid="vapor-built-button" @click="save">
    <template #default="{ loading }">{{ loading ? 'Saving…' : 'Save' }}</template>
  </Button>
</template>

<script setup lang="ts" vapor>
// Consumes the BUILT dist bundle via the real `vael-ui/vapor` export, not the
// source .vue — proves the compiled artifact itself works standalone, not
// just the dev-server-transformed source.
import { Button } from 'vael-ui/vapor'

function save() {
  return new Promise((resolve) => setTimeout(resolve, 200))
}
</script>
