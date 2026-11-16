<script setup lang="ts">
import LogoWorkspace from '@/components/layout/LogoWorkspace.vue'
import heroEscritorio from '@/assets/escritorio-hero.jpg'
</script>

<template>
  <aside class="panel">
    <img :src="heroEscritorio" alt="" aria-hidden="true" class="imagen" />
    <div class="velo"></div>
    <div class="contenido">
      <LogoWorkspace size="4.5rem" />
      <h2 class="titulo">Muestra tus proyectos con el respaldo de la ULS.</h2>
      <p class="lead">
        Crea tu portafolio, envía tus proyectos a la coordinación para que los valide y compártelos con
        empresas y visitantes.
      </p>
    </div>
  </aside>
</template>

<style scoped>
.panel {
  position: relative;
  display: none;
  overflow: hidden;
  background: var(--ws-fondo);
  border-right: 1px solid var(--ws-borde);
  color: var(--ws-texto);
}

.imagen {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Capa plana y oscura para que el texto se lea sobre la foto */
.velo {
  position: absolute;
  inset: 0;
  background: rgba(10, 15, 30, 0.78);
}

.contenido {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.5rem;
  max-width: 32rem;
  margin: 0 auto;
  padding: 3rem;
}

.titulo {
  margin: 0;
  font-size: clamp(1.8rem, 2.6vw, 2.3rem);
  font-weight: 600;
  line-height: 1.2;
}

.lead {
  margin: 0;
  line-height: 1.65;
  color: var(--ws-texto-suave);
}

@media (min-width: 1024px) {
  .panel {
    display: block;
  }
}
</style>
