<template>
  <section class="demo">
    <h2>Card</h2>
    <p class="note">
      Header/body/footer part naming mirrors Dialog's on purpose, <code>title</code>/
      <code>description</code> props for the common case, <code>#header</code> to replace them
      entirely.
    </p>

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

    <h3>Custom header via <code>#header</code></h3>
    <div class="row">
      <Card>
        <template #header>
          <div class="card-custom-header">
            <Avatar size="sm" name="Jane Doe" />
            <div>
              <p class="card-custom-header-title">Jane Doe</p>
              <p class="card-custom-header-sub">Posted 2 hours ago</p>
            </div>
          </div>
        </template>
        <p class="panel-text">Shipped the new onboarding flow, conversion is up 12% this week.</p>
      </Card>
    </div>

    <h3>Interactive, <code>as="a"</code> or the <code>interactive</code> prop</h3>
    <p class="note">
      <code>as="a"</code>/<code>as="button"</code> implies the hover/press affordance automatically;
      <code>interactive</code> adds the same feedback to a plain non-interactive tag when the whole
      card acts as a single control.
    </p>
    <div class="row">
      <Card as="a" href="https://vuejs.org" target="_blank" rel="noopener" title="Read the docs">
        <p class="panel-text">
          Opens in a new tab, hover/press feedback comes from `as="a"` alone.
        </p>
      </Card>
      <Card as="button" title="Run migration" @click="runs++">
        <p class="panel-text">Clicked {{ runs }} time{{ runs === 1 ? '' : 's' }}.</p>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Avatar, Button, Card } from 'vael-ui'

const runs = shallowRef(0)
</script>

<style scoped>
.card-custom-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}
.card-custom-header-title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
}
.card-custom-header-sub {
  margin: 0;
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}
</style>
