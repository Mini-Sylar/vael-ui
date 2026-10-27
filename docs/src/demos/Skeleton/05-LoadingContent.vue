<template>
  <section class="demo">
    <h3>Loading your own content</h3>
    <p class="note">
      With <code>loading</code>, Skeleton wraps the real content and draws it as bones of itself:
      each line of text a bar, the avatar a circle, the button and badge their own shapes, the card
      as it is. Render it with placeholder data while it loads. When <code>loading</code> turns
      <code>false</code>, the content comes in and the card eases to its real size.
    </p>
    <div class="profile">
      <Skeleton :loading="!person">
        <Card>
          <div class="head">
            <Avatar :name="shown.name" size="lg" />
            <div>
              <strong class="name">{{ shown.name }}</strong>
              <div class="role">{{ shown.role }}</div>
            </div>
            <Badge variant="success">{{ shown.status }}</Badge>
          </div>
          <p class="bio">{{ shown.bio }}</p>
          <Button size="sm">Follow</Button>
        </Card>
      </Skeleton>
      <Button variant="outline" size="sm" @click="load">Reload</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { Avatar, Badge, Button, Card, Skeleton } from 'vael-ui'

interface Person {
  name: string
  role: string
  status: string
  bio: string
}

// What the bones are drawn from while the real person loads: about the same length of text.
const placeholder: Person = {
  name: 'Loading name',
  role: 'Loading role here',
  status: 'Active',
  bio: 'A short placeholder bio, two lines or so, the length the real one usually is.',
}
const person = shallowRef<Person | null>(null)
const shown = computed(() => person.value ?? placeholder)

let timer: ReturnType<typeof setTimeout> | undefined
function load() {
  person.value = null
  clearTimeout(timer)
  timer = setTimeout(() => {
    person.value = {
      name: 'Ama Mensah',
      role: 'Platform lead, Accra',
      status: 'Online',
      bio: 'Leads the platform team and keeps every release on time. Ask her about type systems, coffee, or the best jollof in town.',
    }
  }, 1600)
}
onMounted(load)
</script>

<style scoped>
.profile {
  display: grid;
  justify-items: start;
  gap: 0.75rem;
  max-inline-size: 22rem;
}
.profile > :first-child {
  inline-size: 100%;
}
.head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.head > div {
  flex: 1;
}
.name {
  display: block;
}
.role {
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.bio {
  margin: 0.75rem 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
