<template>
  <Toaster />
  <DialogHost />
  <PopoverHost />
  <button ref="anchor">Anchor</button>
  <Field label="Name">
    <SharedStateFieldProbe />
  </Field>
</template>

<script setup vapor lang="ts">
import { useTemplateRef } from 'vue'
import { DialogHost, Field, PopoverHost, Toaster } from 'vael-ui/vapor'
import SharedStateFieldProbe from './SharedStateFieldProbe.vue'

const anchor = useTemplateRef<HTMLElement>('anchor')
defineExpose({ anchor })
</script>
