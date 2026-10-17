<template>
  <p data-testid="dialog-body">{{ dialog.data }}</p>
</template>

<script setup vapor lang="ts">
import { useDialogRef } from 'vael-ui/vapor'

const dialog = useDialogRef<string>()
</script>
