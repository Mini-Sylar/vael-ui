<template>
  <section class="demo">
    <h3>Pinned: keep an account notice visible</h3>
    <p class="note">
      <code>pinned: true</code> shows a toast in its own section beside the stack, where newer
      toasts can't cover it. With <code>id: 'verify-email'</code>, the notice can be shown and
      closed from the account's state without storing the returned number.
    </p>
    <div class="account">
      <div class="account__who">
        <strong>Jane Doe</strong>
        <span class="demo-status">jane.doe@example.com</span>
      </div>
      <Badge :variant="badge.variant">{{ badge.label }}</Badge>
    </div>
    <div class="row">
      <Button :disabled="status === 'unverified'" @click="status = 'unverified'">
        1. Sign up
      </Button>
      <Button variant="outline" :disabled="status !== 'unverified'" @click="simulateActivity">
        2. Get other notifications
      </Button>
      <Button variant="outline" :disabled="status !== 'unverified'" @click="status = 'verified'">
        3. Verify email
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, shallowRef, watch } from 'vue'
import { Badge, Button, toast } from 'vael-ui'

const status = shallowRef<'signed-out' | 'unverified' | 'verified'>('signed-out')

const badge = computed(() => {
  if (status.value === 'unverified') return { variant: 'warning' as const, label: 'Not verified' }
  if (status.value === 'verified') return { variant: 'success' as const, label: 'Verified' }
  return { variant: 'muted' as const, label: 'Signed out' }
})

// The notice follows the account's state: shown while unverified, closed otherwise.
watch(status, (value) => {
  if (value !== 'unverified') {
    toast.dismiss('verify-email')
    return
  }
  toast.warning('Verify your email to unlock every feature.', {
    id: 'verify-email',
    pinned: true,
    duration: Infinity,
    action: { label: 'Resend', onClick: () => toast.success('Verification email sent') },
  })
})

function simulateActivity() {
  toast('Maya commented on your post')
  toast.success('Project synced')
  toast('Invite accepted by Sam')
}

onUnmounted(() => toast.dismiss('verify-email'))
</script>

<style scoped>
.account {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-inline-size: 24rem;
  margin-block-end: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
}

.account__who {
  display: grid;
}
</style>
