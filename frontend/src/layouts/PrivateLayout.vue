<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppPrivateNavbar from '@/components/layout/AppPrivateNavbar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// Si la página se recarga, el usuario sale del navegador (localStorage) al store
onMounted(() => {
  if (authStore.token && !authStore.user) authStore.fetchUser()
})
</script>

<template>
  <div class="private-layout">
    <AppPrivateNavbar />
    <main class="private-content">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.private-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--ws-fondo);
  background-image: radial-gradient(900px 500px at 80% -5%, rgba(65, 39, 213, 0.14), transparent 70%);
  color: var(--ws-texto); /* slate-800 */
}

.private-content {
  flex: 1;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}
</style>