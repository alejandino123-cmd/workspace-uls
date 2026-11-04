import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import './assets/main.css'

import App from './App.vue'
import router from './router'

// Workspace ULS usa un único tema claro ("Materio Light").
// Ya NO se agrega la clase `my-app-dark` al <html>: sin esa clase, PrimeVue
// nunca activa su paleta oscura. Si algún día se quiere un modo oscuro,
// bastará con volver a agregar la clase desde un botón de tema.

// Preset institucional: Aura con el violeta #9155FD como color primario.
// Los botones, enlaces y focos de PrimeVue lo toman de aquí, así que las vistas
// ya no necesitan clases como `!bg-[#9155FD]`.
const WorkspacePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f5f0ff',
      100: '#ece2ff',
      200: '#dccbff',
      300: '#c4a6ff',
      400: '#a97bff',
      500: '#9155fd',
      600: '#804bdf',
      700: '#7340c9',
      800: '#5e34a3',
      900: '#4c2a85',
      950: '#2e1a52'
    }
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: WorkspacePreset,
    options: {
      darkModeSelector: '.my-app-dark',
      // Con Tailwind v4, poner los estilos de PrimeVue en una capa propia hace que
      // las clases de Tailwind ganen sin necesidad de `!`. Si algo se ve raro,
      // vuelve a `cssLayer: false`.
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue'
      }
    }
  }
})

app.mount('#app')