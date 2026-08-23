<template>
  <section class="demo">
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
  </section>
</template>

<script setup lang="ts">
import { Avatar, Card } from 'vael-ui'
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
