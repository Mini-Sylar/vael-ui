<template>
  <section class="demo">
    <h3>States</h3>
    <div class="row">
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Readonly" readonly model-value="Can't edit this" />
      <Input placeholder="Invalid" invalid />
    </div>
  </section>
</template>

<script setup lang="ts">
import { Input } from 'vael-ui'
</script>
