import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import 'primeicons/primeicons.css'
import './assets/main.css'

import App from './App.vue'
import router from './router'
import { queryClient } from './lib/queryClient'

// Preset WorkspaceULS: Aura como base, con la paleta índigo de la marca (solo modo claro).
// Escala primaria: 500 = Soft Indigo #4127D5 (botones), 600 = Rich Indigo (hover), 700 (activo), 300 = Pale Indigo.
// Escala de superficies: 0 = blanco, 50-200 = fondos tintados, 950 = Deep Indigo (títulos).
const WorkspacePreset = definePreset(Aura, {
  // Esquinas ligeramente redondeadas (sin tarjetas excesivamente redondas)
  primitive: {
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '6px',
      md: '8px',
      lg: '10px',
      xl: '12px'
    }
  },
  semantic: {
    primary: {
      50: '#f5f3fd',
      100: '#ece9fb',
      200: '#d9d4f5',
      300: '#bab0ef',
      400: '#6e5ee0',
      500: '#4127d5',
      600: '#362882',
      700: '#2c2270',
      800: '#251e5e',
      900: '#1f1c4b',
      950: '#13112e'
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}'
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '{primary.700}',
          focusColor: '{primary.800}'
        },
        surface: {
          0: '#ffffff',
          50: '#f8f7fd',
          100: '#f0eefa',
          200: '#e4e1f5',
          300: '#d3ceee',
          400: '#b5aedd',
          500: '#8f88be',
          600: '#6b6497',
          700: '#4e4879',
          800: '#3a3566',
          900: '#2a2650',
          950: '#1f1c4b'
        }
      }
    }
  }
})

// Solo modo claro: se borra la preferencia de tema guardada en versiones anteriores
try {
  localStorage.removeItem('tema')
} catch {
  // Sin acceso a localStorage no hay nada que limpiar
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, { queryClient })
app.use(PrimeVue, {
  theme: {
    preset: WorkspacePreset,
    options: {
      // Sin modo oscuro: la plataforma usa únicamente el tema claro.
      darkModeSelector: 'none',
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
