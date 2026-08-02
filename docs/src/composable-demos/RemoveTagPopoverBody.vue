<!-- The low-level way to build a confirm-shaped popover by hand — contrast
     with confirmAction({ surface: 'popover' }), which does exactly this
     for you. Popover has no separate header/footer slots the way Dialog
     does, so title/body/actions all live together here. -->
<template>
  <p class="remove-tag-title">Remove "urgent" tag?</p>
  <div class="remove-tag-actions">
    <Button size="sm" variant="outline" @click="popoverRef.close(false)">Cancel</Button>
    <Button size="sm" variant="danger" @click="popoverRef.close(true)">Remove</Button>
  </div>
</template>

<script setup lang="ts">
import { Button, usePopoverRef } from 'vael-ui'

const popoverRef = usePopoverRef<void, boolean>()
</script>

<style scoped>
.remove-tag-title {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.remove-tag-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
</style>
