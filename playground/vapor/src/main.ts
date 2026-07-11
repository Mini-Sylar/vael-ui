import { createVaporApp } from 'vue'
import 'vael-ui/style.css'
import './style.css'
import App from './App.vue'
import DirectivesRoot from './DirectivesRoot.vue'
import DataTableRoot from './DataTableRoot.vue'

createVaporApp(App).mount('#app')

const directivesHost = document.createElement('div')
directivesHost.id = 'directives-test'
document.body.appendChild(directivesHost)
createVaporApp(DirectivesRoot).mount(directivesHost)

const dataTableHost = document.createElement('div')
dataTableHost.id = 'datatable-test'
document.body.appendChild(dataTableHost)
createVaporApp(DataTableRoot).mount(dataTableHost)
