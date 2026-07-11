import { createApp } from 'vue'
// Library CSS first, app CSS second: our rules live in @layer ui-components,
// so any unlayered consumer rule (and Tailwind utilities) wins by default.
import 'vael-ui/style.css'
import './style.css'
// import './main.css'
import App from './App.vue'
import { i18n } from './i18n'
import { dashboardRouter } from './demos/dashboard/router'

// Installed once, app-wide — but `dashboardRouter` runs on
// `createMemoryHistory()` and only the DashboardDemo subtree ever renders a
// <router-view>/<router-link>, so nothing about the rest of this
// single-scroll playground page changes. See router.ts for why this is the
// safer of the two "your call" scoping options.
createApp(App).use(i18n).use(dashboardRouter).mount('#app')
