<template>
  <section class="demo">
    <h3>Undo with an action</h3>
    <p class="note">
      A toast can carry one action button; clicking it runs <code>onClick</code> and closes the
      toast.
    </p>
    <ul class="inbox">
      <li v-for="item in inbox" :key="item">
        <span>{{ item }}</span>
        <Button size="sm" variant="ghost" @click="archive(item)">Archive</Button>
      </li>
      <li v-if="inbox.length === 0" class="demo-status">Inbox empty</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Button, toast } from 'vael-ui'

const all = ['Weekly report', 'Design review notes', 'Invoice #1042']
const inbox = ref([...all])

function archive(item: string) {
  inbox.value = inbox.value.filter((i) => i !== item)
  toast(`Archived "${item}"`, {
    action: {
      label: 'Undo',
      onClick: () => {
        inbox.value = all.filter((i) => i === item || inbox.value.includes(i))
      },
    },
  })
}
</script>

<style scoped>
.inbox {
  display: grid;
  gap: 0.25rem;
  max-inline-size: 24rem;
  margin: 0;
  padding: 0.5rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  list-style: none;
}

.inbox li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline-start: 0.5rem;
}
</style>
