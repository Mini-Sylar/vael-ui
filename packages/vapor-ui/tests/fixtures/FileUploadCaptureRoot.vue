<template>
  <FileUpload data-testid="vapor-upload-default" accept="image/*" />
  <FileUpload data-testid="vapor-upload-environment" accept="image/*" capture="environment" />
</template>

<script setup lang="ts" vapor>
import { FileUpload } from 'vael-ui/vapor'
</script>
