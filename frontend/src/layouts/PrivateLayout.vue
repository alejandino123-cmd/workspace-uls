<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppPrivateNavbar from '@/components/layout/AppPrivateNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

// Menú lateral desplegable en pantallas pequeñas
const menuAbierto = ref(false)
watch(() => route.fullPath, () => (menuAbierto.value = false))

// Si la página se recarga, el usuario sale del navegador (localStorage) al store
onMounted(() => {
  if (authStore.token && !authStore.user) authStore.fetchUser()
})
</script>

<template>
  <div class="private-layout">
    <AppSidebar :abierto="menuAbierto" @cerrar="menuAbierto = false" />

    <div class="private-columna">
      <AppPrivateNavbar @menu="menuAbierto = true" />
      <main class="private-content">
        <RouterView />
      </main>
      <AppFooter />
    </div>
  </div>
</template>

<style scoped>
.private-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr);
  background-color: var(--ws-fondo);
  background-image: radial-gradient(900px 500px at 80% -5%, rgba(25, 81, 252, 0.16), transparent 70%);
  color: var(--ws-texto);
}

.private-columna {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.private-content {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

@media (max-width: 960px) {
  .private-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
