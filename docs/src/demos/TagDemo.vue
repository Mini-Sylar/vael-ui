<template>
  <section class="demo">
    <h2>Tag</h2>
    <p class="note">
      A small status/label pill, plain and non-interactive. Six semantic <code>variant</code>s, two
      sizes, an optional <code>pill</code> shape, and an <code>#icon</code> slot for a small leading
      glyph sized to match the text, not a full icon box.
    </p>

    <h3>Variants</h3>
    <div class="row">
      <Tag variant="primary">Primary</Tag>
      <Tag variant="muted">Muted</Tag>
      <Tag variant="success">Success</Tag>
      <Tag variant="warning">Warning</Tag>
      <Tag variant="danger">Danger</Tag>
      <Tag variant="info">Info</Tag>
    </div>

    <h3>Sizes</h3>
    <div class="row">
      <Tag size="md" variant="primary">Medium</Tag>
      <Tag size="sm" variant="primary">Small</Tag>
    </div>

    <h3>Pill shape</h3>
    <div class="row">
      <Tag variant="success" pill>Active</Tag>
      <Tag variant="danger" pill>Inactive</Tag>
    </div>

    <h3>With an icon</h3>
    <div class="row">
      <Tag variant="success">
        <template #icon><PhCheckCircle :size="8" weight="bold" /></template>
        Verified
      </Tag>
      <Tag variant="warning">
        <template #icon><PhWarning :size="8" weight="bold" /></template>
        Pending review
      </Tag>
      <Tag variant="danger" pill>
        <template #icon><PhXCircle :size="8" weight="bold" /></template>
        Failed
      </Tag>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Tag } from 'vael-ui'
import { PhCheckCircle, PhWarning, PhXCircle } from '@phosphor-icons/vue'
</script>
