<template>
  <div>
    <Card>
      <template #header>
        <h3 class="ui-card-title">Settings</h3>
        <p class="ui-card-description">
          Tab selection is a real route (<code>?tab=</code>), synced both ways with
          <code>Tabs</code>' own <code>v-model:active</code>.
        </p>
      </template>
      <Tabs
        ref="settingsTabsRef"
        v-model:active="activeTab"
        :items="tabItems"
        class="dash-settings-tabs"
      >
        <template #default="{ active: current, select, items }">
          <div class="ui-tabs-indicator ui-tabs-indicator--background" :style="indicatorStyle" />
          <Button
            v-for="item in items"
            :key="item"
            variant="ghost"
            size="sm"
            role="tab"
            :aria-selected="current === item"
            :tabindex="current === item ? 0 : -1"
            @click="select(item)"
          >
            {{ TAB_LABELS[item] }}
          </Button>
        </template>
      </Tabs>
      <div class="dash-settings-panel">
        <!-- Same fade recipe as DashboardDemo.vue's <RouterView> transition
             (name, 0.2s duration, ease) so the indicator's slide and the
             content swap it points at read as one coherent tab system
             instead of two unrelated motion languages. -->
        <Transition name="fade" mode="out-in">
          <div v-if="activeTab === 'general'" key="general" class="dash-settings-tab-content">
            <Field label="Workspace name" description="Shown to every member in the sidebar.">
              <Input v-model="general.name" placeholder="Acme Inc." />
            </Field>
            <Field label="Support email">
              <Input v-model="general.email" type="email" placeholder="support@acme.com" />
            </Field>
            <Field label="Description">
              <Textarea
                v-model="general.bio"
                :rows="3"
                placeholder="What does this workspace do?"
              />
            </Field>
          </div>
          <div
            v-else-if="activeTab === 'notifications'"
            key="notifications"
            class="dash-settings-tab-content"
          >
            <Switch v-model="notifications.email" label="Email me about order refunds" />
            <Switch v-model="notifications.weekly" label="Weekly summary digest" />
            <Switch v-model="notifications.security" label="Security alerts" disabled />
          </div>
          <div
            v-else-if="activeTab === 'security'"
            key="security"
            class="dash-settings-tab-content"
          >
            <RadioGroup v-model="security.method" name="2fa-method">
              <Radio value="app" label="Authenticator app" />
              <Radio value="sms" label="SMS code" />
              <Radio value="none" label="Disabled" />
            </RadioGroup>
            <Switch v-model="security.requireForBilling" label="Require 2FA for billing changes" />
          </div>
          <div v-else key="billing" class="dash-settings-tab-content">
            <div class="dash-plan-row">
              <span>Current plan</span>
              <Chip label="Growth" />
            </div>
            <Field
              label="Upload a receipt"
              description="For expense reporting — not actually stored."
            >
              <FileUpload v-model:files="receiptFiles" accept=".pdf,.png,.jpg" />
            </Field>
          </div>
        </Transition>
        <div class="dash-settings-actions">
          <Button variant="primary" @click="save">Save changes</Button>
        </div>
      </div>
    </Card>
  </div>
</template>

<!--
  `activeTab` is a real two-way bridge to `route.query.tab`: the `watch`
  pair below keeps Tabs' own v-model in sync with the URL both directions
  (a query-param change from DashboardSidebar's Collapsible sub-links
  navigates here AND switches the tab; switching the tab locally also
  updates the query string) — proving Tabs composes cleanly with an
  external state source it knows nothing about, same headless contract
  every other Tabs usage in this playground already relies on.

  Comment stays outside <template> — see Button.vue for why.
-->
<script setup lang="ts">
import { computed, reactive, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Button,
  Chip,
  Field,
  FileUpload,
  Input,
  Radio,
  RadioGroup,
  Switch,
  Tabs,
  Textarea,
  toast,
  useTabIndicator,
  Card,
} from 'vael-ui'

type SettingsTab = 'general' | 'notifications' | 'security' | 'billing'

// Tabs is a generic SFC — typing this ref through its full generic instance
// (InstanceType<typeof Tabs>) creates a circular type in vue-tsc, same
// TabsListElInstance workaround TabsDemo.vue's own sliding-indicator example
// already uses: just name the one exposed shape this needs.
interface TabsListElInstance {
  listEl: HTMLElement | null
}

const TAB_LABELS: Record<SettingsTab, string> = {
  general: 'General',
  notifications: 'Notifications',
  security: 'Security',
  billing: 'Billing',
}
const tabItems: SettingsTab[] = ['general', 'notifications', 'security', 'billing']

const route = useRoute()
const router = useRouter()

function tabFromQuery(): SettingsTab {
  const raw = route.query.tab
  return tabItems.includes(raw as SettingsTab) ? (raw as SettingsTab) : 'general'
}
const activeTab = ref<SettingsTab>(tabFromQuery())

watch(
  () => route.query.tab,
  () => {
    activeTab.value = tabFromQuery()
  },
)
watch(activeTab, (tab) => {
  if (route.query.tab !== tab) void router.replace({ query: { ...route.query, tab } })
})

const settingsTabsRef = useTemplateRef<TabsListElInstance>('settingsTabsRef')
const { style: indicatorStyle } = useTabIndicator(activeTab, {
  listEl: computed(() => settingsTabsRef.value?.listEl ?? null),
})

const general = reactive({
  name: 'Acme Inc.',
  email: 'support@acme.com',
  bio: 'We help teams ship faster.',
})
const notifications = reactive({ email: true, weekly: false, security: true })
const security = reactive({ method: 'app', requireForBilling: true })
const receiptFiles = shallowRef<File[]>([])

function save() {
  toast.success('Settings saved (nothing is actually persisted in this demo).')
}
</script>

<style scoped>
.dash-settings-tabs {
  display: flex;
  inline-size: 100%;
  gap: 0.25rem;
  border-block-end: 1px solid var(--ui-border);
  padding-block-end: 0.5rem;
  margin-block-end: 1rem;
  align-items: center;
}

.dash-settings-tab[aria-selected='true'] {
  color: var(--ui-text);
  font-weight: 600;
}
.dash-settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-inline-size: 28rem;
}
.dash-settings-tab-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.dash-plan-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
}
.dash-settings-actions {
  padding-block-start: 0.5rem;
}

/* Same recipe as DashboardDemo.vue's own route-view fade (name, 0.2s,
   ease) — the tab indicator already slides smoothly, so the content it
   points at needs the same motion language instead of teleporting. */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
