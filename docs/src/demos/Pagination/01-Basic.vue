<template>
  <section class="demo">
    <h3>Basic</h3>
    <Pagination v-model:page="page" :total="120" />
    <p class="demo-status">Page {{ page }} of 12</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Pagination } from 'vael-ui'

const page = shallowRef(1)
</script>
