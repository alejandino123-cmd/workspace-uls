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

// Preset WorkspaceULS: Aura como base, con la paleta azul de la marca (un solo tema, oscuro).
// Escala azul: 400 = Electric Blue (botones), 300 = Bright Blue (hover), 500 = Royal Blue (activo), 100 = Ice Blue.
// Escala de superficies: 950 = fondo azul noche, 900 = paneles y menús, 800 = superficies elevadas,
// 400 = Pale Slate (texto secundario), 0 = blanco (títulos).
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
      50: '#eef4ff',
      100: '#cbe9fd',
      200: '#9fd0fb',
      300: '#3781fc',
      400: '#1951fc',
      500: '#0b2cb1',
      600: '#0a2390',
      700: '#03195b',
      800: '#0a1d75',
      900: '#03195b',
      950: '#020f33'
    },
    colorScheme: {
      dark: {
        primary: {
          color: '{primary.400}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.300}',
          activeColor: '{primary.500}'
        },
        highlight: {
          background: 'rgba(25, 81, 252, 0.25)',
          focusBackground: 'rgba(25, 81, 252, 0.4)',
          color: '#cbe9fd',
          focusColor: '#ffffff'
        },
        surface: {
          0: '#ffffff',
          50: '#f4f6fb',
          100: '#e5e9f3',
          200: '#cdd3e3',
          300: '#b4bccf',
          400: '#adb5bd',
          500: '#6c757d',
          600: '#3a4768',
          700: '#263153',
          800: '#1a2543',
          900: '#121a31',
          950: '#0a0f1e'
        }
      }
    }
  }
})

// La plataforma tiene un solo tema (oscuro): se borra la preferencia de tema guardada en versiones anteriores
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
      // Tema único y oscuro: la clase `app-dark` va fija en <html> (index.html). Sin selector de modo.
      darkModeSelector: '.app-dark',
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
