<template>
  <span data-testid="field-probe">{{ field ? 'in field' : 'no field' }}</span>
</template>

<script setup vapor lang="ts">
import { inject } from 'vue'
import { fieldKey } from 'vael-ui/vapor'

const field = inject(fieldKey, null)
</script>
