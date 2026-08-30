<template>
  <section class="demo">
    <h3>Basic, title, description, body, footer</h3>
    <div class="row">
      <Card title="Team plan" description="For growing teams that need more seats.">
        <p class="panel-text">$29/month, billed annually. Unlimited projects, priority support.</p>
        <template #footer>
          <Button size="sm" variant="outline">Compare plans</Button>
          <Button size="sm">Upgrade</Button>
        </template>
      </Card>

      <Card>
        <p class="panel-text">
          No header at all when neither <code>title</code> nor <code>#header</code> is used, just
          the body.
        </p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, Card } from 'vael-ui'
</script>
