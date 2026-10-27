<!-- Toaster with every part: two toasts held in a box (icon, title, description, action, close). -->
<template>
  <div data-specimen class="specimen">
    <div ref="box" class="box">
      <span class="page">Billing settings</span>
      <Toaster name="anatomy" :container="box" position="bottom-right" expand />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import { Toaster, toast } from 'vael-ui'

const box = useTemplateRef<HTMLElement>('box')
const IDS = ['anatomy-saved', 'anatomy-failed']
onMounted(() => {
  toast.success('Changes saved', {
    id: IDS[0],
    toaster: 'anatomy',
    duration: Infinity,
    description: 'Your billing email is updated.',
  })
  toast.error('Card declined', {
    id: IDS[1],
    toaster: 'anatomy',
    duration: Infinity,
    description: 'Try another payment method.',
    action: { label: 'Update', onClick: () => {} },
  })
})
onBeforeUnmount(() => IDS.forEach((id) => toast.dismiss(id)))
</script>

<style scoped>
.specimen {
  inline-size: min(26rem, 100%);
}
.box {
  position: relative;
  block-size: 15rem;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 10px;
  background: var(--ui-surface);
}
.page {
  display: block;
  padding: 0.75rem 1rem;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
</style>
