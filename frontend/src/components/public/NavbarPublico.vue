<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// En pantallas pequeñas la barra lateral se abre sobre el contenido
const route = useRoute()
const abierto = ref(false)
watch(() => route.fullPath, () => (abierto.value = false))

// Con sesión iniciada, el botón lleva a la sección que corresponde al rol
const destino = computed(() => {
  if (authStore.rol === 'COORDINACION') return { ruta: '/admin', texto: 'Validaciones' }
  if (authStore.rol === 'ESTUDIANTE') return { ruta: '/mis-proyectos', texto: 'Mi panel' }
  return { ruta: '/login', texto: 'Iniciar sesión' }
})

const enlaces = [
  { ruta: '/', texto: 'Inicio', icono: 'pi pi-home', exacta: true },
  { ruta: '/proyectos', texto: 'Explorar proyectos', icono: 'pi pi-compass', exacta: false },
  { ruta: '/portafolios', texto: 'Estudiantes', icono: 'pi pi-users', exacta: false },
]
</script>

<template>
  <button type="button" class="abrir" aria-label="Abrir el menú" @click="abierto = true">
    <i class="pi pi-bars" aria-hidden="true"></i>
  </button>
  <div v-if="abierto" class="velo" aria-hidden="true" @click="abierto = false"></div>

  <aside class="barra" :class="{ abierta: abierto }">
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
        <i :class="e.icono" aria-hidden="true"></i>
        {{ e.texto }}
      </RouterLink>
    </nav>

    <RouterLink :to="destino.ruta" class="boton">
      <i class="pi pi-sign-in" aria-hidden="true"></i>
      <span>{{ destino.texto }}</span>
    </RouterLink>
  </aside>
</template>

<style scoped>
.barra {
  position: sticky;
  top: 0;
  align-self: start;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  padding: 1.5rem 1rem;
  background:
    radial-gradient(260px 220px at 0% 100%, rgba(25, 81, 252, 0.22), transparent 75%),
    var(--ws-fondo-lateral);
  border-right: 1px solid var(--ws-borde);
}

.marca {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.5rem 1.25rem;
  border-bottom: 1px solid var(--ws-borde);
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
  font-size: 1.05rem;
}

.marca-nombre strong {
  font-weight: 800;
  color: var(--ws-azul-claro);
}

.enlaces {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.enlace {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  color: var(--ws-texto);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.15s;
}

.enlace i {
  font-size: 1.1rem;
  color: var(--ws-azul-claro);
}

.enlace:hover {
  background: rgba(55, 129, 252, 0.1);
}

.enlace.activo {
  background: linear-gradient(135deg, #0b2cb1 0%, #1951fc 100%);
  box-shadow: 0 8px 22px -12px rgba(25, 81, 252, 0.9);
  font-weight: 600;
}

.enlace.activo i {
  color: #fff;
}

.boton {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.05rem;
  border-radius: 10px;
  background: var(--ws-primario);
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  box-shadow: 0 6px 16px -8px rgba(25, 81, 252, 0.7);
  transition: transform 0.15s, background-color 0.15s;
}

.boton:hover {
  background: var(--ws-azul-profundo);
  transform: translateY(-1px);
}

.abrir {
  display: none;
}

.velo {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(3, 8, 24, 0.65);
}

/* Móvil y tableta: la barra lateral se abre desde un botón */
@media (max-width: 900px) {
  .barra {
    position: fixed;
    z-index: 70;
    left: 0;
    top: 0;
    width: 17rem;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .barra.abierta {
    transform: translateX(0);
  }

  .abrir {
    position: fixed;
    z-index: 50;
    top: 0.75rem;
    left: 0.75rem;
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 10px;
    border: 1px solid var(--ws-borde);
    background: var(--ws-superficie);
    color: var(--ws-texto);
    cursor: pointer;
  }
}
</style>
