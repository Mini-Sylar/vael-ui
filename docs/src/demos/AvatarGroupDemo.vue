<template>
  <section class="demo">
    <h2>AvatarGroup</h2>
    <p class="note">
      Overlap is pure CSS on plain <code>Avatar</code> children, truncation is your call:
      <code>AvatarGroup</code> just renders whatever <code>Avatar</code>s you slot in, plus an
      <code>overflowCount</code> "+N" if you tell it how many you left out.
    </p>

    <h3>Basic</h3>
    <div class="row">
      <AvatarGroup>
        <Avatar name="Ada Lovelace" />
        <Avatar name="Grace Hopper" />
        <Avatar name="Katherine Johnson" />
      </AvatarGroup>
    </div>

    <h3>Truncated, <code>overflowCount</code></h3>
    <div class="row">
      <AvatarGroup :overflow-count="team.length - 4">
        <Avatar v-for="person in team.slice(0, 4)" :key="person" :name="person" />
      </AvatarGroup>
    </div>

    <h3>Sizes</h3>
    <div class="row row--stack">
      <AvatarGroup size="sm">
        <Avatar v-for="person in team.slice(0, 3)" :key="person" :name="person" size="sm" />
      </AvatarGroup>
      <AvatarGroup size="lg" :overflow-count="2">
        <Avatar v-for="person in team.slice(0, 3)" :key="person" :name="person" size="lg" />
      </AvatarGroup>
    </div>

    <h3><code>hoverLift</code></h3>
    <p class="note">Off by default. Lifts an avatar above its neighbors on hover.</p>
    <div class="row">
      <AvatarGroup hover-lift>
        <Avatar v-for="person in team.slice(0, 4)" :key="person" :name="person" />
      </AvatarGroup>
    </div>

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

<style scoped>
.row--stack {
  align-items: center;
}
</style>
