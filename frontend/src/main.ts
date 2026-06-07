import { createApp } from 'vue'
import './style.css'
import 'primeicons/primeicons.css'

import App from './App.vue'

import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import Button from 'primevue/button'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ColumnGroup from 'primevue/columngroup'
import Row from 'primevue/row'
import Dock from 'primevue/dock'
import Menubar from 'primevue/menubar'
import Toast from 'primevue/toast'
import InputText from 'primevue/inputtext'

const app = createApp(App)

app.use(PrimeVue, {
    theme: {
        preset: Aura
    }
})
app.use(ToastService)

app.component('Button', Button)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('ColumnGroup', ColumnGroup)
app.component('Row', Row)
app.component('Dock', Dock)
app.component('Menubar', Menubar)
app.component('Toast', Toast)
app.component('InputText', InputText)

app.mount('#app')