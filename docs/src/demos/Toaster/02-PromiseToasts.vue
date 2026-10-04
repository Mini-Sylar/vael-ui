<template>
  <section class="demo">
    <h3>Loading, then the result</h3>
    <p class="note">
      <code>toast.promise</code> shows a loading toast at once, then swaps it for a success or error
      toast when the promise settles.
    </p>
    <div class="row">
      <Button
        variant="outline"
        @click="
          toast.promise(fakeSave, {
            loading: 'Saving…',
            success: 'Saved successfully',
            error: 'Failed to save',
          })
        "
      >
        Save (succeeds)
      </Button>
      <Button
        variant="outline"
        @click="
          toast.promise(fakeFailingSave, {
            loading: 'Saving…',
            success: 'Saved successfully',
            error: (e) => `Failed: ${(e as Error).message}`,
          })
        "
      >
        Save (fails)
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, toast } from 'vael-ui'

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1800))
const fakeFailingSave = () =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('network')), 1800))
</script>
