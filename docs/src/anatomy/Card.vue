<!-- Card with every part: a header (title and description), a body and a footer. -->
<template>
  <div data-specimen class="specimen">
    <Card title="Team plan" description="For growing teams that need more seats.">
      $29 a month, billed yearly. Unlimited projects and priority support.
      <template #footer>
        <Button variant="outline" size="sm">Compare plans</Button>
        <Button size="sm">Upgrade</Button>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Button, Card } from 'vael-ui'
</script>

<style scoped>
.specimen {
  inline-size: min(24rem, 100%);
}
</style>
