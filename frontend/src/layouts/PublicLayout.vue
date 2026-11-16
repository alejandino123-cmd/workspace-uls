<script setup lang="ts">
import { RouterView } from 'vue-router'
import NavbarPublico from '@/components/public/NavbarPublico.vue'
import PiePublico from '@/components/public/PiePublico.vue'
</script>

<template>
  <div class="layout">
    <NavbarPublico />

    <div class="columna">
      <main class="public-content">
        <RouterView />
      </main>

      <PiePublico />
    </div>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr);
  background: var(--ws-fondo);
  color: var(--ws-texto);
}

.columna {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.public-content {
  flex: 1;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }

  /* Deja sitio al botón del menú */
  .public-content {
    padding-top: 3.5rem;
  }
}
</style>
