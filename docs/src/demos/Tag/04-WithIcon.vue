<template>
  <section class="demo">
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
