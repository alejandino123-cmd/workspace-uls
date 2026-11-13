<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavbarPublico from '@/components/public/NavbarPublico.vue'
import PiePublico from '@/components/public/PiePublico.vue'
</script>

<template>
  <div class="layout">
    <NavbarPublico />

    <main class="public-content">
      <RouterView />
    </main>

    <PiePublico />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* Fondo oscuro con un resplandor azul sutil arriba; sin cuadrícula en todo el sitio */
  background:
    radial-gradient(900px 500px at 80% -5%, rgba(65, 39, 213, 0.16), transparent 70%),
    var(--ws-fondo);
  color: var(--ws-texto);
}

.public-content {
  flex: 1;
}
</style>
