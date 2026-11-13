<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'

// Barra lateral de la zona privada. Las secciones son las mismas de siempre, según el rol.
defineProps<{ abierto: boolean }>()
const emit = defineEmits<{ (e: 'cerrar'): void }>()

const route = useRoute()
const authStore = useAuthStore()

interface Seccion {
  texto: string
  icono: string
  ruta: string
  activa: boolean
}

const secciones = computed<Seccion[]>(() => {
  const empieza = (ruta: string) => route.path.startsWith(ruta)

  if (authStore.rol === 'COORDINACION') {
    return [
      { texto: 'Validaciones', icono: 'pi pi-check-square', ruta: '/admin', activa: route.path === '/admin' },
      { texto: 'Estudiantes', icono: 'pi pi-users', ruta: '/admin/estudiantes', activa: empieza('/admin/estudiantes') },
    ]
  }

  if (authStore.rol === 'ESTUDIANTE') {
    return [
      { texto: 'Mis proyectos', icono: 'pi pi-folder', ruta: '/mis-proyectos', activa: empieza('/mis-proyectos') },
      { texto: 'Mi perfil', icono: 'pi pi-user', ruta: '/perfil', activa: empieza('/perfil') },
    ]
  }

  return [] // EMPRESA: todavía sin secciones propias
})

const etiquetaRol = computed(() => {
  if (authStore.rol === 'COORDINACION') return 'Coordinación Académica'
  if (authStore.rol === 'ESTUDIANTE') return 'Estudiante'
  return 'Empresa'
})
</script>

<template>
  <div v-if="abierto" class="velo" aria-hidden="true" @click="emit('cerrar')"></div>

  <aside class="lateral" :class="{ abierto }" aria-label="Menú de la plataforma">
    <RouterLink to="/" class="marca" aria-label="Workspace ULS, ir al inicio">
      <LogoWorkspace size="2.6rem" />
      <span class="marca-nombre">Workspace <strong>ULS</strong></span>
    </RouterLink>

    <nav class="secciones">
      <RouterLink
        v-for="s in secciones"
        :key="s.ruta"
        :to="s.ruta"
        class="seccion"
        :class="{ activa: s.activa }"
        @click="emit('cerrar')"
      >
        <i :class="s.icono" aria-hidden="true"></i>
        <span>{{ s.texto }}</span>
      </RouterLink>
    </nav>

    <div class="rol">
      <i class="pi pi-graduation-cap rol-icono" aria-hidden="true"></i>
      <strong>{{ etiquetaRol }}</strong>
      <span>ULS · Workspace</span>
    </div>
  </aside>
</template>

<style scoped>
.lateral {
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
  gap: 0.7rem;
  padding: 0 0.5rem 1.25rem;
  border-bottom: 1px solid var(--ws-borde);
  color: var(--ws-texto);
  text-decoration: none;
}

.marca-nombre {
  font-size: 1.15rem;
  font-weight: 600;
}

.marca-nombre strong {
  font-weight: 800;
  color: var(--ws-azul-claro);
}

.secciones {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.seccion {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  color: var(--ws-texto);
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.15s, color 0.15s;
}

.seccion i {
  font-size: 1.15rem;
  color: var(--ws-azul-claro);
}

.seccion:hover {
  background: rgba(55, 129, 252, 0.1);
}

.seccion.activa {
  background: linear-gradient(135deg, #0b2cb1 0%, #1951fc 100%);
  box-shadow: 0 8px 22px -12px rgba(25, 81, 252, 0.9);
  font-weight: 600;
}

.seccion.activa i {
  color: #fff;
}

.rol {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 1.25rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--ws-borde);
  background: linear-gradient(180deg, rgba(25, 81, 252, 0.14), rgba(11, 44, 177, 0.06));
  text-align: center;
}

.rol-icono {
  font-size: 2.2rem;
  color: var(--ws-azul-claro);
  margin-bottom: 0.5rem;
}

.rol strong {
  font-size: 0.95rem;
}

.rol span {
  font-size: 0.78rem;
  color: var(--ws-texto-suave);
}

.velo {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(3, 8, 24, 0.65);
}

/* Móvil y tableta: la barra lateral se abre sobre el contenido */
@media (max-width: 960px) {
  .lateral {
    position: fixed;
    z-index: 70;
    left: 0;
    top: 0;
    width: 17rem;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .lateral.abierto {
    transform: translateX(0);
  }
}
</style>
