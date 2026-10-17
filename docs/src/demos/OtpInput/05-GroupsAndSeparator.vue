<template>
  <section class="demo">
    <h3>Groups with a separator</h3>
    <p class="note">
      <code>groups</code> takes a group size or each group's size. The <code>#separator</code> slot
      replaces the dash.
    </p>
    <div class="stack">
      <Field label="Verification code">
        <OtpInput v-model="code" :groups="3" />
      </Field>
      <Field label="Licence key">
        <OtpInput v-model="licence" type="alphanumeric" :length="8" :groups="[4, 4]">
          <template #separator>
            <span class="slash" aria-hidden="true">/</span>
          </template>
        </OtpInput>
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, OtpInput } from 'vael-ui'

const code = shallowRef('')
const licence = shallowRef('')
</script>

<style scoped>
.stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.slash {
  color: var(--ui-text-muted);
  font-size: 1.125rem;
}
</style>
