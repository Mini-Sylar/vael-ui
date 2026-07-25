import { createApp, vaporInteropPlugin } from 'vue'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import 'vael-ui/style.css'
import './style.css'
import './demo-content.css'
import './prose.css'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'

createApp(App).use(vaporInteropPlugin).use(router).use(i18n).mount('#app')
