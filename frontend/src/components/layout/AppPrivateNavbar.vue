<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import Menubar from 'primevue/menubar'
import Menu from 'primevue/menu'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/stores/auth'
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { obtenerPerfil } from '@/service/perfil'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const nombre = computed(() => authStore.user?.nombre ?? '')

// Al abrirse la barra, si es estudiante, pide su perfil para saber cuál es su foto.
// La guarda en el store, así Mi perfil puede actualizarla y la barra cambia sola.
onMounted(async () => {
  if (authStore.rol !== 'ESTUDIANTE') return
  try {
    authStore.fotoUrl = (await obtenerPerfil()).fotoUrl
  } catch {
    // Si falla, simplemente se muestra la inicial del nombre
  }
})

// Navegación principal según el rol. La clase `is-active` marca la sección actual.
const items = computed<MenuItem[]>(() => {
  const activa = (ruta: string) => (route.path.startsWith(ruta) ? 'is-active' : '')

  if (authStore.rol === 'COORDINACION') {
    return [
      {
        label: 'Validaciones',
        icon: 'pi pi-check-square',
        command: () => router.push('/admin'),
        class: activa('/admin'),
      },
    ]
  }

  if (authStore.rol === 'ESTUDIANTE') {
    return [
      {
        label: 'Mis proyectos',
        icon: 'pi pi-folder',
        command: () => router.push('/mis-proyectos'),
        class: activa('/mis-proyectos'),
      },
      {
        label: 'Mi perfil',
        icon: 'pi pi-user',
        command: () => router.push('/perfil'),
        class: activa('/perfil'),
      },
    ]
  }

  return [] // EMPRESA: todavía sin secciones propias
})

// Menú desplegable del usuario
const menu = ref()

function salir() {
  authStore.logout()
  router.push('/login')
}

const userItems: MenuItem[] = [
  // TODO: agregar "Cambiar contraseña" cuando exista esa pantalla (PUT /auth/password)
  { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: salir },
]

function toggleMenu(event: Event) {
  menu.value.toggle(event)
}
</script>

<template>
  <Menubar :model="items" class="navbar">
    <template #start>
      <RouterLink to="/" class="brand" aria-label="Workspace ULS, ir al inicio">
        <LogoWorkspace size="2.6rem" />
        <span class="brand-title">Workspace ULS</span>
      </RouterLink>
    </template>

    <template #end>
      <Button
        type="button"
        text
        severity="secondary"
        class="user-button"
        aria-haspopup="true"
        aria-controls="menu_usuario"
        @click="toggleMenu"
      >
        <AvatarEstudiante :nombre="nombre" :foto-url="authStore.fotoUrl" tamano="34px" />
        <span class="user-name">{{ nombre }}</span>
        <i class="pi pi-chevron-down user-chevron"></i>
      </Button>
      <Menu id="menu_usuario" ref="menu" :model="userItems" :popup="true" />
    </template>
  </Menubar>
</template>

<style scoped>
.navbar {
  border-radius: 0;
  border: none;
  border-bottom: 1px solid var(--p-content-border-color);
  padding: 1rem 2rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  margin-right: 2rem;
  text-decoration: none;
}

.brand-title {
  color: var(--p-text-color);
  font-weight: 700;
  font-size: 1.3rem;
}

.navbar :deep(.p-menubar-item-label) {
  font-size: 1.05rem;
}

.navbar :deep(.p-menubar-item-icon) {
  font-size: 1.1rem;
}

/* Sección actual */
.navbar :deep(.is-active .p-menubar-item-label),
.navbar :deep(.is-active .p-menubar-item-icon) {
  color: var(--p-primary-color);
  font-weight: 600;
}

/* Botón de usuario */
.user-button {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.6rem;
}

.user-name {
  font-weight: 600;
  color: var(--p-text-color);
}

.user-chevron {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

@media (max-width: 960px) {
  .navbar {
    padding: 0.75rem 1rem;
  }

  .brand {
    margin-right: 1rem;
  }

  .brand-title {
    font-size: 1.15rem;
  }
}

@media (max-width: 640px) {
  .user-name,
  .user-chevron {
    display: none;
  }
}
</style>