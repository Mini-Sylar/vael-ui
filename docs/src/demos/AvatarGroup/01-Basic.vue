<template>
  <section class="demo">
    <h3>Basic</h3>
    <div class="row">
      <AvatarGroup>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
        <Avatar name="Katherine Johnson" />
      </AvatarGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Avatar, AvatarGroup } from 'vael-ui'
</script>
