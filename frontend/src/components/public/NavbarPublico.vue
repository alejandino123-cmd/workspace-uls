<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Con sesión iniciada, el botón lleva a la sección que corresponde al rol
const destino = computed(() => {
  if (authStore.rol === 'COORDINACION') return { ruta: '/admin', texto: 'Validaciones' }
  if (authStore.rol === 'ESTUDIANTE') return { ruta: '/mis-proyectos', texto: 'Mi panel' }
  return { ruta: '/login', texto: 'Iniciar sesión' }
})

const enlaces = [
  { ruta: '/', texto: 'Inicio', exacta: true },
  { ruta: '/proyectos', texto: 'Explorar proyectos', exacta: false },
  { ruta: '/portafolios', texto: 'Estudiantes', exacta: false },
]
</script>

<template>
  <header class="barra">
    <div class="interior">
      <RouterLink to="/" class="marca" aria-label="Workspace ULS, ir al inicio">
        <span class="marca-icono"><LogoWorkspace size="1.6rem" /></span>
        <span class="marca-nombre">Workspace <strong>ULS</strong></span>
      </RouterLink>

      <nav class="enlaces" aria-label="Principal">
        <RouterLink
          v-for="e in enlaces"
          :key="e.ruta"
          :to="e.ruta"
          class="enlace"
          :active-class="e.exacta ? '' : 'activo'"
          :exact-active-class="e.exacta ? 'activo' : undefined"
        >
          {{ e.texto }}
        </RouterLink>
      </nav>

      <div class="acciones">
        <RouterLink :to="destino.ruta" class="boton">
          <i class="pi pi-sign-in" aria-hidden="true"></i>
          <span>{{ destino.texto }}</span>
        </RouterLink>
      </div>
    </div>
  </header>
</template>

<style scoped>
.barra {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--ws-superficie) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--ws-borde);
}

.interior {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.marca {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--ws-texto);
  text-decoration: none;
  white-space: nowrap;
}

.marca-icono {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  background: var(--ws-superficie-2);
  border: 1px solid var(--ws-borde);
}

.marca-nombre {
  font-weight: 600;
  font-size: 1rem;
  letter-spacing: 0.01em;
}

.marca-nombre strong {
  font-weight: 800;
  color: var(--ws-primario);
}

.enlaces {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.enlace {
  position: relative;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  color: var(--ws-texto-suave);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.15s, background-color 0.15s;
}

.enlace:hover {
  color: var(--ws-texto);
  background: var(--ws-superficie-2);
}

.enlace.activo {
  color: var(--ws-indigo-suave);
  font-weight: 600;
  background: rgba(110, 94, 224, 0.12);
}

.acciones {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.boton {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1.05rem;
  border-radius: 10px;
  background: var(--ws-primario);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  box-shadow: 0 6px 16px -8px rgba(65, 39, 213, 0.7);
  transition: transform 0.15s, box-shadow 0.15s, background-color 0.15s;
}

.boton:hover {
  background: var(--ws-indigo-rico);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -10px rgba(65, 39, 213, 0.8);
}

/* Tabletas y móviles: los enlaces bajan a una segunda fila desplazable */
@media (max-width: 900px) {
  .interior {
    flex-wrap: wrap;
    gap: 0.75rem 1rem;
    padding: 0.7rem 1rem;
  }

  .enlaces {
    order: 3;
    width: 100%;
    margin-left: 0;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .acciones {
    margin-left: auto;
  }

  .boton span {
    display: none;
  }

  .boton {
    padding: 0.55rem 0.75rem;
  }
}
</style>
