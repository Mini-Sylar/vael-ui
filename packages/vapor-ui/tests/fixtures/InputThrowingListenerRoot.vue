<template>
  <Input v-model="text" data-testid="vapor-throwing-input" @input="boom" />
  <output data-testid="vapor-throwing-value">{{ text }}</output>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import { Input } from 'vael-ui/vapor'

const text = ref('')
function boom() {
  throw new Error('consumer boom')
}
</script>
