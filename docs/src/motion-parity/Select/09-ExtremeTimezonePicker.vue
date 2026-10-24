<template>
  <section class="demo">
    <h3>Extreme: timezone picker with live group counts and sticky regions</h3>
    <p class="note">
      Each region carries its own <code>icon</code> and <code>hint</code>, and
      <code>#group-label</code> reads them straight off <code>group</code>. Its
      <code>items</code> are the zones still showing, so the count follows your search.
      <code>ui.groupLabel</code> pins each region to the top while you scroll through it, and
      <code>scroll-padding</code> on <code>ui.list</code> keeps the highlighted zone clear of that
      label as arrow keys scroll. <code>ui.group</code> draws the line between regions. Search by
      city or by offset, such as <code>+1</code>. The panel opens on Select's own motion; nothing
      inside it adds any.
    </p>
    <div class="row">
      <Field label="Timezone">
        <Select
          v-model="zone"
          :items="regions"
          :filter="matches"
          :max-panel-height="320"
          placeholder="Choose a timezone"
          :ui="{
            panel: { style: { minInlineSize: '20rem' } },
            group: 'tz-group',
            list: 'tz-list',
            groupLabel: 'tz-label',
            option: 'tz-option',
          }"
        >
          <template #group-label="{ group, items: shown }">
            <component :is="group.icon" class="tz-icon" weight="bold" aria-hidden="true" />
            <span class="tz-region">{{ group.label }}</span>
            <span class="tz-hint">{{ group.hint }}</span>
            <span class="tz-count"
              >{{ shown.length }} {{ shown.length === 1 ? 'zone' : 'zones' }}</span
            >
          </template>
          <template #item="{ item, selected }">
            <span class="tz-city">{{ item.label }}</span>
            <span class="tz-offset">{{ item.offset }}</span>
            <time class="tz-time">{{ timeIn(item.value) }}</time>
            <PhCheck v-if="selected" class="tz-check" weight="bold" aria-hidden="true" />
          </template>
        </Select>
      </Field>
      <output class="panel-text">{{ zone ? `${zone} · ${timeIn(zone)}` : '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue'
import { Field, Select } from 'vael-ui'
import { PhCheck, PhGlobeHemisphereEast, PhGlobeHemisphereWest, PhGlobe } from '@phosphor-icons/vue'

interface Zone {
  label: string
  value: string
  offset: string
}

const regions = [
  {
    label: 'Africa',
    hint: 'GMT to EAT',
    icon: PhGlobe,
    items: [
      { label: 'Accra', value: 'Africa/Accra', offset: 'UTC+0' },
      { label: 'Lagos', value: 'Africa/Lagos', offset: 'UTC+1' },
      { label: 'Cairo', value: 'Africa/Cairo', offset: 'UTC+2' },
      { label: 'Johannesburg', value: 'Africa/Johannesburg', offset: 'UTC+2' },
      { label: 'Nairobi', value: 'Africa/Nairobi', offset: 'UTC+3' },
    ],
  },
  {
    label: 'Europe',
    hint: 'WET to MSK',
    icon: PhGlobeHemisphereEast,
    items: [
      { label: 'London', value: 'Europe/London', offset: 'UTC+0' },
      { label: 'Lisbon', value: 'Europe/Lisbon', offset: 'UTC+0' },
      { label: 'Berlin', value: 'Europe/Berlin', offset: 'UTC+1' },
      { label: 'Paris', value: 'Europe/Paris', offset: 'UTC+1' },
      { label: 'Athens', value: 'Europe/Athens', offset: 'UTC+2' },
      { label: 'Moscow', value: 'Europe/Moscow', offset: 'UTC+3' },
    ],
  },
  {
    label: 'Americas',
    hint: 'HST to BRT',
    icon: PhGlobeHemisphereWest,
    items: [
      { label: 'Honolulu', value: 'Pacific/Honolulu', offset: 'UTC−10' },
      { label: 'Los Angeles', value: 'America/Los_Angeles', offset: 'UTC−8' },
      { label: 'Chicago', value: 'America/Chicago', offset: 'UTC−6' },
      { label: 'New York', value: 'America/New_York', offset: 'UTC−5' },
      { label: 'São Paulo', value: 'America/Sao_Paulo', offset: 'UTC−3' },
    ],
  },
  {
    label: 'Asia & Pacific',
    hint: 'GST to NZST',
    icon: PhGlobeHemisphereEast,
    items: [
      { label: 'Dubai', value: 'Asia/Dubai', offset: 'UTC+4' },
      { label: 'Mumbai', value: 'Asia/Kolkata', offset: 'UTC+5:30' },
      { label: 'Singapore', value: 'Asia/Singapore', offset: 'UTC+8' },
      { label: 'Tokyo', value: 'Asia/Tokyo', offset: 'UTC+9' },
      { label: 'Sydney', value: 'Australia/Sydney', offset: 'UTC+10' },
      { label: 'Auckland', value: 'Pacific/Auckland', offset: 'UTC+12' },
    ],
  },
]

const zone = shallowRef<string | null>(null)

// City or offset: "+1" finds every UTC+1 zone, "-5" matches the typographic minus too.
function matches(item: Zone, query: string): boolean {
  const q = query.toLowerCase().replace('-', '−')
  return item.label.toLowerCase().includes(q) || item.offset.toLowerCase().includes(q)
}

// One clock for every row, ticking on the minute.
const now = shallowRef(new Date())
const timer = setInterval(() => (now.value = new Date()), 30_000)
onBeforeUnmount(() => clearInterval(timer))
const formatters = new Map<string, Intl.DateTimeFormat>()
function timeIn(timeZone: string): string {
  let format = formatters.get(timeZone)
  if (!format) {
    format = new Intl.DateTimeFormat(undefined, { timeZone, hour: '2-digit', minute: '2-digit' })
    formatters.set(timeZone, format)
  }
  return format.format(now.value)
}
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.tz-icon {
  flex: none;
  color: var(--ui-text);
}
.tz-region {
  color: var(--ui-text);
}
.tz-hint {
  font-weight: 400;
}
.tz-count {
  margin-inline-start: auto;
  min-inline-size: 1.25rem;
  padding-inline: 0.375rem;
  border-radius: 999px;
  background: var(--ui-muted);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.tz-city {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tz-offset {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}
.tz-time {
  font-variant-numeric: tabular-nums;
  color: var(--ui-text-muted);
}
.tz-check {
  flex: none;
}
</style>

<!-- The panel is teleported, so vael-ui's own parts are styled from here, outside the scoped styles. -->
<style>
/* Room for the pinned label, so an option scrolled into view by the keyboard isn't under it. */
.tz-list {
  scroll-padding-block-start: 2rem;
}
.tz-group + .tz-group {
  border-block-start: 1px solid var(--ui-border);
  padding-block-start: 0.25rem;
}
.tz-label {
  position: sticky;
  inset-block-start: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: color-mix(in oklab, var(--ui-surface) 85%, transparent);
  backdrop-filter: blur(8px);
}
.tz-option {
  gap: 0.75rem;
}
</style>
