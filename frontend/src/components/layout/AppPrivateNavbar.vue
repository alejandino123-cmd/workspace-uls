<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/stores/auth'
import AvatarEstudiante from '@/components/perfil/AvatarEstudiante.vue'
import { obtenerPerfil } from '@/service'

// Barra superior de la zona privada: botón para abrir el menú lateral (móvil) y menú del usuario.
const emit = defineEmits<{ (e: 'menu'): void }>()

const router = useRouter()
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

// Menú desplegable del usuario
const menu = ref()

function salir() {
  authStore.logout()
  // Después de cerrar sesión, vuelve a la vista pública
  router.push('/')
}

const userItems = computed<MenuItem[]>(() => [
  // TODO: agregar "Cambiar contraseña" cuando exista esa pantalla (PUT /auth/password)
  ...(authStore.rol === 'ESTUDIANTE'
    ? [{ label: 'Editar perfil', icon: 'pi pi-user-edit', command: () => router.push('/perfil/editar') }]
    : []),
  { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: salir },
])

function toggleMenu(event: Event) {
  menu.value.toggle(event)
}
</script>

<template>
  <header class="barra">
    <Button
      type="button"
      text
      severity="secondary"
      icon="pi pi-bars"
      class="boton-menu"
      aria-label="Abrir el menú"
      @click="emit('menu')"
    />

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
  </header>
</template>

<style scoped>
.barra {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 0.85rem 2rem;
  background: color-mix(in srgb, var(--ws-fondo) 85%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--ws-borde);
}

.boton-menu {
  display: none;
  margin-right: auto;
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
  color: var(--ws-texto);
}

.user-chevron {
  font-size: 0.75rem;
  color: var(--ws-texto-suave);
}

@media (max-width: 960px) {
  .barra {
    padding: 0.7rem 1rem;
  }

  .boton-menu {
    display: inline-flex;
  }
}

@media (max-width: 640px) {
  .user-name,
  .user-chevron {
    display: none;
  }
}
</style>
