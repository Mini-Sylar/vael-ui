<template>
  <section class="demo">
    <h3><code>#overflow</code> slot</h3>
    <p class="note">Replaces the default "+N" content of the generated overflow avatar entirely.</p>
    <div class="row">
      <AvatarGroup :overflow-count="team.length - 3">
        <Avatar v-for="person in team.slice(0, 3)" :key="person" :name="person" />
        <template #overflow="{ count }">
          <span :title="`${count} more`">{{ count }}+</span>
        </template>
      </AvatarGroup>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Avatar, AvatarGroup } from 'vael-ui'

const team = [
  'Ada Lovelace',
  'Grace Hopper',
  'Katherine Johnson',
  'Margaret Hamilton',
  'Radia Perlman',
  'Barbara Liskov',
]
</script>
