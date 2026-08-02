<template>
  <section class="demo">
    <div class="demo-row">
      <Button size="sm" variant="outline" @click="toast('Saved changes')">Default</Button>
      <Button size="sm" variant="outline" @click="toast.success('Upload complete')">
        Success
      </Button>
      <Button size="sm" variant="outline" @click="toast.error('Could not connect')">Error</Button>
      <Button size="sm" variant="outline" @click="runPromise">Promise</Button>
    </div>
    <div class="demo-row">
      <Button size="sm" variant="ghost" :disabled="toasts.length === 0" @click="pauseAll">
        Pause all timers
      </Button>
      <Button size="sm" variant="ghost" :disabled="toasts.length === 0" @click="resumeAll">
        Resume all timers
      </Button>
    </div>
    <p class="demo-status">
      Live queue (<code>useToastQueue().toasts</code>): <strong>{{ toasts.length }}</strong> active
      <span v-if="toasts.length > 0"> — {{ toasts.map((t) => t.title).join(', ') }} </span>
    </p>
  </section>
</template>

<script setup lang="ts">
import { Button, toast, useToastQueue } from 'vael-ui'

// The reactive queue <Toaster/> itself renders from — read-only here, plus
// the same pause/resume it calls internally on pointerenter/pointerleave.
const { toasts, pauseAll, resumeAll } = useToastQueue()

function fakeUpload(): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.3) reject(new Error('network error'))
      else resolve({ url: '/files/report.pdf' })
    }, 1200)
  })
}

function runPromise() {
  // toast.promise() owns the whole lifecycle: shows the loading toast
  // immediately, swaps it for success/error once the promise settles —
  // no manual dismiss() bookkeeping.
  toast.promise(fakeUpload, {
    loading: 'Uploading…',
    success: (data) => `Uploaded to ${data.url}`,
    error: (err) => `Upload failed: ${(err as Error).message}`,
  })
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
}

.demo-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
