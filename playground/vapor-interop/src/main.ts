import { createVaporApp, vaporInteropPlugin } from 'vue'
import 'vael-ui/style.css'
import './style.css'
import App from './App.vue'

const app = createVaporApp(App)
app.use(vaporInteropPlugin)
app.mount('#app')
