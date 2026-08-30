<template>
  <section class="demo">
    <h3>Advancing from inside the active step</h3>
    <p class="note">
      The "Approve" action lives inside the active step's own <code>Message</code>, not in a
      separate button below the list — approving it advances <code>current</code>, which reveals the
      next step's own action in turn.
    </p>
    <Timeline class="approval-timeline" :items="steps" :current="current">
      <template #item="{ item, completed, active }">
        <Message :title="item.title" :variant="variantFor(completed, active)">
          <template v-if="completed">Approved by {{ item.approver }}.</template>
          <template v-else-if="active">Waiting on {{ item.approver }}.</template>
          <template v-else>Not started yet.</template>
          <template v-if="active" #actions>
            <Button size="sm" @click="approve">Approve</Button>
          </template>
        </Message>
      </template>
    </Timeline>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Message, Timeline } from 'vael-ui'

interface ApprovalStep {
  title: string
  approver: string
}

const steps: ApprovalStep[] = [
  { title: 'Build passed', approver: 'CI' },
  { title: 'Security review', approver: 'Priya Nair' },
  { title: 'Manager approval', approver: 'Jordan Lee' },
  { title: 'Deployed', approver: 'Release bot' },
]

const current = shallowRef(0)
function variantFor(completed: boolean, active: boolean) {
  if (completed) return 'success'
  if (active) return 'warning'
  return 'default'
}
function approve() {
  if (current.value < steps.length - 1) current.value++
}
</script>

<style scoped>
.approval-timeline {
  max-width: 24rem;
}
</style>
